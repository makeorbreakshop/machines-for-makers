import asyncio
from services.database_service import DatabaseService

async def update_config():
    try:
        db = DatabaseService()
        
        # Update the config for Glowforge Pro HD
        machine_id = 'b78b8088-9577-4047-a975-32472998e3e4'
        variant = 'DEFAULT'
        domain = 'glowforge.com'
        
        # Expanded list of price selectors that should catch more price elements
        css_selector = (
            '.price, [data-price], .product-price, #price, [id*="price"], '
            '[class*="price"], h2:contains("$"), .prd-price, .prodPrice, '
            '.price-container, .price-box, #product-price-box'
        )
        
        # Use supabase client directly to update record
        response = db.supabase.table("variant_extraction_config").update({
            "css_price_selector": css_selector
        }).eq("machine_id", machine_id).eq("variant_attribute", variant).eq("domain", domain).execute()
        
        print(f"Updated configuration for Glowforge Pro HD with new CSS selectors")
        print(f"Response: {response}")
        
    except Exception as e:
        print(f"Error updating configuration: {e}")

if __name__ == "__main__":
    asyncio.run(update_config()) 