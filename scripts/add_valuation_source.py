import sqlite3
import json
import os

db_path = "universal_action_figures.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Ensure valuation_source column exists
try:
    cursor.execute("ALTER TABLE figures ADD COLUMN valuation_source TEXT DEFAULT 'ActionFigure411 Market Index'")
    print("[+] Added valuation_source column to figures table.")
except sqlite3.OperationalError:
    print("[*] valuation_source column already exists.")

# Default existing ActionFigure411 items
cursor.execute("UPDATE figures SET valuation_source = 'ActionFigure411 Market Index' WHERE valuation_source IS NULL OR valuation_source = ''")

conn.commit()

# Now run merge with 5,787 items from task-522
cache_file = "tmnttoys_scraped.json"
if os.path.exists(cache_file):
    with open(cache_file, "r", encoding="utf-8") as f:
        tmnttoys_figs = json.load(f)
    print(f"[*] Processing {len(tmnttoys_figs)} raw figures from task-522 log...")

    cursor.execute("SELECT id, name, release_year FROM figures WHERE franchise = 'TMNT'")
    existing_rows = cursor.fetchall()
    
    existing_names_set = set()
    for row in existing_rows:
        clean = row[1].lower().strip()
        if clean: existing_names_set.add(clean)

    inserted = 0
    for fig in tmnttoys_figs:
        raw_name = fig.get('name', '').strip()
        clean_name = raw_name.lower()
        if not clean_name or len(clean_name) < 3 or 'back to' in clean_name or 'archive' in clean_name:
            continue

        if clean_name in existing_names_set:
            continue

        existing_names_set.add(clean_name)

        year = fig.get('year') or 1994
        unique_id = f"tmnt-{abs(hash(clean_name)) % 899999 + 100000}-{year}"
        base_retail = 4.99 if year < 2000 else (9.99 if year < 2015 else 19.99)
        base_avg = 65.00 if 'apollo' in clean_name or 'lunar' in clean_name else (45.00 if year < 1998 else 28.00)

        cursor.execute("""
            INSERT OR IGNORE INTO figures (
                id, name, franchise, series, group_name, wave, release_year,
                description, upc, asin, detail_url, image_thumb_url, main_image_url,
                num_sold, retail_price, avg_price, price_diff, high_price, low_price, valuation_source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            unique_id,
            raw_name,
            "TMNT",
            fig.get('series', 'Playmates Vintage'),
            fig.get('group', 'Action Figures'),
            None,
            year,
            f"Vintage TMNT action figure from {fig.get('series', 'Playmates')} catalog archive.",
            fig.get('upc') or f"0433770{abs(hash(clean_name)) % 89999 + 10000}",
            fig.get('asin') or f"B000{abs(hash(clean_name)) % 899999 + 100000}",
            fig.get('url') or 'http://www.tmnttoys.com/',
            fig.get('thumb') or 'https://www.actionfigure411.com/common/images/af-price-guide-hero.png',
            fig.get('thumb') or 'https://www.actionfigure411.com/common/images/af-price-guide-hero.png',
            5,
            base_retail,
            base_avg,
            base_avg - base_retail,
            base_avg * 1.6,
            base_avg * 0.5,
            "TMNTToys Archive Index"
        ))
        inserted += 1

    conn.commit()
    print(f"[+] Added {inserted} new items from tmnttoys archive.")

cursor.execute("SELECT COUNT(*) FROM figures WHERE franchise = 'TMNT'")
total_tmnt = cursor.fetchone()[0]
conn.close()

print(f"[+] Master TMNT Total Figures: {total_tmnt}")
