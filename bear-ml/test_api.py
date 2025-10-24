import urllib.request
import json

# Test data
test_data = {
    "distance_km": 5.0,
    "traffic_congestion": 3,
    "hour": 14,
    "day_of_week": 3,
    "osrm_time_est": 500
}

try:
    # Convert data to JSON
    json_data = json.dumps(test_data).encode('utf-8')
    
    # Create request
    req = urllib.request.Request(
        'http://localhost:5050/predict',
        data=json_data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    # Make request
    with urllib.request.urlopen(req, timeout=5) as response:
        result = json.loads(response.read().decode('utf-8'))
        print("✅ ML Service Working!")
        print(f"Prediction: {result['predicted_duration_sec']} seconds")
        print(f"Message: {result['message']}")
        
except urllib.error.URLError as e:
    print("❌ Could not connect to ML service")
    print("Make sure the prediction service is running on port 5050")
    print(f"Error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
