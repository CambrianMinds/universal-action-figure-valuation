import requests
from bs4 import BeautifulSoup
import re

url = "http://www.tmnttoys.com/figures_by_year.html"
headers = {'User-Agent': 'Mozilla/5.0'}

try:
    r = requests.get(url, headers=headers, timeout=10)
    print("tmnttoys.com status:", r.status_code)
    soup = BeautifulSoup(r.content, 'lxml')
    links = soup.find_all('a', href=True)
    print(f"Found {len(links)} links on tmnttoys.com/figures_by_year.html")
    for a in links[:20]:
        print(" ", a.text.strip(), "->", a['href'])
except Exception as e:
    print("Error tmnttoys:", e)
