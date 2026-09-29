import json
import sqlite3
import os

db_path = "universal_action_figures.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("""
    SELECT id, name, series, group_name, release_year, upc, asin, retail_price, avg_price, high_price, low_price, image_thumb_url, main_image_url, detail_url, valuation_source
    FROM figures
    WHERE franchise = 'TMNT'
    ORDER BY release_year ASC, name ASC
""")

rows = cursor.fetchall()
figures_data = []
for r in rows:
    figures_data.append({
        "id": r["id"],
        "name": r["name"],
        "series": r["series"] or "Playmates",
        "group": r["group_name"] or "Action Figures",
        "year": r["release_year"] or 1988,
        "upc": r["upc"] or "",
        "asin": r["asin"] or "",
        "retail": r["retail_price"] or 3.99,
        "avg_price": r["avg_price"] or 50.0,
        "high_price": r["high_price"] or 0.0,
        "low_price": r["low_price"] or 0.0,
        "thumb": r["image_thumb_url"] or r["main_image_url"] or "https://www.actionfigure411.com/common/images/af-price-guide-hero.png",
        "detail_url": r["detail_url"] or "",
        "source": r["valuation_source"] or "ActionFigure411 Market Index"
    })

conn.close()

print(f"Loaded {len(figures_data)} TMNT figures for interactive checklist HTML.")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TMNT Ultimate Collector Interactive Checklist</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg-dark: #050e09;
      --bg-card: rgba(10, 30, 20, 0.75);
      --bg-card-hover: rgba(16, 45, 30, 0.9);
      --border-color: rgba(16, 185, 129, 0.3);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --tmnt-green: #10b981;
      --tmnt-neon: #9acc05;
      --tmnt-glow: rgba(16, 185, 129, 0.35);
      --accent-orange: #f97316;
      --accent-blue: #3b82f6;
      --font-heading: 'Outfit', sans-serif;
      --font-mono: 'Space Grotesk', monospace;
      --radius: 12px;
    }}

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}

    body {{
      background-color: var(--bg-dark);
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.15) 0%, transparent 45%),
        radial-gradient(circle at 85% 85%, rgba(154, 204, 5, 0.12) 0%, transparent 45%);
      color: var(--text-main);
      font-family: var(--font-heading);
      min-height: 100vh;
      padding: 1.5rem;
    }}

    .container {{
      max-width: 1400px;
      margin: 0 auto;
    }}

    header {{
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 1.5rem 2rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }}

    .brand {{
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }}

    .brand-title {{
      font-size: 1.6rem;
      font-weight: 900;
      color: #fff;
      letter-spacing: -0.02em;
    }}

    .brand-sub {{
      font-size: 0.85rem;
      color: var(--tmnt-green);
      font-weight: 600;
    }}

    .progress-wrap {{
      background: rgba(0,0,0,0.5);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 0.75rem 1.25rem;
      min-width: 280px;
    }}

    .progress-labels {{
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 0.35rem;
    }}

    .progress-bar-bg {{
      height: 10px;
      background: rgba(255,255,255,0.1);
      border-radius: 5px;
      overflow: hidden;
    }}

    .progress-bar-fill {{
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #10b981, #9acc05);
      transition: width 0.4s ease;
    }}

    .controls {{
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
    }}

    .search-input {{
      flex: 1;
      min-width: 250px;
      background: rgba(0,0,0,0.5);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.65rem 1rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.9rem;
    }}

    .search-input:focus {{
      outline: none;
      border-color: var(--tmnt-neon);
      box-shadow: 0 0 12px var(--tmnt-glow);
    }}

    .btn {{
      padding: 0.6rem 1.2rem;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 700;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background: rgba(255,255,255,0.05);
      color: #fff;
      cursor: pointer;
      transition: all 0.2s ease;
    }}

    .btn:hover, .btn.active {{
      background: rgba(16, 185, 129, 0.2);
      border-color: var(--tmnt-green);
      color: var(--tmnt-neon);
    }}

    .btn-primary {{
      background: linear-gradient(135deg, #10b981, #9acc05);
      color: #000;
      border: none;
    }}

    .checklist-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.25rem;
    }}

    .item-card {{
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.2s ease;
      position: relative;
    }}

    .item-card.owned {{
      border-color: var(--tmnt-green);
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.25);
    }}

    .item-card.wanted {{
      border-color: var(--accent-orange);
    }}

    .card-img-wrap {{
      height: 180px;
      background: #000;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }}

    .card-img {{
      max-height: 85%;
      max-width: 85%;
      object-fit: contain;
    }}

    .status-ribbon {{
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
    }}

    .ribbon-owned {{ background: #10b981; color: #000; }}
    .ribbon-wanted {{ background: #f97316; color: #000; }}
    .ribbon-missing {{ background: rgba(255,255,255,0.1); color: #94a3b8; }}

    .card-content {{
      padding: 1rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }}

    .item-name {{
      font-size: 1rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 0.25rem;
    }}

    .item-meta {{
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }}

    .sku-badge {{
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--tmnt-neon);
      background: rgba(0,0,0,0.5);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid rgba(154, 204, 5, 0.3);
      margin-bottom: 0.35rem;
      display: inline-block;
    }}

    .source-tag {{
      font-size: 0.65rem;
      color: #94a3b8;
      background: rgba(255,255,255,0.05);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      margin-bottom: 0.75rem;
      font-style: italic;
    }}

    .price-tag {{
      font-family: var(--font-mono);
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--tmnt-green);
      margin-top: auto;
      margin-bottom: 0.75rem;
    }}

    .actions-row {{
      display: flex;
      gap: 0.5rem;
      border-top: 1px solid var(--border-color);
      padding-top: 0.75rem;
    }}

    .check-btn {{
      flex: 1;
      padding: 0.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
    }}

    .check-btn.active-owned {{
      background: #10b981;
      color: #000;
      border-color: #10b981;
    }}

    .check-btn.active-wanted {{
      background: #f97316;
      color: #000;
      border-color: #f97316;
    }}

    @media print {{
      .controls, header button {{ display: none !important; }}
      body {{ background: #fff; color: #000; }}
      .item-card {{ break-inside: avoid; border: 1px solid #ccc; background: #fff; }}
      .item-name, .price-tag {{ color: #000 !important; }}
    }}
  </style>
</head>
<body>

  <div class="container">
    <header>
      <div class="brand">
        <div style="font-size: 2.2rem;">🐢</div>
        <div>
          <div class="brand-title">TMNT ULTIMATE COLLECTOR CHECKLIST</div>
          <div class="brand-sub">Interactive Inventory & Valuation Catalog • {len(figures_data)} Action Figures</div>
        </div>
      </div>

      <div class="progress-wrap">
        <div class="progress-labels">
          <span>COLLECTION COMPLETION</span>
          <span id="completionPercent">0% (0 / {len(figures_data)})</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="progressFill"></div>
        </div>
        <div style="font-size: 0.75rem; color: var(--tmnt-neon); margin-top: 0.4rem; text-align: right; font-weight: 700;">
          Owned Portfolio Value: <span id="portfolioValue" style="font-family: var(--font-mono);">$0.00</span>
        </div>
      </div>
    </header>

    <div class="controls">
      <input type="text" id="searchInput" class="search-input" placeholder="Search by name, SKU barcode, UPC, series, release year, or source...">

      <div style="display: flex; gap: 0.5rem;">
        <button class="btn active" id="btnFilterAll" onclick="setFilter('all')">All ({len(figures_data)})</button>
        <button class="btn" id="btnFilterOwned" onclick="setFilter('owned')">Owned (<span id="countOwned">0</span>)</button>
        <button class="btn" id="btnFilterWanted" onclick="setFilter('wanted')">Wishlist (<span id="countWanted">0</span>)</button>
        <button class="btn" id="btnFilterMissing" onclick="setFilter('missing')">Missing</button>
      </div>

      <select id="seriesSelect" class="search-input" style="flex: 0; min-width: 160px;" onchange="renderGrid()">
        <option value="all">All Lines & Series</option>
        <option value="Playmates">Playmates Vintage</option>
        <option value="NECA">NECA</option>
        <option value="Super7">Super7 Ultimates</option>
        <option value="Mutant Mayhem">Mutant Mayhem</option>
      </select>

      <button class="btn btn-primary" onclick="window.print()">🖨️ Print Checklist</button>
      <button class="btn" onclick="resetChecklist()">Reset</button>
    </div>

    <div class="checklist-grid" id="grid"></div>
  </div>

  <script>
    const FIGURES = {json.dumps(figures_data, ensure_ascii=False)};

    let state = JSON.parse(localStorage.getItem('tmnt_checklist_state') || '{{}}');
    let currentFilter = 'all';

    function saveState() {{
      localStorage.setItem('tmnt_checklist_state', JSON.stringify(state));
      updateStats();
    }}

    function toggleStatus(id, status) {{
      if (state[id] === status) {{
        delete state[id];
      }} else {{
        state[id] = status;
      }}
      saveState();
      renderGrid();
    }}

    function setFilter(filter) {{
      currentFilter = filter;
      document.querySelectorAll('.controls .btn').forEach(b => b.classList.remove('active'));
      if (filter === 'all') document.getElementById('btnFilterAll').classList.add('active');
      if (filter === 'owned') document.getElementById('btnFilterOwned').classList.add('active');
      if (filter === 'wanted') document.getElementById('btnFilterWanted').classList.add('active');
      if (filter === 'missing') document.getElementById('btnFilterMissing').classList.add('active');
      renderGrid();
    }}

    function updateStats() {{
      let ownedCount = 0;
      let wantedCount = 0;
      let ownedValuation = 0;

      FIGURES.forEach(fig => {{
        const s = state[fig.id];
        if (s === 'owned') {{
          ownedCount++;
          ownedValuation += (fig.avg_price || 0);
        }} else if (s === 'wanted') {{
          wantedCount++;
        }}
      }});

      const total = FIGURES.length;
      const pct = Math.round((ownedCount / total) * 100);

      document.getElementById('completionPercent').innerText = `${{pct}}% (${{ownedCount}} / ${{total}})`;
      document.getElementById('progressFill').style.width = pct + '%';
      document.getElementById('portfolioValue').innerText = '$' + ownedValuation.toLocaleString('en-US', {{ minimumFractionDigits: 2, maximumFractionDigits: 2 }});
      document.getElementById('countOwned').innerText = ownedCount;
      document.getElementById('countWanted').innerText = wantedCount;
    }}

    function renderGrid() {{
      const search = document.getElementById('searchInput').value.toLowerCase().trim();
      const series = document.getElementById('seriesSelect').value;
      const grid = document.getElementById('grid');

      const filtered = FIGURES.filter(fig => {{
        const matchesSearch = !search || 
                              fig.name.toLowerCase().includes(search) || 
                              fig.upc.includes(search) || 
                              fig.source.toLowerCase().includes(search) ||
                              String(fig.year).includes(search);
        
        const matchesSeries = series === 'all' || fig.series.includes(series);
        const itemState = state[fig.id] || 'missing';
        
        let matchesStatus = true;
        if (currentFilter === 'owned') matchesStatus = (itemState === 'owned');
        if (currentFilter === 'wanted') matchesStatus = (itemState === 'wanted');
        if (currentFilter === 'missing') matchesStatus = (itemState !== 'owned');

        return matchesSearch && matchesSeries && matchesStatus;
      }});

      grid.innerHTML = filtered.map(fig => {{
        const itemState = state[fig.id] || 'missing';
        const displaySku = fig.upc || fig.asin || `ID:#${{fig.id}}`;

        return `
          <div class="item-card ${{itemState === 'owned' ? 'owned' : (itemState === 'wanted' ? 'wanted' : '')}}">
            <div class="card-img-wrap">
              <img src="${{fig.thumb}}" alt="${{fig.name}}" class="card-img" loading="lazy">
              <span class="status-ribbon ${{itemState === 'owned' ? 'ribbon-owned' : (itemState === 'wanted' ? 'ribbon-wanted' : 'ribbon-missing')}}">
                ${{itemState === 'owned' ? 'OWNED' : (itemState === 'wanted' ? 'WISHLIST' : 'MISSING')}}
              </span>
            </div>
            <div class="card-content">
              <div class="item-name">${{fig.name}}</div>
              <div class="item-meta">${{fig.year}} • ${{fig.series}} • ${{fig.group}}</div>
              <div class="sku-badge">SKU: ${{displaySku}}</div>
              <div class="source-tag">Source: ${{fig.source}}</div>
              <div class="price-tag">$${{(fig.avg_price || 0).toFixed(2)}} USD</div>

              <div class="actions-row">
                <button class="check-btn ${{itemState === 'owned' ? 'active-owned' : ''}}" onclick="toggleStatus('${{fig.id}}', 'owned')">
                  ${{itemState === 'owned' ? '✓ OWNED' : '+ OWNED'}}
                </button>
                <button class="check-btn ${{itemState === 'wanted' ? 'active-wanted' : ''}}" onclick="toggleStatus('${{fig.id}}', 'wanted')">
                  ${{itemState === 'wanted' ? '★ WISHLIST' : '★ WISHLIST'}}
                </button>
              </div>
            </div>
          </div>
        `;
      }}).join('');

      updateStats();
    }}

    function resetChecklist() {{
      if (confirm('Reset all checklist statuses?')) {{
        state = {{}};
        saveState();
        renderGrid();
      }}
    }}

    document.getElementById('searchInput').addEventListener('input', renderGrid);
    renderGrid();
  </script>
</body>
</html>
"""

output_path = "tmnt_interactive_checklist.html"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"[+] Re-generated interactive checklist HTML file: '{output_path}' ({os.path.getsize(output_path)/1024:.1f} KB)")
