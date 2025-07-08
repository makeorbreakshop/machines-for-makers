import requests
from bs4 import BeautifulSoup
import re

url = 'https://commarker.com/product/b4-30w-laser-engraver-machine/'
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.text, 'html.parser')

# Find all elements with price-like patterns
price_pattern = re.compile(r'\$\d{1,5}(?:,\d{3})*(?:\.\d{2})?')

# Search in all text and attributes
prices_found = set()

# Check text content
for text in soup.stripped_strings:
    matches = price_pattern.findall(text)
    for match in matches:
        prices_found.add(match)

# Check common price attributes
for elem in soup.find_all(True):
    for attr in ['data-price', 'data-regular-price', 'data-sale-price']:
        if elem.get(attr):
            prices_found.add(f'${elem.get(attr)}')

print('Unique prices found on page:')
for price in sorted(prices_found):
    print(f'  {price}')

# Look specifically for price elements
print('\nPrice elements found:')
for elem in soup.find_all(class_=re.compile('price|amount')):
    text = elem.get_text(strip=True)
    if '$' in text:
        print(f'  Class: {elem.get("class")}, Text: {text}')

# Check for variant prices
print('\nChecking for variant/option prices:')
for elem in soup.find_all(['div', 'span'], class_=re.compile('option|variant|swatch')):
    text = elem.get_text(strip=True)
    if '$' in text:
        print(f'  {text}')