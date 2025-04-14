from crewai import Agent
from ..config import CREW_VERBOSE
from ..tools.scraping_tools import WebScrapingTool

def get_web_scraper_agent() -> Agent:
    """
    Creates a Web Scraper Agent that specializes in extracting complete,
    accurate HTML from product pages.
    """
    return Agent(
        role="Web Content Specialist",
        goal="Extract complete, accurate HTML from product pages",
        backstory="""You're a web scraping expert who can navigate complex sites.
        You handle redirects, JavaScript rendering, and access issues.
        You know how to get clean, complete HTML for any product page.""",
        verbose=CREW_VERBOSE,
        allow_delegation=False,
        tools=[WebScrapingTool()]
    ) 