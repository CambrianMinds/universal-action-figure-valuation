import requests
from bs4 import BeautifulSoup

BASE_DOMAIN = "https://www.actionfigure411.com"

GUIDES = [
    {"franchise": "TMNT", "line": "Playmates", "url": "/teenage-mutant-ninja-turtles/playmates-price-guide.php"},
    {"franchise": "TMNT", "line": "NECA", "url": "/teenage-mutant-ninja-turtles/neca-price-guide.php"},
    {"franchise": "TMNT", "line": "Super7", "url": "/teenage-mutant-ninja-turtles/super7-price-guide.php"},
    {"franchise": "TMNT", "line": "Mutant Mayhem", "url": "/teenage-mutant-ninja-turtles/mutant-mayhem-price-guide.php"},
    {"franchise": "Star Wars", "line": "Kenner Vintage (1977-1985)", "url": "/star-wars/vintage-price-guide.php"},
    {"franchise": "Star Wars", "line": "Black Series (6\")", "url": "/star-wars/black-series-price-guide.php"},
    {"franchise": "Star Wars", "line": "Vintage Collection (3.75\")", "url": "/star-wars/vintage-collection-price-guide.php"},
    {"franchise": "Marvel", "line": "Marvel Legends", "url": "/marvel/marvel-legends-price-guide.php"},
    {"franchise": "Transformers", "line": "Generation 1 (Vintage)", "url": "/transformers/g1-price-guide.php"},
    {"franchise": "G.I. Joe", "line": "Classified Series (6\")", "url": "/gi-joe/classified-price-guide.php"},
    {"franchise": "G.I. Joe", "line": "A Real American Hero (Vintage)", "url": "/gi-joe/rah-price-guide.php"},
    {"franchise": "Masters of the Universe", "line": "Vintage MOTU (1980s)", "url": "/motu/vintage-price-guide.php"},
    {"franchise": "Masters of the Universe", "line": "MOTU Origins", "url": "/motu/origins-price-guide.php"}
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

print("Testing ActionFigure411 price guides across franchises...")
for g in GUIDES:
    full_url = BASE_DOMAIN + g["url"]
    try:
        r = requests.get(full_url, headers=headers, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.content, 'lxml')
            tables = soup.find_all('table', id=lambda x: x and 'groupTable' in x)
            links = soup.find_all('a', href=lambda x: x and ('.php' in x) and ('/images/' not in x))
            # count figure detail links
            fig_links = [l for l in links if any(p in l['href'] for p in ['/playmates/', '/neca/', '/super7/', '/mutant-mayhem/', '/vintage/', '/black-series/', '/vintage-collection/', '/marvel-legends/', '/g1/', '/classified/', '/rah/', '/motu/', '/origins/'])]
            print(f"[SUCCESS {r.status_code}] {g['franchise']} - {g['line']}: {len(tables)} tables, ~{len(fig_links)} figure links")
        else:
            print(f"[HTTP {r.status_code}] {g['franchise']} - {g['line']}: {full_url}")
    except Exception as e:
        print(f"[ERROR] {g['franchise']} - {g['line']}: {e}")
