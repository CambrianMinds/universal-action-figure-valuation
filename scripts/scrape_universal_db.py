import json
import os
import re
import sys
import time
import random
import sqlite3
import requests
from bs4 import BeautifulSoup

BASE_DOMAIN = "https://www.actionfigure411.com"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

TARGET_GUIDES = [
    # TMNT
    {"franchise": "TMNT", "series": "Playmates", "url": "/teenage-mutant-ninja-turtles/playmates-price-guide.php"},
    {"franchise": "TMNT", "series": "NECA", "url": "/teenage-mutant-ninja-turtles/neca-price-guide.php"},
    {"franchise": "TMNT", "series": "Super7", "url": "/teenage-mutant-ninja-turtles/super7-price-guide.php"},
    {"franchise": "TMNT", "series": "Mutant Mayhem", "url": "/teenage-mutant-ninja-turtles/mutant-mayhem-price-guide.php"},

    # Star Wars
    {"franchise": "Star Wars", "series": "Kenner Vintage (1977-1985)", "url": "/star-wars/kenner-vintage-collection-price-guide.php"},
    {"franchise": "Star Wars", "series": "Black Series (6\")", "url": "/star-wars/black-series-price-guide.php"},
    {"franchise": "Star Wars", "series": "Vintage Collection (3.75\")", "url": "/star-wars/vintage-collection-price-guide.php"},
    {"franchise": "Star Wars", "series": "Power of the Force", "url": "/star-wars/power-of-the-force-price-guide.php"},

    # Marvel
    {"franchise": "Marvel", "series": "Marvel Legends Exclusives", "url": "/marvel/marvel-legends-exclusives-price-guide.php"},
    {"franchise": "Marvel", "series": "Marvel Legends 80th", "url": "/marvel/marvel-legends-marvel-comics-80th-anniversary-1-price-guide.php"},
    {"franchise": "Marvel", "series": "Hot Toys", "url": "/marvel/hot-toys-price-guide.php"},

    # Transformers
    {"franchise": "Transformers", "series": "G1 Vintage", "url": "/transformers/g1-price-guide.php"},
    {"franchise": "Transformers", "series": "Studio Series", "url": "/transformers/studio-series-price-guide.php"},
    {"franchise": "Transformers", "series": "Masterpiece", "url": "/transformers/masterpiece-price-guide.php"},

    # DC Multiverse
    {"franchise": "DC Multiverse", "series": "McFarlane Multiverse", "url": "/dc/multiverse-price-guide.php"},
    {"franchise": "DC Multiverse", "series": "Super Powers", "url": "/dc/mcfarlane-super-powers-price-guide.php"}
]

def clean_float(val_str):
    if not val_str: return None
    cleaned = re.sub(r'[^\d\.\-]', '', str(val_str))
    try: return float(cleaned)
    except ValueError: return None

def clean_int(val_str):
    if not val_str: return None
    cleaned = re.sub(r'[^\d\-]', '', str(val_str))
    try: return int(cleaned)
    except ValueError: return None

def parse_guide_index(session, guide):
    url = BASE_DOMAIN + guide['url']
    print(f"[*] Parsing index guide: [{guide['franchise']}] {guide['series']} ({url})")
    try:
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            print(f"    [!] Error HTTP {resp.status_code}")
            return []
        
        soup = BeautifulSoup(resp.content, 'lxml')
        items = []
        tables = soup.find_all('table', id=lambda x: x and 'groupTable' in str(x))

        for table in tables:
            current_group = guide['series']
            for row in table.find_all('tr'):
                if row.get('id') and row.find('h2'):
                    h2_text = row.find('h2').text.strip()
                    if h2_text: current_group = h2_text

                # Find figure link
                link = row.find('a', href=re.compile(r'\.php$'))
                if not link or '/common/' in link['href']: continue

                href = link['href']
                detail_url = BASE_DOMAIN + href if href.startswith('/') else href

                fig_id = None
                for inp in row.find_all('input'):
                    if inp.get('figureid'): fig_id = inp.get('figureid'); break
                    elif inp.get('figureId'): fig_id = inp.get('figureId'); break

                if not fig_id:
                    m_id = re.search(r'-(\d+)\.php$', href)
                    if m_id: fig_id = m_id.group(1)

                if not fig_id: continue

                thumb_url = None
                if link.get('onmouseover'):
                    m_img = re.search(r"showThumbnail\('[^']+',\s*'([^']+)'\)", link['onmouseover'])
                    if m_img:
                        tpath = m_img.group(1)
                        thumb_url = BASE_DOMAIN + tpath if tpath.startswith('/') else tpath

                tds = row.find_all('td')
                cell_texts = [td.text.strip() for td in tds]
                wave, year, num_sold, retail_price, avg_price, price_diff, high_price, low_price = None, None, None, None, None, None, None, None

                if len(cell_texts) >= 11:
                    wave = cell_texts[3] if cell_texts[3] else None
                    year = clean_int(cell_texts[4])
                    num_sold = clean_int(cell_texts[5])
                    retail_price = clean_float(cell_texts[6])
                    avg_price = clean_float(cell_texts[7])
                    price_diff = clean_float(cell_texts[8])
                    high_price = clean_float(cell_texts[9])
                    low_price = clean_float(cell_texts[10])

                items.append({
                    'id': f"{guide['franchise'].lower()}-{fig_id}",
                    'raw_id': fig_id,
                    'name': link.text.strip(),
                    'franchise': guide['franchise'],
                    'series': guide['series'],
                    'group': current_group,
                    'wave': wave,
                    'year': year,
                    'detail_url': detail_url,
                    'image_thumb_url': thumb_url,
                    'stats': {
                        'num_sold': num_sold,
                        'retail_price': retail_price,
                        'avg_price': avg_price,
                        'price_diff': price_diff,
                        'high_price': high_price,
                        'low_price': low_price
                    }
                })
        print(f"    [+] Discovered {len(items)} items.")
        return items
    except Exception as e:
        print(f"    [!] Error parsing guide {url}: {e}")
        return []

