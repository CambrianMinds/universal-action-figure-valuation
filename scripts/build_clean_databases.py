import json
import sqlite3
import csv
import os
import re

def build_databases():
    cache_file = "scraped_cache.json"
    if not os.path.exists(cache_file):
        print("Cache file not found!")
        return

    with open(cache_file, "r", encoding="utf-8") as f:
        cache = json.load(f)

    print(f"[*] Processing {len(cache)} cached items into SQLite, Compact JSON, and CSV databases...")

    # Sort items by numeric ID where possible
    def sort_key(k):
        try:
            return int(k)
        except ValueError:
            return 999999

    item_ids = sorted(cache.keys(), key=sort_key)
    records = [cache[k] for k in item_ids]

    # --- 1. BUILD SQLITE DATABASE ---
    db_file = "tmnt_playmates.db"
    if os.path.exists(db_file):
        os.remove(db_file)

    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS figures (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        group_name TEXT,
        wave TEXT,
        release_year INTEGER,
        description TEXT,
        upc TEXT,
        asin TEXT,
        series TEXT,
        detail_url TEXT,
        image_thumb_url TEXT,
        main_image_url TEXT,
        num_sold INTEGER,
        retail_price REAL,
        avg_price REAL,
        price_diff REAL,
        high_price REAL,
        low_price REAL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        figure_id TEXT,
        year INTEGER,
        month INTEGER,
        avg_price REAL,
        num_auctions INTEGER,
        FOREIGN KEY (figure_id) REFERENCES figures(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS variations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        figure_id TEXT,
        title TEXT,
        description TEXT,
        image_url TEXT,
        FOREIGN KEY (figure_id) REFERENCES figures(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS market_summary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        figure_id TEXT,
        retailer TEXT,
        price_info TEXT,
        FOREIGN KEY (figure_id) REFERENCES figures(id)
    );
    """)

    # Populate tables
    for item in records:
        fig_id = item['id']
        stats = item.get('stats', {})
        details = item.get('details', {})

        cursor.execute("""
            INSERT OR REPLACE INTO figures (
                id, name, group_name, wave, release_year, description, upc, asin,
                series, detail_url, image_thumb_url, main_image_url, num_sold,
                retail_price, avg_price, price_diff, high_price, low_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            fig_id,
            item.get('name'),
            item.get('group'),
            item.get('wave'),
            item.get('year'),
            details.get('description'),
            details.get('upc'),
            details.get('asin'),
            details.get('series'),
            item.get('detail_url'),
            item.get('image_thumb_url'),
            item.get('main_image_url'),
            stats.get('num_sold'),
            stats.get('retail_price'),
            stats.get('avg_price'),
            stats.get('price_diff'),
            stats.get('high_price'),
            stats.get('low_price')
        ))

        # Price History
        for ph in details.get('price_history', []):
            cursor.execute("""
                INSERT INTO price_history (figure_id, year, month, avg_price, num_auctions)
                VALUES (?, ?, ?, ?, ?)
            """, (fig_id, ph.get('year'), ph.get('month'), ph.get('avg_price'), ph.get('num_auctions')))

        # Variations
        for var in details.get('variations', []):
            cursor.execute("""
                INSERT INTO variations (figure_id, title, description, image_url)
                VALUES (?, ?, ?, ?)
            """, (fig_id, var.get('title'), var.get('description'), var.get('image_url')))

        # Market summary
        for ret, info in details.get('pricing_summary', {}).items():
            info_str = " | ".join(info) if isinstance(info, list) else str(info)
            cursor.execute("""
                INSERT INTO market_summary (figure_id, retailer, price_info)
                VALUES (?, ?, ?)
            """, (fig_id, ret, info_str))

    conn.commit()

    # Create indexes for speed
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ph_fig ON price_history(figure_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_var_fig ON variations(figure_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_fig_name ON figures(name);")
    conn.commit()
    conn.close()

    print(f"[+] SQLite database created: '{db_file}' ({os.path.getsize(db_file) / 1024:.1f} KB)")

    # --- 2. BUILD COMPACT JSON DATABASE ---
    compact_records = []
    for item in records:
        details = item.get('details', {})
        stats = item.get('stats', {})

        # Build clean compact item dict without empty/null keys
        c_item = {
            "id": item.get('id'),
            "name": item.get('name'),
            "group": item.get('group'),
            "year": item.get('year'),
        }
        if item.get('wave'): c_item["wave"] = item['wave']
        if item.get('image_thumb_url'): c_item["thumb"] = item['image_thumb_url']
        if item.get('main_image_url'): c_item["image"] = item['main_image_url']
        if item.get('detail_url'): c_item["url"] = item['detail_url']

        c_item["stats"] = {k: v for k, v in stats.items() if v is not None}
        
        if details.get('description'): c_item["description"] = details['description']
        if details.get('upc'): c_item["upc"] = details['upc']
        if details.get('asin'): c_item["asin"] = details['asin']
        if details.get('series'): c_item["series"] = details['series']
        if details.get('variations'): c_item["variations"] = details['variations']
        if details.get('pricing_summary'): c_item["market"] = details['pricing_summary']
        if details.get('price_history'): c_item["history"] = details['price_history']

        compact_records.append(c_item)

    compact_db = {
        "schema_version": "1.0",
        "description": "Compact TMNT Playmates Action Figures Database",
        "total_records": len(compact_records),
        "figures": compact_records
    }

    json_compact_file = "tmnt_playmates_compact.json"
    with open(json_compact_file, "w", encoding="utf-8") as f:
        json.dump(compact_db, f, indent=2, ensure_ascii=False)

    print(f"[+] Compact JSON database created: '{json_compact_file}' ({os.path.getsize(json_compact_file) / 1024:.1f} KB)")

    # --- 3. BUILD CSV DATABASE ---
    csv_file = "tmnt_playmates.csv"
    fieldnames = [
        "id", "name", "group", "wave", "year", "retail_price", "avg_price",
        "price_diff", "high_price", "low_price", "num_sold", "upc", "asin",
        "series", "description", "variations_count", "detail_url", "image_url"
    ]

    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for item in records:
            stats = item.get('stats', {})
            details = item.get('details', {})
            writer.writerow({
                "id": item.get('id'),
                "name": item.get('name'),
                "group": item.get('group'),
                "wave": item.get('wave'),
                "year": item.get('year'),
                "retail_price": stats.get('retail_price'),
                "avg_price": stats.get('avg_price'),
                "price_diff": stats.get('price_diff'),
                "high_price": stats.get('high_price'),
                "low_price": stats.get('low_price'),
                "num_sold": stats.get('num_sold'),
                "upc": details.get('upc'),
                "asin": details.get('asin'),
                "series": details.get('series'),
                "description": details.get('description'),
                "variations_count": len(details.get('variations', [])),
                "detail_url": item.get('detail_url'),
                "image_url": item.get('main_image_url')
            })

    print(f"[+] CSV database created: '{csv_file}' ({os.path.getsize(csv_file) / 1024:.1f} KB)")

if __name__ == "__main__":
    build_databases()
