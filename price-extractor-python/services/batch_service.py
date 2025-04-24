from typing import List, Dict, Any

class BatchService:
    async def analyze_extraction_results(self, batch_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze batch extraction results to identify patterns in validation failures.
        
        Args:
            batch_results: List of extraction results from a batch run
            
        Returns:
            Dict with analysis results
        """
        analysis = {
            "total_extractions": len(batch_results),
            "successful_extractions": 0,
            "failed_extractions": 0,
            "validation_failures": 0,
            "problems_by_vendor": {},
            "extreme_price_changes": [],
            "common_error_patterns": {},
            "vendors_with_issues": set()
        }
        
        for result in batch_results:
            if result.get("success", False):
                analysis["successful_extractions"] += 1
                
                # Check for extreme price changes
                if result.get("percentage_change") and abs(result.get("percentage_change", 0)) > 50:
                    company = result.get("extraction_details", {}).get("company", "unknown")
                    analysis["extreme_price_changes"].append({
                        "machine_id": result.get("machine_id"),
                        "machine_name": result.get("extraction_details", {}).get("machine_name", "Unknown"),
                        "company": company,
                        "old_price": result.get("old_price"),
                        "new_price": result.get("new_price"),
                        "percentage_change": result.get("percentage_change"),
                        "extraction_method": result.get("method"),
                        "url": result.get("extraction_details", {}).get("url")
                    })
                    
                    # Record vendor with issues
                    if company:
                        analysis["vendors_with_issues"].add(company)
                        
                        # Count problems by vendor
                        if company not in analysis["problems_by_vendor"]:
                            analysis["problems_by_vendor"][company] = {
                                "extreme_price_changes": 0,
                                "invalid_formats": 0,
                                "validation_failures": 0
                            }
                        analysis["problems_by_vendor"][company]["extreme_price_changes"] += 1
            else:
                analysis["failed_extractions"] += 1
                
                # Analyze error patterns
                error = result.get("error", "unknown_error")
                if "validation failed" in error.lower():
                    analysis["validation_failures"] += 1
                    
                    # Extract company from URL if available
                    url = result.get("url", "")
                    company = "unknown"
                    for vendor in ["algolaser", "atomstack", "aeon", "omtech", "cloudray", "commarker", "gweike", "creality"]:
                        if vendor in url:
                            company = vendor
                            break
                    
                    # Count validation failures by vendor
                    if company not in analysis["problems_by_vendor"]:
                        analysis["problems_by_vendor"][company] = {
                            "extreme_price_changes": 0,
                            "invalid_formats": 0,
                            "validation_failures": 0
                        }
                    analysis["problems_by_vendor"][company]["validation_failures"] += 1
                    
                    # Record vendor with issues
                    analysis["vendors_with_issues"].add(company)
                
                # Count common error patterns
                if error not in analysis["common_error_patterns"]:
                    analysis["common_error_patterns"][error] = 0
                analysis["common_error_patterns"][error] += 1
        
        # Convert set to list for JSON serialization
        analysis["vendors_with_issues"] = list(analysis["vendors_with_issues"])
        
        # Sort problems by vendor by total issues
        vendors_sorted = []
        for vendor, counts in analysis["problems_by_vendor"].items():
            total = sum(counts.values())
            vendors_sorted.append((vendor, total, counts))
        
        vendors_sorted.sort(key=lambda x: x[1], reverse=True)
        
        # Convert to dictionary
        sorted_problems = {}
        for vendor, total, counts in vendors_sorted:
            sorted_problems[vendor] = {
                "total_issues": total,
                **counts
            }
        
        analysis["problems_by_vendor"] = sorted_problems
        
        return analysis 