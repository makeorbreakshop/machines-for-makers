"""
Tools for admin debugging and agent visualization
"""

import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import time
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Model for storing agent execution steps
class AgentStep(BaseModel):
    agent_name: str
    timestamp: float
    step_type: str  # "start", "thinking", "action", "result", "end"
    content: str
    metadata: Optional[Dict[str, Any]] = None

# Model for storing full agent execution trace
class AgentTrace(BaseModel):
    trace_id: str
    machine_id: str
    start_time: float
    end_time: Optional[float] = None
    steps: List[AgentStep] = []
    success: Optional[bool] = None
    result: Optional[Dict[str, Any]] = None

# Global store for traces
_traces: Dict[str, AgentTrace] = {}

def start_trace(machine_id: str) -> str:
    """
    Start a new agent execution trace
    
    Args:
        machine_id: ID of the machine being processed
        
    Returns:
        trace_id: ID of the trace for future reference
    """
    trace_id = str(uuid.uuid4())
    _traces[trace_id] = AgentTrace(
        trace_id=trace_id,
        machine_id=machine_id,
        start_time=time.time(),
        steps=[]
    )
    logger.info(f"Started trace {trace_id} for machine {machine_id}")
    return trace_id

def add_step(trace_id: str, agent_name: str, step_type: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
    """
    Add a step to an existing agent execution trace
    
    Args:
        trace_id: ID of the trace
        agent_name: Name of the agent performing the step
        step_type: Type of step ("start", "thinking", "action", "result", "end")
        content: Content of the step
        metadata: Additional metadata for the step
    """
    if trace_id not in _traces:
        logger.warning(f"Trace {trace_id} not found, creating new trace")
        trace_id = start_trace("unknown")
    
    _traces[trace_id].steps.append(AgentStep(
        agent_name=agent_name,
        timestamp=time.time(),
        step_type=step_type,
        content=content,
        metadata=metadata
    ))
    
    logger.debug(f"Added {step_type} step for agent {agent_name} to trace {trace_id}")

def end_trace(trace_id: str, success: bool, result: Dict[str, Any]) -> None:
    """
    End an agent execution trace
    
    Args:
        trace_id: ID of the trace
        success: Whether the execution was successful
        result: Final result of the execution
    """
    if trace_id not in _traces:
        logger.warning(f"Trace {trace_id} not found, cannot end trace")
        return
    
    _traces[trace_id].end_time = time.time()
    _traces[trace_id].success = success
    _traces[trace_id].result = result
    
    logger.info(f"Ended trace {trace_id}, success: {success}")

def get_trace(trace_id: str) -> Optional[Dict[str, Any]]:
    """
    Get an agent execution trace
    
    Args:
        trace_id: ID of the trace
        
    Returns:
        Trace data or None if not found
    """
    if trace_id not in _traces:
        return None
    
    return _traces[trace_id].dict()

def get_recent_traces(limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get recent agent execution traces
    
    Args:
        limit: Maximum number of traces to return
        
    Returns:
        List of recent traces
    """
    # Sort traces by start time (newest first)
    sorted_traces = sorted(
        _traces.values(), 
        key=lambda t: t.start_time, 
        reverse=True
    )
    
    # Return limited number of traces
    return [trace.dict() for trace in sorted_traces[:limit]]

def clear_old_traces(max_age_hours: int = 24) -> int:
    """
    Clear old traces to prevent memory leaks
    
    Args:
        max_age_hours: Maximum age of traces to keep in hours
        
    Returns:
        Number of traces cleared
    """
    current_time = time.time()
    max_age_seconds = max_age_hours * 3600
    
    # Find traces older than the maximum age
    old_trace_ids = [
        trace_id for trace_id, trace in _traces.items()
        if current_time - trace.start_time > max_age_seconds
    ]
    
    # Clear old traces
    for trace_id in old_trace_ids:
        del _traces[trace_id]
    
    return len(old_trace_ids) 