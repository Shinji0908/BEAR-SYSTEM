import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from datetime import datetime

# Load your MongoDB export
df = pd.read_csv("data/route_history.csv")

X = df[["distance_km", "hour", "day_of_week", "traffic_congestion", "osrm_time_est"]]
y = df["actual_time"]

model = RandomForestRegressor(n_estimators=100)
model.fit(X, y)

# Save model
import joblib
import os
os.makedirs("models", exist_ok=True)
joblib.dump(model, "models/route_time_predictor.pkl")
print(f"[{datetime.now()}] Model trained and saved successfully.")