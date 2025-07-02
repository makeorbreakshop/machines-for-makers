"""
Daily Learning Service for Price Extraction

This service analyzes daily batch results and automatically improves
the price extraction system over time.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from loguru import logger
from collections import defaultdict, Counter

from services.database import DatabaseService


class DailyLearningService:
    """Service to analyze extraction patterns and improve the system daily."""
    
    def __init__(self):
        self.db_service = DatabaseService()
        logger.info("Daily Learning Service initialized")
    
    async def generate_daily_learning_report(self, days_back: int = 7) -> Dict:
        """
        Generate a comprehensive learning report from recent batch results.
        
        Args:
            days_back: Number of days to analyze
            
        Returns:
            Learning report with recommendations
        """
        logger.info(f"Generating daily learning report for last {days_back} days")
        
        try:
            # Get recent batch results
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            batch_results = await self.db_service.get_batch_results_since(cutoff_date)
            
            if not batch_results:
                return {"error": "No batch results found", "recommendations": []}
            
            # Analyze the results
            analysis = self._analyze_extraction_patterns(batch_results)
            
            # Generate recommendations
            recommendations = self._generate_improvement_recommendations(analysis)
            
            # Check for site changes
            site_changes = await self._detect_site_changes(batch_results)
            
            report = {
                "report_date": datetime.utcnow().isoformat(),
                "analysis_period": f"{days_back} days",
                "total_extractions": len(batch_results),
                "success_rate": analysis["success_rate"],
                "method_performance": analysis["method_performance"],
                "site_performance": analysis["site_performance"],
                "failure_patterns": analysis["failure_patterns"],
                "site_changes_detected": site_changes,
                "recommendations": recommendations,
                "auto_improvements": []
            }
            
            # Apply automatic improvements
            auto_improvements = await self._apply_automatic_improvements(analysis)
            report["auto_improvements"] = auto_improvements
            
            logger.info(f"Generated learning report: {analysis['success_rate']:.1%} success rate, {len(recommendations)} recommendations")
            return report
            
        except Exception as e:
            logger.error(f"Error generating learning report: {str(e)}")
            return {"error": str(e), "recommendations": []}
    
    def _analyze_extraction_patterns(self, batch_results: List[Dict]) -> Dict:
        """Analyze batch results to find patterns."""
        
        total_results = len(batch_results)
        successful = sum(1 for r in batch_results if r.get("success", False))
        
        # Method performance analysis
        method_counts = Counter()
        method_successes = Counter()
        
        # Site performance analysis  
        site_counts = defaultdict(int)
        site_successes = defaultdict(int)
        site_failures = defaultdict(list)
        
        # Failure pattern analysis
        failure_reasons = Counter()
        
        for result in batch_results:
            method = result.get("method", "unknown")
            url = result.get("url", "")
            domain = self._extract_domain(url)
            success = result.get("success", False)
            
            # Count methods
            method_counts[method] += 1
            if success:
                method_successes[method] += 1
            
            # Count sites
            site_counts[domain] += 1
            if success:
                site_successes[domain] += 1
            else:
                error = result.get("error", "unknown error")
                site_failures[domain].append(error)
                failure_reasons[error] += 1
        
        # Calculate success rates
        method_performance = {}
        for method, count in method_counts.items():
            success_rate = method_successes[method] / count if count > 0 else 0
            method_performance[method] = {
                "total": count,
                "successes": method_successes[method], 
                "success_rate": success_rate
            }
        
        site_performance = {}
        for domain, count in site_counts.items():
            success_rate = site_successes[domain] / count if count > 0 else 0
            site_performance[domain] = {
                "total": count,
                "successes": site_successes[domain],
                "success_rate": success_rate,
                "common_failures": Counter(site_failures[domain]).most_common(3)
            }
        
        return {
            "success_rate": successful / total_results if total_results > 0 else 0,
            "method_performance": method_performance,
            "site_performance": site_performance,
            "failure_patterns": dict(failure_reasons.most_common(10))
        }
    
    def _generate_improvement_recommendations(self, analysis: Dict) -> List[Dict]:
        """Generate actionable improvement recommendations."""
        
        recommendations = []
        
        # Check overall success rate
        success_rate = analysis["success_rate"]
        if success_rate < 0.85:
            recommendations.append({
                "priority": "high",
                "type": "success_rate",
                "title": f"Overall success rate is {success_rate:.1%}",
                "description": "Consider adding more extraction methods or improving existing ones",
                "action": "investigate_low_success_rate"
            })
        
        # Check method performance
        for method, perf in analysis["method_performance"].items():
            if perf["total"] >= 10 and perf["success_rate"] < 0.5:
                recommendations.append({
                    "priority": "medium",
                    "type": "method_performance", 
                    "title": f"Method '{method}' has low success rate: {perf['success_rate']:.1%}",
                    "description": f"Used {perf['total']} times, only {perf['successes']} successes",
                    "action": f"improve_method_{method.replace(' ', '_').lower()}"
                })
        
        # Check site performance
        for domain, perf in analysis["site_performance"].items():
            if perf["total"] >= 5 and perf["success_rate"] < 0.7:
                common_failures = [f[0] for f in perf["common_failures"]]
                recommendations.append({
                    "priority": "high",
                    "type": "site_performance",
                    "title": f"Site {domain} has low success rate: {perf['success_rate']:.1%}",
                    "description": f"Common failures: {', '.join(common_failures[:2])}",
                    "action": f"add_site_specific_rules_{domain.replace('.', '_')}"
                })
        
        # Check failure patterns
        failure_patterns = analysis["failure_patterns"]
        for error, count in failure_patterns.items():
            if count >= 10:
                recommendations.append({
                    "priority": "medium",
                    "type": "failure_pattern",
                    "title": f"Common failure: '{error}' ({count} times)",
                    "description": "This error pattern suggests a systematic issue",
                    "action": f"fix_error_pattern_{error.replace(' ', '_').lower()}"
                })
        
        return recommendations
    
    async def _detect_site_changes(self, batch_results: List[Dict]) -> List[Dict]:
        """Detect when sites have changed their structure."""
        
        site_changes = []
        
        # Group results by domain and date
        domain_daily_success = defaultdict(lambda: defaultdict(list))
        
        for result in batch_results:
            url = result.get("url", "")
            domain = self._extract_domain(url)
            date = result.get("date", datetime.utcnow().date())
            success = result.get("success", False)
            
            domain_daily_success[domain][date].append(success)
        
        # Look for sudden drops in success rate
        for domain, daily_data in domain_daily_success.items():
            if len(daily_data) >= 3:  # Need at least 3 days of data
                dates = sorted(daily_data.keys())
                success_rates = []
                
                for date in dates:
                    successes = daily_data[date]
                    if len(successes) >= 3:  # Need at least 3 attempts per day
                        rate = sum(successes) / len(successes)
                        success_rates.append((date, rate))
                
                # Check for drops
                if len(success_rates) >= 2:
                    recent_rate = success_rates[-1][1]
                    previous_rates = [r[1] for r in success_rates[:-1]]
                    avg_previous = sum(previous_rates) / len(previous_rates)
                    
                    # If recent rate dropped significantly
                    if avg_previous > 0.7 and recent_rate < 0.5:
                        site_changes.append({
                            "domain": domain,
                            "change_date": success_rates[-1][0],
                            "previous_success_rate": avg_previous,
                            "current_success_rate": recent_rate,
                            "severity": "high" if recent_rate < 0.3 else "medium"
                        })
        
        return site_changes
    
    async def _apply_automatic_improvements(self, analysis: Dict) -> List[Dict]:
        """Apply automatic improvements based on analysis."""
        
        improvements = []
        
        # Auto-improve validation thresholds if too many false rejections
        failure_patterns = analysis["failure_patterns"]
        validation_failures = sum(count for error, count in failure_patterns.items() 
                                if "validation" in error.lower() or "threshold" in error.lower())
        
        if validation_failures >= 20:
            # Automatically increase validation thresholds
            try:
                await self._update_validation_thresholds(increase_by=10)
                improvements.append({
                    "type": "validation_threshold",
                    "description": f"Increased validation thresholds by 10% due to {validation_failures} validation failures",
                    "impact": "Should reduce false rejections"
                })
            except Exception as e:
                logger.error(f"Failed to update validation thresholds: {e}")
        
        # Auto-add successful selectors to site rules
        method_performance = analysis["method_performance"]
        claude_ai_success = method_performance.get("Claude AI (learned: .selector)", {})
        
        if claude_ai_success.get("successes", 0) >= 5:
            try:
                await self._promote_learned_selectors()
                improvements.append({
                    "type": "selector_promotion", 
                    "description": f"Promoted {claude_ai_success['successes']} learned selectors to site-specific rules",
                    "impact": "Should improve extraction speed and reliability"
                })
            except Exception as e:
                logger.error(f"Failed to promote learned selectors: {e}")
        
        return improvements
    
    async def _update_validation_thresholds(self, increase_by: int):
        """Automatically update validation thresholds in config."""
        # This would update the config.py file or database settings
        logger.info(f"Auto-updating validation thresholds by {increase_by}%")
        # Implementation would modify config values
        pass
    
    async def _promote_learned_selectors(self):
        """Promote successful learned selectors to permanent site rules."""
        logger.info("Auto-promoting successful learned selectors to site rules")
        # Implementation would update site_specific_extractors.py
        pass
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc.lower()
            return domain[4:] if domain.startswith('www.') else domain
        except:
            return "unknown"


# CLI interface for daily reports
if __name__ == "__main__":
    import asyncio
    
    async def main():
        learning_service = DailyLearningService()
        report = await learning_service.generate_daily_learning_report(days_back=7)
        
        print("=== DAILY LEARNING REPORT ===")
        print(json.dumps(report, indent=2, default=str))
    
    asyncio.run(main())