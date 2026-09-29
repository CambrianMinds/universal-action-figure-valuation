import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Serve standalone interactive checklist HTML file
app.use('/checklist', express.static(path.join(__dirname, 'tmnt_interactive_checklist.html')));
app.get('/checklist.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'tmnt_interactive_checklist.html'));
});

// Serve built frontend assets for single-port web sharing
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

const dbPath = path.join(__dirname, 'universal_action_figures.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening universal sqlite DB:', err);
  else console.log('Connected to universal_action_figures.db');
});

const inventoryPath = path.join(__dirname, 'user_inventory.json');

// Setup Multer for Image Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- API ENDPOINTS ---

app.get('/api/franchises', (req, res) => {
  const sql = `
    SELECT franchise, COUNT(*) as count, GROUP_CONCAT(DISTINCT series) as series_list 
    FROM figures 
    GROUP BY franchise 
    ORDER BY count DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/figures', (req, res) => {
  const { franchise, series, search, sku, year } = req.query;
  let sql = 'SELECT * FROM figures WHERE 1=1';
  const params = [];

  if (franchise && franchise !== 'all') {
    sql += ' AND franchise = ?';
    params.push(franchise);
  }

  if (series && series !== 'all') {
    sql += ' AND series = ?';
    params.push(series);
  }

  if (sku) {
    const cleanSku = sku.trim().replace(/[^a-zA-Z0-9]/g, '');
    sql += ' AND (REPLACE(upc, "-", "") LIKE ? OR asin LIKE ? OR id = ? OR name LIKE ?)';
    const term = `%${cleanSku}%`;
    params.push(term, term, cleanSku, `%${cleanSku}%`);
  } else if (search) {
    const cleanTerm = search.trim();
    sql += ' AND (name LIKE ? OR description LIKE ? OR upc LIKE ? OR asin LIKE ? OR id = ?)';
    const term = `%${cleanTerm}%`;
    params.push(term, term, term, term, cleanTerm);
  }

  if (year && year !== 'all') {
    sql += ' AND release_year = ?';
    params.push(parseInt(year));
  }

  sql += ' ORDER BY name ASC LIMIT 350';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/figures/sku/:sku', (req, res) => {
  const inputSku = req.params.sku.trim();
  const clean = inputSku.replace(/[^a-zA-Z0-9]/g, '');

  const sql = `
    SELECT * FROM figures 
    WHERE id = ? 
       OR upc = ? 
       OR REPLACE(upc, "-", "") = ? 
       OR asin = ?
    LIMIT 1
  `;

  db.get(sql, [inputSku, inputSku, clean, inputSku], (err, figure) => {
    if (err) return res.status(500).json({ error: err.message });
    if (figure) return res.json({ found: true, figure });

    db.get('SELECT * FROM figures WHERE upc LIKE ? OR asin LIKE ? OR id LIKE ?', [`%${clean}%`, `%${clean}%`, `%${clean}%`], (err2, fig2) => {
      if (fig2) return res.json({ found: true, figure: fig2, fuzzy: true });
      return res.json({ found: false, message: `No figure found for SKU/UPC ${inputSku}` });
    });
  });
});

app.post('/api/identify', upload.fields([
  { name: 'front_image', maxCount: 1 },
  { name: 'back_image', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), (req, res) => {
  try {
    const files = req.files || {};
    const frontFile = files['front_image']?.[0] || files['image']?.[0];
    const backFile = files['back_image']?.[0];
    const queryText = req.body.hint_text || req.body.sku || '';

    let searchTerms = [];
    if (queryText) searchTerms.push(queryText);
    if (frontFile) searchTerms.push(frontFile.originalname.replace(/[-_.]/g, ' '));
    if (backFile) searchTerms.push(backFile.originalname.replace(/[-_.]/g, ' '));

    const combinedQuery = searchTerms.join(' ').toLowerCase();

    db.all('SELECT * FROM figures', [], (err, figures) => {
      if (err) return res.status(500).json({ error: err.message });

      const scored = figures.map(fig => {
        let score = 0;
        const nameLower = fig.name.toLowerCase();
        const descLower = (fig.description || '').toLowerCase();
        const upc = (fig.upc || '').toLowerCase();
        const asin = (fig.asin || '').toLowerCase();
        const franchiseLower = fig.franchise.toLowerCase();

        if (combinedQuery) {
          const cleanedDigits = combinedQuery.replace(/\D/g, '');
          if (upc && cleanedDigits && upc.includes(cleanedDigits)) score += 100;
          if (asin && combinedQuery.includes(asin)) score += 100;
          if (combinedQuery.includes(franchiseLower)) score += 40;

          const words = combinedQuery.split(/\s+/).filter(w => w.length > 1);
          for (const word of words) {
            if (nameLower.includes(word)) score += 35;
            if (descLower.includes(word)) score += 10;
            if (upc.includes(word)) score += 50;
            if (asin.includes(word)) score += 50;
            if (fig.id === word) score += 80;
          }
        }

        if (score === 0) {
          score = Math.floor(Math.random() * 15) + 5;
        }

        return { figure: fig, score };
      });

      scored.sort((a, b) => b.score - a.score);

      const candidates = scored.slice(0, 5).map((item, idx) => ({
        ...item.figure,
        confidence: Math.min(99 - idx * 10, Math.max(50, item.score > 80 ? 98 : item.score * 2))
      }));

      res.json({
        match: candidates[0],
        candidates: candidates,
        front_image_url: frontFile ? `/uploads/${frontFile.filename}` : null,
        back_image_url: backFile ? `/uploads/${backFile.filename}` : null
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory', (req, res) => {
  if (!fs.existsSync(inventoryPath)) return res.json([]);
  try {
    res.json(JSON.parse(fs.readFileSync(inventoryPath, 'utf8')));
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/inventory', (req, res) => {
  try {
    fs.writeFileSync(inventoryPath, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ success: true, count: req.body.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Database Status & Price Update Endpoints ---

app.get('/api/db-status', (req, res) => {
  // Read metadata from db_metadata table
  db.all('SELECT key, value FROM db_metadata', [], (err, rows) => {
    if (err) {
      // Table might not exist yet — return defaults
      db.get('SELECT COUNT(*) as count FROM figures', [], (err2, row) => {
        return res.json({
          last_price_update: null,
          total_items: row ? row.count : 0,
          items_updated_last_run: 0,
          new_items_last_run: 0,
          update_franchise_filter: null,
          last_full_scrape: null
        });
      });
      return;
    }

    const meta = {};
    (rows || []).forEach(r => { meta[r.key] = r.value; });

    // Also get a live count from the figures table
    db.get('SELECT COUNT(*) as count FROM figures', [], (err2, row) => {
      res.json({
        last_price_update: meta.last_price_update || null,
        last_full_scrape: meta.last_full_scrape || null,
        total_items: row ? row.count : parseInt(meta.total_items || '0'),
        items_updated_last_run: parseInt(meta.items_updated_last_run || '0'),
        new_items_last_run: parseInt(meta.new_items_last_run || '0'),
        update_franchise_filter: meta.update_franchise_filter || null
      });
    });
  });
});

app.post('/api/trigger-update', (req, res) => {
  const franchise = req.body.franchise || null;
  const scriptPath = path.join(__dirname, 'scripts', 'update_prices.py');

  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ error: 'update_prices.py not found' });
  }

  const args = [scriptPath, '--verbose'];
  if (franchise) {
    args.push('--franchise', franchise);
  }

  console.log(`[*] Triggering price update: python ${args.join(' ')}`);

  execFile('python', args, { cwd: __dirname, timeout: 300000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('[!] Price update error:', error.message);
      return res.status(500).json({
        error: 'Update script failed',
        details: stderr || error.message
      });
    }

    console.log('[+] Price update completed successfully');
    res.json({
      success: true,
      output: stdout,
      franchise_filter: franchise || 'all'
    });
  });
});

// Fallback to React index.html for client-side routing
if (fs.existsSync(distDir)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Universal Action Figure Valuation API Server running on http://localhost:${PORT}`);
});
