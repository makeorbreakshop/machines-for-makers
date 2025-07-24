"""
Cost tracking API routes
Provides endpoints for monitoring AI usage costs and budget management
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from loguru import logger
from typing import Optional, Dict, List
from datetime import datetime, timedelta

from services.cost_tracker import CostTracker

router = APIRouter()
cost_tracker = CostTracker()


class BudgetStatus(BaseModel):
    """Budget status response model"""
    within_budget: bool
    operation_cost: float
    operation_limit: float
    operation_remaining: float
    total_daily_cost: float
    total_daily_limit: float
    total_remaining: float
    costs_by_type: Dict[str, float]


@router.get("/health")
async def cost_health():
    """Health check for cost tracking service"""
    return {"status": "ok", "service": "cost_tracker"}


@router.get("/budget-status/{operation_type}", response_model=BudgetStatus)
async def get_budget_status(operation_type: str):
    """
    Get current budget status for an operation type.
    
    Args:
        operation_type: Type of operation (discovery, extraction, etc.)
    """
    try:
        status = await cost_tracker.check_budget_limits(operation_type)
        
        if 'error' in status:
            raise HTTPException(status_code=500, detail=status['error'])
        
        return BudgetStatus(**status)
        
    except Exception as e:
        logger.exception(f"Error getting budget status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting budget status: {str(e)}")


@router.get("/summary")
async def get_cost_summary(
    days_back: int = Query(default=7, description="Number of days to analyze"),
    site_id: Optional[str] = Query(default=None, description="Filter by site ID")
):
    """
    Get cost summary for a specified period.
    
    Args:
        days_back: Number of days to look back (default: 7)
        site_id: Optional site ID to filter by
    """
    try:
        summary = await cost_tracker.get_cost_summary(days_back, site_id)
        
        return {
            "success": True,
            "summary": {
                "total_cost": summary.total_cost,
                "total_operations": summary.total_operations,
                "successful_operations": summary.successful_operations,
                "failed_operations": summary.failed_operations,
                "success_rate": summary.successful_operations / max(1, summary.total_operations) * 100,
                "average_cost_per_operation": summary.average_cost_per_operation,
                "top_operations": summary.top_operations,
                "cost_by_site": summary.cost_by_site
            },
            "period": {
                "days_back": days_back,
                "site_id": site_id
            }
        }
        
    except Exception as e:
        logger.exception(f"Error getting cost summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting cost summary: {str(e)}")


@router.get("/daily-costs")
async def get_daily_costs(
    days_back: int = Query(default=30, description="Number of days to look back")
):
    """
    Get daily cost breakdown.
    
    Args:
        days_back: Number of days to look back (default: 30)
    """
    try:
        # Query daily costs from the database
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)
        
        query = """
            SELECT 
                DATE(timestamp) as cost_date,
                operation_type,
                SUM(cost_usd) as total_cost,
                COUNT(*) as operation_count,
                AVG(cost_usd) as avg_cost,
                SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_ops
            FROM ai_cost_tracking 
            WHERE timestamp >= %s 
            GROUP BY DATE(timestamp), operation_type
            ORDER BY cost_date DESC, total_cost DESC
        """
        
        results = await cost_tracker.db.execute_query(query, (start_date.isoformat(),))
        
        # Group by date
        daily_costs = {}
        for result in results:
            date_str = str(result.get('cost_date'))
            if date_str not in daily_costs:
                daily_costs[date_str] = {
                    'date': date_str,
                    'total_cost': 0.0,
                    'operations': []
                }
            
            operation_data = {
                'operation_type': result.get('operation_type'),
                'cost': float(result.get('total_cost', 0)),
                'count': int(result.get('operation_count', 0)),
                'avg_cost': float(result.get('avg_cost', 0)),
                'successful': int(result.get('successful_ops', 0))
            }
            
            daily_costs[date_str]['operations'].append(operation_data)
            daily_costs[date_str]['total_cost'] += operation_data['cost']
        
        # Convert to list and sort by date
        result_list = list(daily_costs.values())
        result_list.sort(key=lambda x: x['date'], reverse=True)
        
        return {
            "success": True,
            "daily_costs": result_list,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days_back": days_back
            }
        }
        
    except Exception as e:
        logger.exception(f"Error getting daily costs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting daily costs: {str(e)}")


@router.get("/alerts")
async def get_budget_alerts(
    limit: int = Query(default=50, description="Maximum number of alerts to return"),
    status: Optional[str] = Query(default=None, description="Filter by alert status")
):
    """
    Get budget alerts.
    
    Args:
        limit: Maximum number of alerts to return
        status: Optional status filter (active, resolved, ignored)
    """
    try:
        query = """
            SELECT 
                id, alert_message, cost_data, created_at, 
                alert_type, status, resolved_at, resolved_by
            FROM budget_alerts
        """
        params = []
        
        if status:
            query += " WHERE status = %s"
            params.append(status)
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        results = await cost_tracker.db.execute_query(query, params)
        
        alerts = []
        for result in results:
            alerts.append({
                'id': result.get('id'),
                'message': result.get('alert_message'),
                'cost_data': result.get('cost_data'),
                'created_at': result.get('created_at'),
                'alert_type': result.get('alert_type'),
                'status': result.get('status'),
                'resolved_at': result.get('resolved_at'),
                'resolved_by': result.get('resolved_by')
            })
        
        return {
            "success": True,
            "alerts": alerts,
            "count": len(alerts)
        }
        
    except Exception as e:
        logger.exception(f"Error getting budget alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting budget alerts: {str(e)}")


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    resolved_by: str = "admin"
):
    """
    Resolve a budget alert.
    
    Args:
        alert_id: ID of the alert to resolve
        resolved_by: Who resolved the alert
    """
    try:
        query = """
            UPDATE budget_alerts 
            SET status = 'resolved', resolved_at = %s, resolved_by = %s
            WHERE id = %s
        """
        params = (datetime.utcnow().isoformat(), resolved_by, alert_id)
        
        await cost_tracker.db.execute_query(query, params)
        
        return {
            "success": True,
            "message": f"Alert {alert_id} resolved by {resolved_by}"
        }
        
    except Exception as e:
        logger.exception(f"Error resolving alert {alert_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error resolving alert: {str(e)}")


@router.get("/models")
async def get_model_costs():
    """Get current model cost rates."""
    return {
        "success": True,
        "model_costs": cost_tracker.model_costs,
        "daily_budget_limits": cost_tracker.daily_budget_limits
    }


@router.post("/track-cost")
async def track_manual_cost(
    operation_type: str,
    model_used: str,
    tokens_used: int,
    url: Optional[str] = None,
    site_id: Optional[str] = None,
    success: bool = True
):
    """
    Manually track a cost entry (for testing/manual operations).
    
    Args:
        operation_type: Type of operation
        model_used: Model that was used
        tokens_used: Number of tokens consumed
        url: Optional URL processed
        site_id: Optional site ID
        success: Whether operation was successful
    """
    try:
        from services.cost_tracker import CostEntry
        
        cost = await cost_tracker.calculate_cost(model_used, tokens_used, operation_type)
        
        cost_entry = CostEntry(
            operation_type=operation_type,
            model_used=model_used,
            tokens_used=tokens_used,
            cost_usd=cost,
            timestamp=datetime.utcnow(),
            site_id=site_id,
            url=url,
            success=success
        )
        
        tracked = await cost_tracker.track_cost(cost_entry)
        
        if tracked:
            return {
                "success": True,
                "cost": cost,
                "message": f"Tracked ${cost:.4f} for {operation_type} operation"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to track cost")
            
    except Exception as e:
        logger.exception(f"Error tracking manual cost: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error tracking cost: {str(e)}")