#!/usr/bin/env python3
"""Direct Scrapfly account check"""
import os
import json
from dotenv import load_dotenv
from scrapfly import ScrapflyClient

load_dotenv()

api_key = os.getenv('SCRAPFLY_API_KEY')
if not api_key:
    print("No SCRAPFLY_API_KEY found")
    exit(1)

client = ScrapflyClient(key=api_key)
account = client.account()

print("Raw account data:")
print(f"Type: {type(account)}")
print(f"Account object: {account}")

# Try to access attributes
for attr in dir(account):
    if not attr.startswith('_'):
        try:
            value = getattr(account, attr)
            print(f"{attr}: {value}")
        except:
            pass