from crewai import Agent
from ..config import CREW_VERBOSE
from ..tools.scraping_tools import PriceExtractionTool

def get_price_extractor_agent() -> Agent:
    """
    Creates a Price Extractor Agent that specializes in identifying and extracting
    price information from product page HTML.
    """
    return Agent(
        role="Price Analysis Specialist",
        goal="Extract accurate price information from product pages",
        backstory="""You're an expert in identifying and extracting pricing data.
        You understand various pricing formats, currencies, and structures.
        You can locate the current price even on complex retail pages with multiple options.""",
        verbose=CREW_VERBOSE,
        allow_delegation=False,
        tools=[PriceExtractionTool()]
    ) 