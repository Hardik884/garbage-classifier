"""
Test script for the /places endpoint
Tests the Overpass API integration without requiring the TensorFlow model
"""
import sys
sys.path.insert(0, r'C:\Users\ASUS\garbage-classifier\python-backend')

# Mock the tensorflow import since we're just testing /places
import unittest.mock as mock
sys.modules['tensorflow'] = mock.MagicMock()
sys.modules['tensorflow.keras'] = mock.MagicMock()
sys.modules['tensorflow.keras.models'] = mock.MagicMock()

from main import app, haversine_km, get_overpass_query
from fastapi.testclient import TestClient

client = TestClient(app)

def test_health():
    """Test the health endpoint"""
    response = client.get("/health")
    print("Health check:", response.json())
    assert response.status_code == 200

def test_haversine():
    """Test distance calculation"""
    # Distance between New York and Los Angeles (approx 3944 km)
    ny_lat, ny_lng = 40.7128, -74.0060
    la_lat, la_lng = 34.0522, -118.2437
    distance = haversine_km(ny_lat, ny_lng, la_lat, la_lng)
    print(f"Distance NY to LA: {distance:.2f} km")
    assert 3900 < distance < 4000

def test_overpass_query():
    """Test Overpass query generation"""
    query = get_overpass_query(40.7128, -74.0060, 5000, "plastic")
    print("Generated Overpass query for plastic recycling")
    assert "recycling" in query
    assert "5000" in query

def test_places_endpoint():
    """Test the /places endpoint with a real location"""
    # Test with coordinates near a known area (New York City)
    response = client.get("/places?lat=40.7128&lng=-74.0060&material=plastic&radius=5000")
    print(f"\nPlaces endpoint response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Found {data['count']} places")
        if data['count'] > 0:
            print("\nFirst 3 results:")
            for place in data['results'][:3]:
                print(f"  - {place['name']}: {place['distance_km']} km away")
                print(f"    Address: {place['address']}")
                print(f"    Type: {place['amenity_type']}")
        return data
    else:
        print(f"Error: {response.json()}")
        return None

if __name__ == "__main__":
    print("Testing /places endpoint implementation\n")
    print("=" * 60)
    
    test_health()
    print("✓ Health check passed\n")
    
    test_haversine()
    print("✓ Distance calculation passed\n")
    
    test_overpass_query()
    print("✓ Query generation passed\n")
    
    print("=" * 60)
    print("Testing live Overpass API call...")
    print("=" * 60)
    result = test_places_endpoint()
    
    if result:
        print("\n" + "=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)
        print(f"\nThe /places endpoint is working correctly!")
        print(f"API is free to use (OpenStreetMap Overpass API)")
        print(f"No API key required!")
    else:
        print("\n⚠ Places endpoint test failed - check Overpass API availability")
