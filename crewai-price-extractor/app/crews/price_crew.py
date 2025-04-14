from crewai import Crew, Process
from typing import List, Dict, Any, Optional
from app.config import CREW_VERBOSE
from app.agents.batch_optimizer import get_batch_optimizer_agent
from app.agents.web_scraper import get_web_scraper_agent
from app.agents.price_extractor import get_price_extractor_agent
from app.agents.validator import get_validator_agent
from app.tasks.optimize_task import create_optimize_task
from app.tasks.scrape_task import create_scrape_task
from app.tasks.extract_task import create_extract_task
from app.tasks.validate_task import create_validate_task

def get_price_crew(debug: bool = False) -> Crew:
    """
    Creates a CrewAI crew for price extraction with all agents and tasks.
    
    Args:
        debug: Whether to run in debug mode with more verbose output
    
    Returns:
        A CrewAI Crew instance ready to kickoff
    """
    # Get all agents
    batch_optimizer = get_batch_optimizer_agent()
    web_scraper = get_web_scraper_agent()
    price_extractor = get_price_extractor_agent()
    validator = get_validator_agent()
    
    # Create all tasks
    optimize_task = create_optimize_task()
    scrape_task = create_scrape_task()
    extract_task = create_extract_task()
    validate_task = create_validate_task()
    
    # Create and return the crew
    return Crew(
        agents=[batch_optimizer, web_scraper, price_extractor, validator],
        tasks=[optimize_task, scrape_task, extract_task, validate_task],
        verbose=debug or CREW_VERBOSE,
        process=Process.sequential
    ) 