from crewai import Task
from typing import Dict, Any, List
from ..agents.validator import get_validator_agent

def create_validate_task() -> Task:
    """
    Creates a task for the Validator Agent to verify price data
    and update the database with validated prices.
    """
    return Task(
        description="""
        Validate extracted price data and update the database.
        
        Your job is to:
        1. Evaluate extracted prices for each machine
        2. Compare with historical price data
        3. Validate prices are realistic and reasonable
        4. Save valid prices to the database
        5. Update all-time high/low flags
        """,
        expected_output="""
        For each machine:
        - Validation result (valid/invalid)
        - Price saved to database (with record ID)
        - Comparison to historical prices
        - Updated price extremes (all-time high/low)
        """,
        agent=get_validator_agent()
    ) 