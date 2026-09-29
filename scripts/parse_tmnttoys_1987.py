import requests
from bs4 import BeautifulSoup
import re

url = "http://www.tmnttoys.com/figures1987.html"
headers = {'User-Agent': 'Mozilla/5.0'}

r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.content, 'lxml')

print("Parsing tmnttoys.com/figures1987.html...")

figures = []
# Find links to figure detail pages or text blocks
links = soup.find_all('a', href=True)
print(f"Total links: {len(links)}")

for a in links:
    text = a.text.strip()
    href = a['href']
    if 'apollo' in text.lower() or 'lunar' in text.lower() or 'leonardo' in text.lower():
        print(f"  Match: {text:35} -> {href}")
