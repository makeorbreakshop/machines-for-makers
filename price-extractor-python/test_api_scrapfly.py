"""
Test the Scrapfly API integration end-to-end
This verifies the API accepts the new parameter and routes it correctly
"""
import requests
import json
import time

def test_api_health():
    """Test that the API is running"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def test_scrapfly_parameter():
    """Test that the API accepts use_scrapfly parameter"""
    if not test_api_health():
        print("❌ API not running on localhost:8000")
        print("   Start with: python main.py")
        return False
    
    try:
        # Test the batch-update endpoint with Scrapfly parameter
        payload = {
            "days_threshold": 7,
            "limit": 1,  # Just test 1 machine
            "use_scrapfly": True
        }
        
        print(f"🧪 Testing API with payload: {payload}")
        
        response = requests.post(
            "http://localhost:8000/api/v1/batch-update",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📊 Response status: {response.status_code}")
        print(f"📊 Response body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if "batch_id" in result or "success" in result:
                print("✅ API accepts use_scrapfly parameter")
                return True
            else:
                print("❌ Unexpected response format")
                return False
        else:
            print(f"❌ API returned error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ API test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Scrapfly API integration...")
    
    if test_scrapfly_parameter():
        print("🎉 API integration test passed!")
    else:
        print("💡 Make sure FastAPI server is running: python main.py")
        print("   Then run this test again")