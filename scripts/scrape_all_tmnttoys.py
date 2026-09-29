import requests
from bs4 import BeautifulSoup
import re
import sqlite3
import json
import time

BASE_URL = "http://www.tmnttoys.com/"

PAGES = [
    {"year": 1988, "url": "figures1987.html", "line": "Playmates Vintage (1988-1997)"},
    {"year": 1997, "url": "figuresTNM.html", "line": "The Next Mutation (1997-1998)"},
    {"year": 2003, "url": "figures2003.html", "line": "Playmates 2003 Series"},
    {"year": 2006, "url": "figuresFF.html", "line": "Fast Forward (2006)"},
    {"year": 2007, "url": "figuresTMNT.html", "line": "TMNT Movie (2007-2011)"},
    {"year": 2012, "url": "figures2012.html", "line": "Playmates 2012 Series"},
    {"year": 2018, "url": "figures2018.html", "line": "Rise of the TMNT"},
    {"year": 2023, "url": "figures2023.html", "line": "Mutant Mayhem"},
    {"year": 2020, "url": "figuresNECA.html", "line": "NECA & Collector Lines"}
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def scrape_tmnttoys():
    discovered_figures = []
    seen_urls = set()

    for p in PAGES:
        page_url = BASE_URL + p["url"]
        print(f"[*] Crawling tmnttoys archive: {p['line']} ({page_url})...")
        try:
            r = requests.get(page_url, headers=headers, timeout=12)
            if r.status_code != 200:
                print(f"    [!] Error HTTP {r.status_code}")
                continue

            soup = BeautifulSoup(r.content, 'lxml')
            
            # Find all subcategory / line links
            sub_links = []
            for a in soup.find_all('a', href=True):
                href = a['href']
                text = a.text.strip()
                if text and ('index.html' in href or '.htm' in href) and not href.startswith('http') and not href.startswith('#'):
                    # resolve path relative to page_url
                    full_href = BASE_URL + href if not href.startswith('/') else BASE_URL + href[1:]
                    sub_links.append((text, full_href))

            print(f"    [+] Found {len(sub_links)} sub-line links.")

            for title, sub_url in sub_links:
                if sub_url in seen_urls: continue
                seen_urls.add(sub_url)

                try:
                    sr = requests.get(sub_url, headers=headers, timeout=8)
                    if sr.status_code != 200: continue
                    ssoup = BeautifulSoup(sr.content, 'lxml')

                    # Check for figure detail links or item headings
                    fig_links = ssoup.find_all('a', href=re.compile(r'\.htm$|\.html$'))
                    for fa in fig_links:
                        fname = fa.text.strip()
                        if fname and len(fname) > 2 and 'Back to' not in fname and 'archive' not in fname.lower() and 'review' not in fname.lower():
                            fhref = fa['href']
                            # Determine year from text or path
                            year_match = re.search(r'(19\d\d|20\d\d)', sub_url + fname)
                            fig_year = int(year_match.group(1)) if year_match else p["year"]

                            # Image link if available
                            img_tag = fa.find('img') or fa.find_previous('img') or fa.find_next('img')
                            img_src = None
                            if img_tag and img_tag.get('src'):
                                isrc = img_tag['src']
                                img_src = BASE_URL + isrc if not isrc.startswith('http') else isrc

                            discovered_figures.append({
                                'name': fname,
                                'franchise': 'TMNT',
                                'series': p['line'],
                                'group': title,
                                'year': fig_year,
                                'thumb': img_src,
                                'url': sub_url
                            })

                except Exception:
                    pass

                time.sleep(0.05)

        except Exception as e:
            print(f"    [!] Error crawling {page_url}: {e}")

    print(f"\n[+] Total Discovered Figures from tmnttoys.com: {len(discovered_figures)}")
    return discovered_figures

if __name__ == "__main__":
    figs = scrape_tmnttoys()
    with open("tmnttoys_scraped.json", "w", encoding="utf-8") as f:
        json.dump(figs, f, indent=2, ensure_ascii=False)
