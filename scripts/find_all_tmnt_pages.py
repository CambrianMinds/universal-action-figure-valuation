import requests
from bs4 import BeautifulSoup
import re

url = "https://www.actionfigure411.com/teenage-mutant-ninja-turtles/"
r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
soup = BeautifulSoup(r.content, 'lxml')

print("All TMNT Links on Portal:")
links = set()
for a in soup.find_all('a', href=True):
    href = a['href']
    if 'teenage-mutant-ninja-turtles' in href or href.endswith('.php'):
        full = "https://www.actionfigure411.com" + href if href.startswith('/') else href
        links.add((a.text.strip(), full))

for text, href in sorted(links):
    print(f"  {text:35} -> {href}")
