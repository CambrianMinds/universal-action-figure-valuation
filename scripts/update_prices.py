"""
Universal Action Figure Appraiser — Incremental Price Updater
=============================================================
Re-scrapes current market prices from ActionFigure411 and updates
the existing universal_action_figures.db without dropping/recreating tables.

Usage:
    python update_prices.py                  # Update all franchises
    python update_prices.py --franchise TMNT  # Update only TMNT
    python update_prices.py --dry-run         # Preview changes without writing
    python update_prices.py --verbose         # Show per-item price changes

This script is designed to be run on a schedule (daily/weekly) via
UPDATE_PRICES.bat or Windows Task Scheduler.
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
from datetime import datetime, timezone

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("[!] Missing dependencies. Install with: pip install requests beautifulsoup4 lxml")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_DOMAIN = "https://www.actionfigure411.com"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

# Same guide list used by the full scraper — kept in sync
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

# ---------------------------------------------------------------------------
# Helpers (same logic as scrape_universal_db.py)
# ---------------------------------------------------------------------------

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
    """Parse a price guide page and return a list of items with current prices."""
    url = BASE_DOMAIN + guide['url']
    try:
        resp = session.get(url, timeout=20)
        if resp.status_code != 200:
            print(f"    [!] HTTP {resp.status_code} for {url}")
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
                wave, year = None, None
                num_sold, retail_price, avg_price, price_diff, high_price, low_price = None, None, None, None, None, None

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
                    'name': link.text.strip(),
                    'franchise': guide['franchise'],
                    'series': guide['series'],
                    'group': current_group,
                    'wave': wave,
                    'year': year,
                    'detail_url': detail_url,
                    'image_thumb_url': thumb_url,
                    'num_sold': num_sold,
                    'retail_price': retail_price,
                    'avg_price': avg_price,
                    'price_diff': price_diff,
                    'high_price': high_price,
                    'low_price': low_price
                })

        return items
    except Exception as e:
        print(f"    [!] Error parsing {url}: {e}")
        return []


# ---------------------------------------------------------------------------
# Main Update Logic
# ---------------------------------------------------------------------------

def ensure_metadata_table(cursor):
    """Create the db_metadata table if it doesn't exist yet."""
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS db_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    """)


def run_update(args):
    # Resolve DB path relative to project root (parent of scripts/)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    db_path = os.path.join(project_root, "universal_action_figures.db")

    if not os.path.exists(db_path):
        print(f"[!] Database not found at: {db_path}")
        print("    Run scrape_universal_db.py first to create the initial database.")
        sys.exit(1)

    print("=" * 64)
    print("  UNIVERSAL ACTION FIGURE APPRAISER — PRICE UPDATE")
    print(f"  Database: {db_path}")
    print(f"  Mode: {'DRY RUN (no writes)' if args.dry_run else 'LIVE UPDATE'}")
    if args.franchise:
        print(f"  Filter: {args.franchise} only")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 64)

    # Filter guides if franchise specified
    guides = TARGET_GUIDES
    if args.franchise:
        guides = [g for g in TARGET_GUIDES if g['franchise'].lower() == args.franchise.lower()]
        if not guides:
            valid = sorted(set(g['franchise'] for g in TARGET_GUIDES))
            print(f"[!] Unknown franchise '{args.franchise}'. Valid: {', '.join(valid)}")
            sys.exit(1)

    # Scrape current prices
    session = requests.Session()
    session.headers.update(HEADERS)

    all_scraped = []
    for guide in guides:
        print(f"\n[*] Scraping: [{guide['franchise']}] {guide['series']}...")
        items = parse_guide_index(session, guide)
        print(f"    Found {len(items)} items")
        all_scraped.extend(items)
        time.sleep(1.0)  # Polite rate limiting

    print(f"\n[*] Total items scraped: {len(all_scraped)}")

    if not all_scraped:
        print("[!] No items scraped. Network issue or site structure changed.")
        sys.exit(1)

    # Connect to DB and perform updates
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    ensure_metadata_table(cursor)

    # Load existing items for comparison
    existing = {}
    cursor.execute("SELECT id, avg_price, high_price, low_price, num_sold, retail_price, price_diff FROM figures")
    for row in cursor.fetchall():
        existing[row['id']] = dict(row)

    stats = {
        'updated': 0,
        'new_items': 0,
        'unchanged': 0,
        'price_increases': 0,
        'price_decreases': 0,
        'errors': 0
    }

    change_log = []

    for item in all_scraped:
        item_id = item['id']

        if item_id in existing:
            # Existing item — check if prices changed
            old = existing[item_id]
            old_avg = old.get('avg_price') or 0
            new_avg = item.get('avg_price') or 0

            price_changed = (
                old.get('avg_price') != item.get('avg_price') or
                old.get('high_price') != item.get('high_price') or
                old.get('low_price') != item.get('low_price') or
                old.get('num_sold') != item.get('num_sold') or
                old.get('retail_price') != item.get('retail_price') or
                old.get('price_diff') != item.get('price_diff')
            )

            if price_changed:
                if not args.dry_run:
                    cursor.execute("""
                        UPDATE figures SET
                            num_sold = ?,
                            retail_price = ?,
                            avg_price = ?,
                            price_diff = ?,
                            high_price = ?,
                            low_price = ?
                        WHERE id = ?
                    """, (
                        item.get('num_sold'),
                        item.get('retail_price'),
                        item.get('avg_price'),
                        item.get('price_diff'),
                        item.get('high_price'),
                        item.get('low_price'),
                        item_id
                    ))

                stats['updated'] += 1

                if new_avg > old_avg:
                    stats['price_increases'] += 1
                elif new_avg < old_avg:
                    stats['price_decreases'] += 1

                diff = new_avg - old_avg
                diff_str = f"+${diff:.2f}" if diff >= 0 else f"-${abs(diff):.2f}"

                if args.verbose:
                    print(f"    ↻ {item['name'][:45]:45s}  ${old_avg:.2f} → ${new_avg:.2f} ({diff_str})")

                change_log.append({
                    'id': item_id,
                    'name': item['name'],
                    'old_avg': old_avg,
                    'new_avg': new_avg,
                    'diff': diff
                })
            else:
                stats['unchanged'] += 1
        else:
            # New item — insert it
            if not args.dry_run:
                cursor.execute("""
                    INSERT INTO figures (
                        id, name, franchise, series, group_name, wave, release_year,
                        detail_url, image_thumb_url, num_sold,
                        retail_price, avg_price, price_diff, high_price, low_price
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item_id,
                    item['name'],
                    item['franchise'],
                    item['series'],
                    item['group'],
                    item.get('wave'),
                    item.get('year'),
                    item.get('detail_url'),
                    item.get('image_thumb_url'),
                    item.get('num_sold'),
                    item.get('retail_price'),
                    item.get('avg_price'),
                    item.get('price_diff'),
                    item.get('high_price'),
                    item.get('low_price')
                ))

            stats['new_items'] += 1
            if args.verbose:
                print(f"    + NEW: {item['name'][:50]}  (${item.get('avg_price', 0):.2f})")

    # Update metadata
    if not args.dry_run:
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_price_update', ?)", (now_iso,))
        cursor.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('items_updated_last_run', ?)", (str(stats['updated']),))
        cursor.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('new_items_last_run', ?)", (str(stats['new_items']),))
        cursor.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('update_franchise_filter', ?)", (args.franchise or 'all',))

        # Update total count
        cursor.execute("SELECT COUNT(*) as cnt FROM figures")
        total = cursor.fetchone()['cnt']
        cursor.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('total_items', ?)", (str(total),))

        conn.commit()

    conn.close()

    # Write change log to file
    if change_log and not args.dry_run:
        log_file = os.path.join(project_root, "price_update_log.json")
        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'franchise_filter': args.franchise or 'all',
            'stats': stats,
            'changes': change_log[:100]  # Cap at 100 most recent changes
        }

        # Append to existing log or create new
        existing_log = []
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    existing_log = json.load(f)
            except Exception:
                existing_log = []

        existing_log.append(log_entry)
        # Keep last 30 update logs
        existing_log = existing_log[-30:]

        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(existing_log, f, indent=2)

    # Print summary
    print("\n" + "=" * 64)
    print("  UPDATE SUMMARY")
    print("=" * 64)
    print(f"  Items scraped:       {len(all_scraped)}")
    print(f"  Prices updated:      {stats['updated']}")
    print(f"  New items added:     {stats['new_items']}")
    print(f"  Unchanged:           {stats['unchanged']}")
    print(f"  Price increases:     {stats['price_increases']}")
    print(f"  Price decreases:     {stats['price_decreases']}")

    if stats['updated'] > 0 and change_log:
        # Top movers
        change_log.sort(key=lambda x: abs(x['diff']), reverse=True)
        print(f"\n  TOP PRICE MOVERS:")
        for entry in change_log[:5]:
            direction = "📈" if entry['diff'] > 0 else "📉"
            print(f"    {direction} {entry['name'][:40]:40s}  ${entry['old_avg']:.2f} → ${entry['new_avg']:.2f}")

    if args.dry_run:
        print(f"\n  [DRY RUN] No changes were written to the database.")
    else:
        print(f"\n  [✓] Database updated successfully.")

    print("=" * 64)
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Update action figure prices in the universal database"
    )
    parser.add_argument(
        '--franchise',
        type=str,
        default=None,
        help='Update only a specific franchise (e.g. TMNT, "Star Wars", Marvel, Transformers, "DC Multiverse")'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without writing to the database'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show individual item price changes'
    )

    args = parser.parse_args()
    run_update(args)
