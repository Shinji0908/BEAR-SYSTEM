from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)
model = joblib.load('models/route_time_predictor.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    distance = data.get('distance_km')
    traffic = data.get('traffic_congestion')
    hour = data.get('hour')
    day_of_week = data.get('day_of_week', 1)  # Default to Monday if not provided
    osrm_time_est = data.get('osrm_time_est', distance * 60)  # Rough estimate if not provided

    features = np.array([[distance, hour, day_of_week, traffic, osrm_time_est]])
    prediction = model.predict(features)[0]

    return jsonify({
        'predicted_duration_sec': round(prediction, 2),
        'message': 'Prediction successful'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)