def main():
    session = requests.Session()
    session.headers.update(HEADERS)

    print("=== STARTING UNIVERSAL ACTION FIGURE DATABASE SCRAPER ===")
    all_items = []
    for g in TARGET_GUIDES:
        guide_items = parse_guide_index(session, g)
        all_items.extend(guide_items)
        time.sleep(0.5)

    print(f"\n[*] Total Discovered Figures Across All Franchises: {len(all_items)}")

    # Load existing cache to avoid re-scraping completed detail pages
    cache_file = "universal_cache.json"
    cache = {}
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f: cache = json.load(f)
            print(f"[*] Loaded {len(cache)} cached items.")
        except Exception: cache = {}

    # Merge cached TMNT items if available
    if os.path.exists("scraped_cache.json"):
        try:
            with open("scraped_cache.json", "r", encoding="utf-8") as f:
                tmnt_cache = json.load(f)
                for tid, tval in tmnt_cache.items():
                    uid = f"tmnt-{tid}"
                    tval['id'] = uid
                    tval['franchise'] = "TMNT"
                    cache[uid] = tval
            print(f"[*] Integrated {len(tmnt_cache)} TMNT Playmates records from previous cache.")
        except Exception as e: print("TMNT cache merge note:", e)

    # Build SQLite DB `universal_action_figures.db`
    db_file = "universal_action_figures.db"
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS figures (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        franchise TEXT NOT NULL,
        series TEXT,
        group_name TEXT,
        wave TEXT,
        release_year INTEGER,
        description TEXT,
        upc TEXT,
        asin TEXT,
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

    for item in all_items:
        stats = item.get('stats', {})
        cached_entry = cache.get(item['id'])
        details = cached_entry.get('details', {}) if cached_entry else {}
        main_img = cached_entry.get('main_image_url') if cached_entry else item['image_thumb_url']

        cursor.execute("""
            INSERT OR REPLACE INTO figures (
                id, name, franchise, series, group_name, wave, release_year, description, upc, asin,
                detail_url, image_thumb_url, main_image_url, num_sold,
                retail_price, avg_price, price_diff, high_price, low_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item['id'],
            item['name'],
            item['franchise'],
            item['series'],
            item['group'],
            item['wave'],
            item['year'],
            details.get('description'),
            details.get('upc'),
            details.get('asin'),
            item['detail_url'],
            item['image_thumb_url'],
            main_img,
            stats.get('num_sold'),
            stats.get('retail_price'),
            stats.get('avg_price'),
            stats.get('price_diff'),
            stats.get('high_price'),
            stats.get('low_price')
        ))

    conn.commit()

    # Create metadata table for tracking update timestamps
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS db_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    """)
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_full_scrape', ?)", (now_iso,))
    cursor.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_price_update', ?)", (now_iso,))
    cursor.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('total_items', ?)", (str(len(all_items)),))
    conn.commit()
    conn.close()

    print(f"\n[+] SUCCESS! Universal SQLite Database created: '{db_file}' ({os.path.getsize(db_file)/1024:.1f} KB)")

if __name__ == "__main__":
    main()
