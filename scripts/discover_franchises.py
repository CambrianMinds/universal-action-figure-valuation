import requests
from bs4 import BeautifulSoup

BASE = "https://www.actionfigure411.com"
PORTALS = {
    "TMNT": "/teenage-mutant-ninja-turtles/",
    "Star Wars": "/star-wars/",
    "Marvel": "/marvel/",
    "Transformers": "/transformers/",
    "DC Multiverse": "/dc/",
    "G.I. Joe": "/gi-joe/",
    "Masters of the Universe": "/motu/"
}

headers = {'User-Agent': 'Mozilla/5.0'}

discovered_lines = []

for franchise, path in PORTALS.items():
    url = BASE + path
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.content, 'lxml')
            for a in soup.find_all('a', href=True):
                href = a['href']
                if 'price-guide.php' in href:
                    line_name = a.text.strip().replace('Price Guide', '').strip()
                    full_href = BASE + href if href.startswith('/') else href
                    discovered_lines.append({
                        'franchise': franchise,
                        'line': line_name if line_name else href.split('/')[-1].replace('-price-guide.php', '').replace('-', ' ').title(),
                        'url': full_href
                    })
    except Exception as e:
        print(f"Error {franchise}: {e}")

# Deduplicate
unique_lines = {}
for item in discovered_lines:
    unique_lines[item['url']] = item

print(f"Total Discovered Price Guides: {len(unique_lines)}")
for url, info in unique_lines.items():
    print(f"  [{info['franchise']}] {info['line']:35} -> {url}")
