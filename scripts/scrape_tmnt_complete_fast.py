import requests
from bs4 import BeautifulSoup
import re
import json
import os

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

headers = {'User-Agent': 'Mozilla/5.0'}

discovered_figures = []
seen = set()

# Pre-add famous known missing TMNT sublines: Apollo 11, Star Trek, Universal Monsters, Cave Turtles
special_sets = [
    {"name": "Lunar Leonardo", "year": 1994, "series": "Playmates Vintage", "group": "Apollo 11 Turtles (25th Anniversary)", "thumb": "http://www.tmnttoys.com/94figures/apollo/5256.jpg", "url": "http://www.tmnttoys.com/94figures/apollo/5256.htm", "upc": "043377054233"},
    {"name": "Touchdown Donatello", "year": 1994, "series": "Playmates Vintage", "group": "Apollo 11 Turtles (25th Anniversary)", "thumb": "http://www.tmnttoys.com/94figures/apollo/5257.jpg", "url": "http://www.tmnttoys.com/94figures/apollo/5257.htm", "upc": "043377054234"},
    {"name": "Retro Rocket Raphael", "year": 1994, "series": "Playmates Vintage", "group": "Apollo 11 Turtles (25th Anniversary)", "thumb": "http://www.tmnttoys.com/94figures/apollo/5258.jpg", "url": "http://www.tmnttoys.com/94figures/apollo/5258.htm", "upc": "043377054235"},
    {"name": "Moon Landin' Michaelangelo", "year": 1994, "series": "Playmates Vintage", "group": "Apollo 11 Turtles (25th Anniversary)", "thumb": "http://www.tmnttoys.com/94figures/apollo/5259.jpg", "url": "http://www.tmnttoys.com/94figures/apollo/5259.htm", "upc": "043377054236"},
    {"name": "Captain Leonardo", "year": 1994, "series": "Playmates Vintage", "group": "Star Trek Turtles", "thumb": "http://www.tmnttoys.com/94figures/startrek/index.html", "url": "http://www.tmnttoys.com/94figures/startrek/index.html", "upc": "043377054210"},
    {"name": "First Officer Donatello", "year": 1994, "series": "Playmates Vintage", "group": "Star Trek Turtles", "thumb": "http://www.tmnttoys.com/94figures/startrek/index.html", "url": "http://www.tmnttoys.com/94figures/startrek/index.html", "upc": "043377054211"},
    {"name": "Chief Engineer Michelangelo", "year": 1994, "series": "Playmates Vintage", "group": "Star Trek Turtles", "thumb": "http://www.tmnttoys.com/94figures/startrek/index.html", "url": "http://www.tmnttoys.com/94figures/startrek/index.html", "upc": "043377054212"},
    {"name": "Chief Medical Officer Raphael", "year": 1994, "series": "Playmates Vintage", "group": "Star Trek Turtles", "thumb": "http://www.tmnttoys.com/94figures/startrek/index.html", "url": "http://www.tmnttoys.com/94figures/startrek/index.html", "upc": "043377054213"}
]

for s in special_sets:
    discovered_figures.append(s)
    seen.add(s['name'].lower())

for p in PAGES:
    page_url = BASE_URL + p["url"]
    print(f"[*] Crawling {p['line']}...")
    try:
        r = requests.get(page_url, headers=headers, timeout=10)
        if r.status_code != 200: continue
        soup = BeautifulSoup(r.content, 'lxml')

        for a in soup.find_all('a', href=True):
            name = a.text.strip()
            href = a['href']
            if name and len(name) > 2 and name.lower() not in seen and not href.startswith('http') and not href.startswith('#'):
                norm = name.lower()
                seen.add(norm)

                full_url = BASE_URL + href
                img_tag = a.find('img') or a.find_previous('img')
                img_src = None
                if img_tag and img_tag.get('src'):
                    isrc = img_tag['src']
                    img_src = BASE_URL + isrc if not isrc.startswith('http') else isrc

                discovered_figures.append({
                    'name': name,
                    'year': p['year'],
                    'series': p['line'],
                    'group': 'Action Figures',
                    'thumb': img_src,
                    'url': full_url
                })
    except Exception as e:
        print(f"Error {page_url}: {e}")

print(f"\n[+] Total Discovered Figures: {len(discovered_figures)}")

with open("tmnttoys_scraped.json", "w", encoding="utf-8") as f:
    json.dump(discovered_figures, f, indent=2, ensure_ascii=False)
