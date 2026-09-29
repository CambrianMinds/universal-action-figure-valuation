import requests
from bs4 import BeautifulSoup

url = "https://www.actionfigure411.com/teenage-mutant-ninja-turtles/playmates-price-guide.php"
r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
soup = BeautifulSoup(r.content, 'lxml')

print("Discovered Guides from Navbar & Footer:")
for a in soup.find_all('a', href=True):
    href = a['href']
    if 'price-guide.php' in href or 'visual-guide.php' in href:
        print(f"  {a.text.strip()} -> {href}")
