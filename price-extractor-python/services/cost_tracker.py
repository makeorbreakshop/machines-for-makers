"""
Cost Tracking Service
Tracks and manages AI costs for discovery operations
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from services.database import DatabaseService

logger = logging.getLogger(__name__)


@dataclass
class CostEntry:
    """Individual cost entry"""
    operation_type: str
    model_used: str
    tokens_used: int
    cost_usd: float
    timestamp: datetime
    site_id: Optional[str] = None
    scan_id: Optional[str] = None
    url: Optional[str] = None
    success: bool = True


@dataclass
class CostSummary:
    """Cost summary for a period"""
    total_cost: float
    total_operations: int
    successful_operations: int
    failed_operations: int
    average_cost_per_operation: float
    top_operations: List[Dict]
    cost_by_site: Dict[str, float]


class CostTracker:
    """Service for tracking AI usage costs"""
    
    def __init__(self):
        self.db = DatabaseService()
        # Cost per token for different models (approximate rates)
        self.model_costs = {
            'gpt-4': 0.03 / 1000,      # $0.03 per 1K tokens
            'gpt-3.5-turbo': 0.002 / 1000,  # $0.002 per 1K tokens
            'claude-3-sonnet': 0.015 / 1000,  # $0.015 per 1K tokens
            'claude-3-haiku': 0.00025 / 1000,  # $0.00025 per 1K tokens
        }
        
        # Daily budget limits (USD)
        self.daily_budget_limits = {
            'discovery': 50.0,     # $50 per day for discovery operations
            'extraction': 100.0,   # $100 per day for price extraction
            'total': 200.0         # $200 total daily limit
        }

    async def track_cost(self, cost_entry: CostEntry) -> bool:
        """
        Track a cost entry in the database
        
        Args:
            cost_entry: Cost entry to track
            
        Returns:
            bool: Success status
        """
        try:
            query = """
                INSERT INTO ai_cost_tracking 
                (operation_type, model_used, tokens_used, cost_usd, timestamp, 
                 site_id, scan_id, url, success)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                cost_entry.operation_type,
                cost_entry.model_used,
                cost_entry.tokens_used,
                cost_entry.cost_usd,
                cost_entry.timestamp.isoformat(),
                cost_entry.site_id,
                cost_entry.scan_id,
                cost_entry.url,
                cost_entry.success
            )
            
            await self.db.execute_query(query, params)
            logger.info(f"Tracked cost: ${cost_entry.cost_usd:.4f} for {cost_entry.operation_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error tracking cost: {e}")
            return False

    async def calculate_cost(self, model: str, tokens: int, operation_type: str = "unknown") -> float:
        """
        Calculate cost for a given model and token count
        
        Args:
            model: Model name (e.g., 'gpt-4', 'claude-3-sonnet')
            tokens: Number of tokens used
            operation_type: Type of operation (for logging)
            
        Returns:
            float: Cost in USD
        """
        try:
            # Get cost per token for the model
            cost_per_token = self.model_costs.get(model.lower(), 0.01 / 1000)  # Default fallback
            
            # Calculate total cost
            total_cost = tokens * cost_per_token
            
            logger.debug(f"Cost calculation: {tokens} tokens × ${cost_per_token:.6f} = ${total_cost:.4f} for {model}")
            
            return total_cost
            
        except Exception as e:
            logger.error(f"Error calculating cost: {e}")
            return 0.0

    async def check_budget_limits(self, operation_type: str) -> Dict:
        """
        Check if current usage is within budget limits
        
        Args:
            operation_type: Type of operation to check
            
        Returns:
            dict: Budget status information
        """
        try:
            today = datetime.utcnow().date()
            tomorrow = today + timedelta(days=1)
            
            # Get today's costs
            query = """
                SELECT 
                    SUM(cost_usd) as total_cost,
                    COUNT(*) as total_operations,
                    operation_type
                FROM ai_cost_tracking 
                WHERE DATE(timestamp) = %s
                GROUP BY operation_type
            """
            results = await self.db.execute_query(query, (today.isoformat(),))
            
            # Calculate costs by operation type
            costs_by_type = {}
            total_daily_cost = 0.0
            
            for result in results:
                op_type = result.get('operation_type', 'unknown')
                cost = float(result.get('total_cost', 0))
                costs_by_type[op_type] = cost
                total_daily_cost += cost
            
            # Check limits
            operation_cost = costs_by_type.get(operation_type, 0.0)
            operation_limit = self.daily_budget_limits.get(operation_type, 50.0)
            total_limit = self.daily_budget_limits.get('total', 200.0)
            
            return {
                'within_budget': operation_cost < operation_limit and total_daily_cost < total_limit,
                'operation_cost': operation_cost,
                'operation_limit': operation_limit,
                'operation_remaining': max(0, operation_limit - operation_cost),
                'total_daily_cost': total_daily_cost,
                'total_daily_limit': total_limit,
                'total_remaining': max(0, total_limit - total_daily_cost),
                'costs_by_type': costs_by_type
            }
            
        except Exception as e:
            logger.error(f"Error checking budget limits: {e}")
            return {
                'within_budget': True,  # Default to allowing operations
                'error': str(e)
            }

    async def get_cost_summary(self, days_back: int = 7, site_id: Optional[str] = None) -> CostSummary:
        """
        Get cost summary for a specified period
        
        Args:
            days_back: Number of days to look back
            site_id: Optional site ID to filter by
            
        Returns:
            CostSummary: Summary of costs
        """
        try:
            start_date = datetime.utcnow() - timedelta(days=days_back)
            
            # Base query
            base_query = """
                SELECT 
                    operation_type,
                    model_used,
                    SUM(cost_usd) as total_cost,
                    COUNT(*) as operation_count,
                    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_ops,
                    AVG(cost_usd) as avg_cost,
                    site_id
                FROM ai_cost_tracking 
                WHERE timestamp >= %s
            """
            
            params = [start_date.isoformat()]
            
            if site_id:
                base_query += " AND site_id = %s"
                params.append(site_id)
            
            base_query += " GROUP BY operation_type, model_used, site_id"
            
            results = await self.db.execute_query(base_query, params)
            
            # Calculate summary
            total_cost = 0.0
            total_operations = 0
            successful_operations = 0
            cost_by_site = {}
            top_operations = []
            
            for result in results:
                cost = float(result.get('total_cost', 0))
                ops = int(result.get('operation_count', 0))
                successful = int(result.get('successful_ops', 0))
                site = result.get('site_id')
                
                total_cost += cost
                total_operations += ops
                successful_operations += successful
                
                if site:
                    cost_by_site[site] = cost_by_site.get(site, 0) + cost
                
                top_operations.append({
                    'operation_type': result.get('operation_type'),
                    'model': result.get('model_used'),
                    'cost': cost,
                    'operations': ops,
                    'avg_cost': float(result.get('avg_cost', 0))
                })
            
            # Sort top operations by cost
            top_operations.sort(key=lambda x: x['cost'], reverse=True)
            
            return CostSummary(
                total_cost=total_cost,
                total_operations=total_operations,
                successful_operations=successful_operations,
                failed_operations=total_operations - successful_operations,
                average_cost_per_operation=total_cost / max(1, total_operations),
                top_operations=top_operations[:10],  # Top 10
                cost_by_site=cost_by_site
            )
            
        except Exception as e:
            logger.error(f"Error getting cost summary: {e}")
            return CostSummary(
                total_cost=0.0,
                total_operations=0,
                successful_operations=0,
                failed_operations=0,
                average_cost_per_operation=0.0,
                top_operations=[],
                cost_by_site={}
            )

    async def create_budget_alert(self, message: str, cost_data: Dict) -> bool:
        """
        Create a budget alert when limits are exceeded
        
        Args:
            message: Alert message
            cost_data: Cost data that triggered the alert
            
        Returns:
            bool: Success status
        """
        try:
            query = """
                INSERT INTO budget_alerts 
                (alert_message, cost_data, created_at, alert_type, status)
                VALUES (%s, %s, %s, %s, %s)
            """
            params = (
                message,
                str(cost_data),  # Convert dict to string for storage
                datetime.utcnow().isoformat(),
                'budget_exceeded',
                'active'
            )
            
            await self.db.execute_query(query, params)
            logger.warning(f"Budget alert created: {message}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating budget alert: {e}")
            return False

    async def track_discovery_cost(self, scan_id: str, site_id: str, url: str, 
                                 model: str, tokens: int, success: bool = True) -> float:
        """
        Convenience method to track discovery operation costs
        
        Args:
            scan_id: Scan log ID
            site_id: Site ID
            url: URL processed
            model: AI model used
            tokens: Tokens consumed
            success: Whether operation was successful
            
        Returns:
            float: Cost tracked
        """
        cost = await self.calculate_cost(model, tokens, 'discovery')
        
        cost_entry = CostEntry(
            operation_type='discovery',
            model_used=model,
            tokens_used=tokens,
            cost_usd=cost,
            timestamp=datetime.utcnow(),
            site_id=site_id,
            scan_id=scan_id,
            url=url,
            success=success
        )
        
        await self.track_cost(cost_entry)
        return cost

    async def track_extraction_cost(self, machine_id: str, url: str, 
                                  model: str, tokens: int, success: bool = True) -> float:
        """
        Convenience method to track price extraction costs
        
        Args:
            machine_id: Machine ID
            url: URL processed
            model: AI model used
            tokens: Tokens consumed
            success: Whether operation was successful
            
        Returns:
            float: Cost tracked
        """
        cost = await self.calculate_cost(model, tokens, 'extraction')
        
        cost_entry = CostEntry(
            operation_type='extraction',
            model_used=model,
            tokens_used=tokens,
            cost_usd=cost,
            timestamp=datetime.utcnow(),
            site_id=machine_id,  # Use machine_id as identifier
            url=url,
            success=success
        )
        
        await self.track_cost(cost_entry)
        return cost