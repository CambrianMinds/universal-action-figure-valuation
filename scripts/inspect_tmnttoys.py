import requests
from bs4 import BeautifulSoup

url = "http://www.tmnttoys.com/"
r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
soup = BeautifulSoup(r.content, 'lxml')

print("Links on tmnttoys homepage:")
for a in soup.find_all('a', href=True):
    print(" ", a.text.strip(), "->", a['href'])
