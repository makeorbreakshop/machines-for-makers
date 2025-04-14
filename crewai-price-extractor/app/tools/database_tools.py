from langchain.tools import tool
from typing import Dict, Any, List, Optional
from supabase import create_client
import os
from datetime import datetime
from ..config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

class DatabaseTool:
    """Tool for interacting with the Supabase database."""
    
    @tool("save_price")
    def save_price(
        self, 
        machine_id: str, 
        price: float,
        source_url: str,
        currency: str = "USD",
        extraction_method: str = "crew_ai"
    ) -> Dict[str, Any]:
        """
        Saves a price record to the price_history table.
        
        Args:
            machine_id: The ID of the machine
            price: The price value
            source_url: The URL the price was scraped from
            currency: The currency code (default: USD)
            extraction_method: The method used to extract the price
            
        Returns:
            A dictionary indicating success or failure
        """
        try:
            # Sanity check the price
            if price <= 0:
                return {
                    "success": False,
                    "error": f"Invalid price: {price}. Must be greater than 0."
                }
            
            # Get machine company name
            machine_response = supabase.table("machines").select(
                "\"Company\""
            ).eq("id", machine_id).execute()
            
            if not machine_response.data:
                return {
                    "success": False,
                    "error": f"Machine with ID {machine_id} not found."
                }
            
            company = machine_response.data[0].get("Company", "Unknown")
            
            # Insert the price record
            insert_response = supabase.table("price_history").insert({
                "machine_id": machine_id,
                "price": price,
                "scraped_from_url": source_url,
                "source": company,
                "currency": currency,
                "extraction_method": extraction_method
            }).execute()
            
            if len(insert_response.data) == 0:
                return {
                    "success": False,
                    "error": "Failed to insert price record."
                }
            
            # Update price extremes
            self._update_price_extremes(machine_id)
            
            return {
                "success": True,
                "record_id": insert_response.data[0]["id"],
                "message": f"Saved price {price} {currency} for machine {machine_id}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error saving price: {str(e)}"
            }
    
    @tool("get_price_history")
    def get_price_history(
        self, 
        machine_id: str,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Gets historical price records for a machine.
        
        Args:
            machine_id: The ID of the machine
            limit: Maximum number of records to return
            
        Returns:
            A dictionary containing price history
        """
        try:
            response = supabase.table("price_history").select(
                "*"
            ).eq("machine_id", machine_id).order("date", {"ascending": False}).limit(limit).execute()
            
            if not response.data:
                return {
                    "success": True,
                    "machine_id": machine_id,
                    "history": [],
                    "message": "No price history found for this machine."
                }
            
            return {
                "success": True,
                "machine_id": machine_id,
                "history": response.data,
                "count": len(response.data)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error retrieving price history: {str(e)}"
            }
    
    @tool("validate_price")
    def validate_price(
        self, 
        machine_id: str,
        price: float,
        currency: str = "USD"
    ) -> Dict[str, Any]:
        """
        Validates a price against historical data.
        
        Args:
            machine_id: The ID of the machine
            price: The price to validate
            currency: The currency code
            
        Returns:
            A dictionary with validation results
        """
        try:
            # Get historical prices
            history_response = supabase.table("price_history").select(
                "price"
            ).eq("machine_id", machine_id).eq("currency", currency).execute()
            
            if not history_response.data:
                return {
                    "valid": True,
                    "confidence": 0.5,
                    "message": "No history to compare against. Consider valid."
                }
            
            # Extract prices
            prices = [record["price"] for record in history_response.data]
            
            # Get statistics
            avg_price = sum(prices) / len(prices)
            max_price = max(prices)
            min_price = min(prices)
            
            # Calculate percentage difference from average
            if avg_price > 0:
                percent_diff = abs((price - avg_price) / avg_price) * 100
            else:
                percent_diff = 100
            
            # Determine if price is valid based on historical range
            if price <= 0:
                return {
                    "valid": False,
                    "confidence": 0.9,
                    "message": f"Price {price} {currency} is invalid (must be > 0)."
                }
            
            # If price is dramatically different from history, flag it
            if percent_diff > 50 and len(prices) >= 3:
                if price < min_price * 0.5:
                    return {
                        "valid": False,
                        "confidence": 0.8,
                        "message": f"Price {price} {currency} is suspiciously low compared to history (min: {min_price})."
                    }
                
                if price > max_price * 1.5:
                    return {
                        "valid": False,
                        "confidence": 0.7,
                        "message": f"Price {price} {currency} is suspiciously high compared to history (max: {max_price})."
                    }
            
            return {
                "valid": True,
                "confidence": 0.9,
                "message": f"Price {price} {currency} is within reasonable range of historical prices.",
                "avg_price": avg_price,
                "min_price": min_price,
                "max_price": max_price,
                "percent_diff": percent_diff
            }
            
        except Exception as e:
            return {
                "valid": False,
                "confidence": 0.1,
                "error": f"Error validating price: {str(e)}"
            }
    
    def _update_price_extremes(self, machine_id: str) -> None:
        """Update all-time high and low price flags"""
        try:
            # Get all price history
            response = supabase.table("price_history").select(
                "id, price"
            ).eq("machine_id", machine_id).order("price").execute()
            
            if not response.data or len(response.data) <= 1:
                return
            
            # Filter out unrealistically low prices
            valid_prices = [record for record in response.data if record["price"] >= 10]
            
            if not valid_prices:
                return
            
            # Reset all flags first
            supabase.table("price_history").update({
                "is_all_time_low": False,
                "is_all_time_high": False
            }).eq("machine_id", machine_id).execute()
            
            # Set new extremes
            lowest = valid_prices[0]
            highest = valid_prices[-1]
            
            supabase.table("price_history").update({
                "is_all_time_low": True
            }).eq("id", lowest["id"]).execute()
            
            supabase.table("price_history").update({
                "is_all_time_high": True
            }).eq("id", highest["id"]).execute()
            
        except Exception as e:
            print(f"Error updating price extremes: {str(e)}") 