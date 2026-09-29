import requests
from bs4 import BeautifulSoup

url = "http://www.tmnttoys.com/94figures/apollo/index.html"
r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
soup = BeautifulSoup(r.content, 'lxml')

print("Apollo 11 Turtles Page:")
print("Title/Headers:", [h.text.strip() for h in soup.find_all(['h1', 'h2', 'h3', 'title'])])
for a in soup.find_all('a', href=True):
    print("  Link:", a.text.strip(), "->", a['href'])

print("\nPage text snippets:")
for p in soup.find_all(['p', 'td']):
    if p.text.strip():
        print("  -", p.text.strip().replace('\n', ' '))
