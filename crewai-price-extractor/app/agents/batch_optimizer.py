from crewai import Agent
from typing import List, Dict
import itertools
from ..config import CREW_VERBOSE

def get_batch_optimizer_agent() -> Agent:
    """
    Creates a Batch Optimizer Agent that groups machines by manufacturer
    for efficient processing.
    """
    return Agent(
        role="Batch Processing Strategist",
        goal="Optimize machine processing for efficient price extraction",
        backstory="""You are an expert in organizing and prioritizing large datasets.
        Your job is to group machines by manufacturer and create efficient 
        processing queues to minimize API costs and maximize success rates.""",
        verbose=CREW_VERBOSE,
        allow_delegation=True,
    )

def group_machines_by_manufacturer(machines: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Groups machines by manufacturer to optimize processing
    """
    grouped = {}
    
    for machine in machines:
        manufacturer = machine.get("Company", "Unknown")
        if manufacturer not in grouped:
            grouped[manufacturer] = []
        grouped[manufacturer].append(machine)
    
    return grouped

def create_optimized_batch(machines: List[Dict], batch_size: int = 5) -> List[List[Dict]]:
    """
    Creates optimized batches of machines to process, grouped by manufacturer
    """
    # Group by manufacturer
    grouped = group_machines_by_manufacturer(machines)
    
    # Sort manufacturers by number of machines (descending)
    sorted_manufacturers = sorted(
        grouped.keys(), 
        key=lambda m: len(grouped[m]), 
        reverse=True
    )
    
    # Create batches based on manufacturer groups
    batches = []
    current_batch = []
    
    # First, add one machine from each manufacturer to ensure diversity
    for manufacturer in sorted_manufacturers:
        if grouped[manufacturer]:
            current_batch.append(grouped[manufacturer].pop(0))
            
            if len(current_batch) >= batch_size:
                batches.append(current_batch)
                current_batch = []
    
    # If we have a partial batch, add it
    if current_batch:
        batches.append(current_batch)
        current_batch = []
    
    # Then distribute remaining machines
    all_remaining = list(itertools.chain.from_iterable(
        grouped[manufacturer] for manufacturer in sorted_manufacturers
    ))
    
    # Add remaining machines to batches
    for machine in all_remaining:
        if len(current_batch) >= batch_size:
            batches.append(current_batch)
            current_batch = []
        current_batch.append(machine)
    
    # Add final partial batch if needed
    if current_batch:
        batches.append(current_batch)
    
    return batches 