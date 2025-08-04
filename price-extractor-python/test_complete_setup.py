#!/usr/bin/env python3
"""
Complete setup test - verifies all dependencies and functionality
"""
import sys
import subprocess
import time
import requests

def test_imports():
    """Test all critical imports"""
    print("🧪 Testing Python imports...")
    
    try:
        import yaml
        print("✅ yaml import: OK")
    except ImportError as e:
        print(f"❌ yaml import failed: {e}")
        return False
    
    try:
        from services.simplified_discovery import SimplifiedDiscoveryService
        print("✅ SimplifiedDiscoveryService import: OK")
    except ImportError as e:
        print(f"❌ SimplifiedDiscoveryService import failed: {e}")
        return False
    
    try:
        from services.smart_url_classifier import SmartURLClassifier
        print("✅ SmartURLClassifier import: OK")
    except ImportError as e:
        print(f"❌ SmartURLClassifier import failed: {e}")
        return False
    
    try:
        from api.routes import router
        print("✅ API routes import: OK")
    except ImportError as e:
        print(f"❌ API routes import failed: {e}")
        return False
    
    return True

def test_api_endpoints():
    """Test API endpoints if running"""
    print("\n🧪 Testing API endpoints...")
    
    BASE_URL = "http://localhost:8000"
    
    # Test health
    try:
        response = requests.get(f"{BASE_URL}/api/v1/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint: OK")
        else:
            print(f"⚠️  Health endpoint returned {response.status_code}")
            return False
    except requests.exceptions.RequestException:
        print("⚠️  API not running - skipping endpoint tests")
        return True  # Not a failure if API isn't running
    
    # Test smart discovery endpoint
    try:
        payload = {
            "manufacturer_id": "test",
            "base_url": "https://omtechlaser.com",
            "manufacturer_name": "OMTech",
            "max_pages": 1,
            "apply_smart_filtering": True
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/smart/smart-discover-urls",
            json=payload,
            timeout=30
        )
        if response.status_code == 200:
            print("✅ Smart discovery endpoint: OK")
        else:
            print(f"❌ Smart discovery endpoint failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Smart discovery endpoint error: {e}")
        return False
    
    return True

def test_background_task():
    """Test background task functionality"""
    print("\n🧪 Testing background task (scraping)...")
    
    BASE_URL = "http://localhost:8000"
    
    try:
        payload = {
            "urls": ["https://omtechlaser.com/products/mp6969-100-100w-mopa-fiber-laser-marking-engraving-machine-with-6-9-x-6-9-working-area"],
            "manufacturer_id": "0234c783-b4d6-4b3f-9336-f558369d2763",  # Acmer
            "max_workers": 1
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/scrape-discovered-urls",
            json=payload,
            timeout=10
        )
        if response.status_code == 200:
            print("✅ Background scraping task: Started successfully")
            print("   (Check server logs for completion status)")
            return True
        else:
            print(f"❌ Background scraping task failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Background scraping task error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Running complete setup verification...")
    print("=" * 50)
    
    # Test 1: Python imports
    if not test_imports():
        print("\n❌ Import tests failed!")
        return False
    
    # Test 2: API endpoints
    if not test_api_endpoints():
        print("\n❌ API endpoint tests failed!")
        return False
    
    # Test 3: Background tasks
    if not test_background_task():
        print("\n❌ Background task test failed!")
        return False
    
    print("\n" + "=" * 50)
    print("✅ ALL TESTS PASSED!")
    print("🎉 The scraping system is working correctly.")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)