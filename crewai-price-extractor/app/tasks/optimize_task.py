from crewai import Task
from typing import Dict, Any, List
from ..agents.batch_optimizer import get_batch_optimizer_agent

def create_optimize_task() -> Task:
    """
    Creates a task for the Batch Optimizer Agent to organize machines
    into efficient processing batches.
    """
    return Task(
        description="""
        Organize machines into efficient batches for price extraction.
        
        Your job is to:
        1. Group machines by manufacturer
        2. Create prioritized batches for processing
        3. Ensure efficient distribution to minimize API calls
        """,
        expected_output="""
        A list of machine batches organized by manufacturer,
        with each batch containing 3-5 machines.
        """,
        agent=get_batch_optimizer_agent()
    ) 