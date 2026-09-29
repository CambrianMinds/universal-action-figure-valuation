import requests
from bs4 import BeautifulSoup

r = requests.get("https://www.actionfigure411.com/", headers={'User-Agent': 'Mozilla/5.0'})
soup = BeautifulSoup(r.content, 'lxml')

guides = set()
for a in soup.find_all('a', href=True):
    href = a['href']
    if 'price-guide.php' in href or 'guides' in href or 'star-wars' in href or 'marvel' in href or 'transformers' in href or 'gi-joe' in href or 'motu' in href or 'funko' in href or 'wrestling' in href or 'dc' in href:
        text = a.text.strip()
        guides.add((text, href))

print(f"Found {len(guides)} franchise guide links on homepage:")
for text, href in sorted(guides):
    if text:
        print(f"  {text:35} -> {href}")
