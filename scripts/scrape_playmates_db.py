import json
import os
import re
import sys
import time
import random
import requests
from bs4 import BeautifulSoup

BASE_DOMAIN = "https://www.actionfigure411.com"
MAIN_URL = f"{BASE_DOMAIN}/teenage-mutant-ninja-turtles/playmates-price-guide.php"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

def clean_float(val_str):
    if not val_str:
        return None
    cleaned = re.sub(r'[^\d\.\-]', '', str(val_str))
    try:
        return float(cleaned)
    except ValueError:
        return None

def clean_int(val_str):
    if not val_str:
        return None
    cleaned = re.sub(r'[^\d\-]', '', str(val_str))
    try:
        return int(cleaned)
    except ValueError:
        return None

def parse_main_index():
    print(f"[*] Fetching main index page: {MAIN_URL}")
    session = requests.Session()
    session.headers.update(HEADERS)
    resp = session.get(MAIN_URL, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.content, 'lxml')

    items = []
    tables = soup.find_all('table', id=lambda x: x and x.startswith('groupTable'))
    print(f"[*] Found {len(tables)} data tables on main index page.")

    for table in tables:
        current_group = "Playmates Action Figures"
        rows = table.find_all('tr')
        
        for row in rows:
            if row.get('id') and row.find('h2'):
                h2_text = row.find('h2').text.strip()
                if h2_text:
                    current_group = h2_text

            link = row.find('a', href=re.compile(r'/playmates/'))
            if not link:
                continue

            href = link['href']
            detail_url = BASE_DOMAIN + href if href.startswith('/') else href
            
            fig_id = None
            for inp in row.find_all('input'):
                if inp.get('figureid'):
                    fig_id = inp.get('figureid')
                    break
                elif inp.get('figureId'):
                    fig_id = inp.get('figureId')
                    break
            
            if not fig_id:
                m_id = re.search(r'-(\d+)\.php$', href)
                if m_id:
                    fig_id = m_id.group(1)

            thumb_url = None
            if link.get('onmouseover'):
                m_img = re.search(r"showThumbnail\('[^']+',\s*'([^']+)'\)", link['onmouseover'])
                if m_img:
                    thumb_path = m_img.group(1)
                    thumb_url = BASE_DOMAIN + thumb_path if thumb_path.startswith('/') else thumb_path

            tds = row.find_all('td')
            cell_texts = [td.text.strip() for td in tds]
            wave = None
            year = None
            num_sold = None
            retail_price = None
            avg_price = None
            price_diff = None
            high_price = None
            low_price = None

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
                'id': fig_id,
                'name': link.text.strip(),
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

    print(f"[*] Successfully parsed {len(items)} items from main index page.")
    return items

