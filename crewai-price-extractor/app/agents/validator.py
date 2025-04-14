from crewai import Agent
from ..config import CREW_VERBOSE
from ..tools.database_tools import DatabaseTool

def get_validator_agent() -> Agent:
    """
    Creates a Validator Agent that verifies price data accuracy
    and updates the database with verified values.
    """
    return Agent(
        role="Data Validation Specialist",
        goal="Ensure price data is accurate and properly stored",
        backstory="""You're a data quality expert who verifies extracted prices.
        You compare new prices with historical data to identify anomalies.
        You make sure only valid prices are stored in the database.""",
        verbose=CREW_VERBOSE,
        allow_delegation=False,
        tools=[DatabaseTool()]
    ) 