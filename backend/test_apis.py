import requests
import json

# Test all API endpoints
base_url = "http://localhost:5000/api"

def test_api(endpoint, method="GET", data=None):
    """Test an API endpoint"""
    url = f"{base_url}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        
        print(f"✅ {method} {endpoint}")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
        else:
            print(f"   Error: {response.text}")
        print()
        return response.status_code == 200
    except Exception as e:
        print(f"❌ {method} {endpoint}")
        print(f"   Error: {str(e)}")
        print()
        return False

def main():
    print("🧪 Testing Divine Energy Hub API Endpoints")
    print("=" * 50)
    
    # Test health endpoint
    test_api("/health")
    
    # Test user endpoints
    test_api("/user/search?firstName=John&phoneNumber=1234567890")
    test_api("/user/token/test123")
    
    # Test user creation
    user_data = {
        "firstName": "Test",
        "lastName": "User",
        "phoneNumber": "1234567890",
        "email": "test@example.com"
    }
    test_api("/users", "POST", user_data)
    
    # Test prasad endpoints
    test_api("/prasad/status?token=test123")
    
    prasad_data = {
        "token": "test123",
        "prasadType": "lunch"
    }
    test_api("/prasad/update", "POST", prasad_data)
    test_api("/prasad/entry", "POST", prasad_data)
    
    # Test sheet update
    test_api("/update-sheet", "POST")
    
    print("🎉 API Testing Complete!")

if __name__ == "__main__":
    main()