def parse_detail_page(session, item):
    url = item['detail_url']
    max_retries = 5
    backoff = 2.0

    for attempt in range(max_retries):
        try:
            resp = session.get(url, timeout=15)
            if resp.status_code == 429:
                sleep_time = backoff + random.uniform(0.5, 1.5)
                # print(f"    [!] HTTP 429 Rate limited on {item['name']}. Backing off {sleep_time:.1f}s (Attempt {attempt+1}/{max_retries})...")
                time.sleep(sleep_time)
                backoff *= 1.5
                continue
            elif resp.status_code != 200:
                item['details'] = {'error': f"HTTP {resp.status_code}"}
                return item

            soup = BeautifulSoup(resp.content, 'lxml')

            # Main image
            main_img_url = None
            img_container = soup.find('div', class_='img-container-bigger-icon')
            if img_container:
                a_tag = img_container.find('a')
                if a_tag and a_tag.get('href'):
                    href = a_tag['href']
                    main_img_url = BASE_DOMAIN + href if href.startswith('/') else href
                elif img_container.find('img'):
                    src = img_container.find('img').get('src')
                    main_img_url = BASE_DOMAIN + src if src.startswith('/') else src

            list_items = soup.find_all('li', class_='list-group-item')
            description = None
            year = item['year']
            retail = item['stats']['retail_price']
            upc = None
            asin = None
            amazon_url = None
            series = None
            group = item['group']
            variations = []

            for li in list_items:
                if li.find('h1'):
                    li_copy = BeautifulSoup(str(li), 'lxml')
                    h1 = li_copy.find('h1')
                    if h1:
                        h1.decompose()
                    text_content = li_copy.text.strip()
                    description = re.sub(r'\s+', ' ', text_content)

                li_text = li.text.strip()
                if 'Year:' in li_text or 'UPC:' in li_text or 'ASIN:' in li_text:
                    m_year = re.search(r'Year:\s*(\d{4})', li_text)
                    if m_year: year = int(m_year.group(1))

                    m_retail = re.search(r'Retail:\s*\$([\d\.]+)', li_text)
                    if m_retail: retail = clean_float(m_retail.group(1))

                    m_upc = re.search(r'UPC:\s*(\d+)', li_text)
                    if m_upc: upc = m_upc.group(1)

                    m_asin = re.search(r'ASIN:\s*([A-Z0-9]{10})', li_text)
                    if m_asin: asin = m_asin.group(1)

                    amz_link = li.find('a', href=re.compile(r'amazon\.com'))
                    if amz_link: amazon_url = amz_link['href']

                    m_series = re.search(r'Series:\s*([^Group:]+)', li_text)
                    if m_series: series = m_series.group(1).strip()

                    m_group = re.search(r'Group:\s*(.*)', li_text)
                    if m_group: group = m_group.group(1).strip()

                if 'Variations:' in li_text:
                    var_links = li.find_all('a')
                    for v_a in var_links:
                        v_title = v_a.text.strip()
                        v_href = v_a.get('href')
                        v_img = BASE_DOMAIN + v_href if v_href and v_href.startswith('/') else v_href
                        
                        v_desc = ""
                        next_sibling = v_a.next_sibling
                        if next_sibling and isinstance(next_sibling, str):
                            v_desc = next_sibling.strip().lstrip(':').strip()

                        variations.append({
                            'title': v_title,
                            'description': v_desc if v_desc else None,
                            'image_url': v_img
                        })

            pricing_summary = {}
            for table in soup.find_all('table'):
                if 'Retailer' in table.text and 'Price' in table.text:
                    for tr in table.find_all('tr')[1:]:
                        cols = [c.text.strip() for c in tr.find_all('td')]
                        if len(cols) >= 2:
                            retailer_clean = re.sub(r'\s+', ' ', cols[0]).strip()
                            pricing_summary[retailer_clean] = cols[1:]

            price_history = []
            for script in soup.find_all('script'):
                if script.string and 'var jsonData =' in script.string:
                    m = re.search(r'var jsonData =\s*(\{.*?\});\s*\n', script.string, re.DOTALL)
                    if m:
                        json_str = m.group(1)
                        row_matches = re.findall(
                            r'\{"c":\[\{"v": "Date\((\d+),\s*(\d+)\)"\},\s*\{"v": ([\d\.]+)\},\s*\{"v": "([^"]*)"\},\s*\{"v": "([^"]*)"\}',
                            json_str
                        )
                        for r_match in row_matches:
                            y, m_idx, avg_p, label, tooltip = r_match
                            month_num = int(m_idx) + 1
                            num_auctions = None
                            m_auc = re.search(r'# Auctions:\s*(\d+)', tooltip)
                            if m_auc:
                                num_auctions = int(m_auc.group(1))

                            price_history.append({
                                'year': int(y),
                                'month': month_num,
                                'avg_price': float(avg_p),
                                'num_auctions': num_auctions
                            })

            item['main_image_url'] = main_img_url
            item['year'] = year
            item['group'] = group
            item['stats']['retail_price'] = retail

            item['details'] = {
                'description': description,
                'upc': upc,
                'asin': asin,
                'amazon_url': amazon_url,
                'series': series,
                'variations': variations,
                'pricing_summary': pricing_summary,
                'price_history': price_history
            }
            return item

        except Exception as e:
            if attempt == max_retries - 1:
                item['details'] = {'error': str(e)}
                return item
            time.sleep(backoff)
            backoff *= 1.5

    return item

def main():
    start_time = time.time()
    items = parse_main_index()
    total_items = len(items)

    cache_file = "scraped_cache.json"
    cache = {}
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cache = json.load(f)
            print(f"[*] Loaded {len(cache)} cached items.")
        except Exception:
            cache = {}

    session = requests.Session()
    session.headers.update(HEADERS)

    print(f"[*] Fetching detail pages for {total_items} items (with politeness throttling)...")

    results = []
    for idx, item in enumerate(items, 1):
        item_id = item['id']
        
        # Check cache if valid details already exist
        if item_id in cache and "error" not in cache[item_id].get("details", {}):
            results.append(cache[item_id])
            continue

        # Fetch detail page
        updated_item = parse_detail_page(session, item)
        results.append(updated_item)
        cache[item_id] = updated_item

        # Politeness delay to respect server
        time.sleep(0.15 + random.uniform(0.05, 0.1))

        if idx % 10 == 0 or idx == total_items or "error" in updated_item.get("details", {}):
            success_count = sum(1 for r in results if "error" not in r.get("details", {}))
            print(f"    Progress: {idx}/{total_items} ({idx/total_items*100:.1f}%) - Valid details: {success_count}/{idx}")
            # Periodically save cache
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(cache, f, indent=2, ensure_ascii=False)

    # Final cache save
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

    def sort_key(x):
        try:
            return int(x['id'])
        except (TypeError, ValueError):
            return 999999

    results.sort(key=sort_key)

    valid_count = sum(1 for r in results if "error" not in r.get("details", {}))
    print(f"\n[*] Finished scraping. Valid records: {valid_count}/{total_items}")

    output_data = {
        "metadata": {
            "database_name": "Teenage Mutant Ninja Turtles Playmates Action Figures & Vehicles Database",
            "source_url": MAIN_URL,
            "scrape_timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "link_depth": 1,
            "total_records": len(results),
            "valid_detail_records": valid_count
        },
        "records": results
    }

    # Save to single JSON database file
    output_filename = "tmnt_playmates_database.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    jsonl_filename = "tmnt_playmates_database.jsonl"
    with open(jsonl_filename, "w", encoding="utf-8") as f:
        for rec in results:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"[+] SUCCESS! Database saved to '{output_filename}'.")
    print(f"[+] Total records scraped: {len(results)}")
    print(f"[+] Time elapsed: {time.time() - start_time:.2f} seconds.")

if __name__ == "__main__":
    main()
