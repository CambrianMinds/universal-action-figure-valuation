import requests
from bs4 import BeautifulSoup
import re

url = "https://www.actionfigure411.com/common/search-autocomplete.php?q=apollo"
headers = {'User-Agent': 'Mozilla/5.0'}

r = requests.get(url, headers=headers)
print("Autocomplete search 'apollo':")
print(r.text)

url2 = "https://www.actionfigure411.com/common/search-autocomplete.php?q=lunar"
r2 = requests.get(url2, headers=headers)
print("\nAutocomplete search 'lunar':")
print(r2.text)

url3 = "https://www.actionfigure411.com/common/search-autocomplete.php?q=apollo%2011"
r3 = requests.get(url3, headers=headers)
print("\nAutocomplete search 'apollo 11':")
print(r3.text)
