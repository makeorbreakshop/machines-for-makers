import asyncio
from scrapfly import ScrapflyClient, ScrapeConfig

async def test():
    client = ScrapflyClient(key='test')
    config = ScrapeConfig(url='https://example.com')
    try:
        resp = await client.async_scrape(config)
        print(f"Response type: {type(resp)}")
        print(f"Has scrape_result: {hasattr(resp, 'scrape_result')}")
        if hasattr(resp, 'scrape_result'):
            print(f"scrape_result type: {type(resp.scrape_result)}")
            print(f"scrape_result value: {resp.scrape_result}")
    except Exception as e:
        print(f'Error: {e}')

asyncio.run(test())