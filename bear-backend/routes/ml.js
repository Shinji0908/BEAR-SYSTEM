const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authorization");
const axios = require("axios");

// ML Prediction endpoint
router.post("/predict-route-time", authenticateToken, async (req, res) => {
  console.log("✅ /api/ml/predict-route-time HIT");
  console.log("Request body:", req.body);

  try {
    const { distance_km, traffic_congestion, hour, day_of_week, osrm_time_est } = req.body;
    console.log("Parsed values:", distance_km, traffic_congestion, hour, day_of_week);

    // Validate required fields
    if (!distance_km || traffic_congestion === undefined || hour === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: distance_km, traffic_congestion, hour"
      });
    }

    // Prepare data for ML service
    const mlData = {
      distance_km: parseFloat(distance_km),
      traffic_congestion: parseInt(traffic_congestion),
      hour: parseInt(hour),
      day_of_week: parseInt(day_of_week) || new Date().getDay() + 1,
      osrm_time_est: parseFloat(osrm_time_est) || (distance_km * 60) // Default estimate
    };

    // Call ML prediction service
    const mlResponse = await axios.post('http://localhost:5050/predict', mlData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (mlResponse.status === 200) {
      const prediction = mlResponse.data.predicted_duration_sec;
      
      // Format response
      res.json({
        success: true,
        data: {
          predicted_duration_sec: prediction,
          predicted_duration_min: Math.round(prediction / 60 * 100) / 100,
          input_data: mlData,
          timestamp: new Date()
        }
      });
    } else {
      throw new Error('ML service returned invalid response');
    }

  } catch (error) {
    console.error('ML Prediction Error:', error.message);
    
    // Fallback calculation if ML service is down
    const { distance_km } = req.body;
    const fallbackTime = distance_km * 90; // 90 seconds per km fallback
    
    res.status(500).json({
      success: false,
      message: "ML service temporarily unavailable, using fallback calculation",
      fallback_data: {
        predicted_duration_sec: fallbackTime,
        predicted_duration_min: Math.round(fallbackTime / 60 * 100) / 100,
        is_fallback: true
      }
    });
  }
});

// Get current traffic conditions (mock endpoint)
router.get("/traffic-conditions", authenticateToken, async (req, res) => {
  try {
    // This would typically call a real traffic API
    // For now, returning mock data
    const currentHour = new Date().getHours();
    
    let trafficLevel = 1; // Light traffic
    if (currentHour >= 7 && currentHour <= 9) trafficLevel = 4; // Rush hour morning
    else if (currentHour >= 17 && currentHour <= 19) trafficLevel = 4; // Rush hour evening
    else if (currentHour >= 10 && currentHour <= 16) trafficLevel = 2; // Moderate
    else if (currentHour >= 20 || currentHour <= 6) trafficLevel = 1; // Light

    res.json({
      success: true,
      data: {
        current_traffic_level: trafficLevel,
        traffic_description: ["Light", "Moderate", "Heavy", "Very Heavy"][trafficLevel - 1],
        current_hour: currentHour,
        day_of_week: new Date().getDay() + 1,
        last_updated: new Date()
      }
    });
  } catch (error) {
    console.error('Traffic conditions error:', error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch traffic conditions"
    });
  }
});

module.exports = router;
