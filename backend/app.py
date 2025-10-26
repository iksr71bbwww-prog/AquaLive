from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
import logging
from typing import Optional
import json
import os

# --------------------------------------------------
# Configure logging
# --------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------------------------------
# Initialize FastAPI app
# --------------------------------------------------
app = FastAPI(title="Groundwater Prediction API", version="1.0.0")

# --------------------------------------------------
# Load ML models and preprocessing objects
# --------------------------------------------------
try:
    # Load all required models and objects
    scaler = joblib.load("saved_models/scaler_1.joblib")
    best_xgb = joblib.load("saved_models/xgb_model_1.joblib")
    stacking_model = joblib.load("saved_models/stacking_model_1.joblib")
    residual_model = joblib.load("saved_models/residual_model_1.joblib")
    
    # Load ensemble weights
    with open("saved_models/ensemble_weights_1.json", 'r') as f:
        ensemble_weights = json.load(f)
    
    # Load metadata to get feature information
    with open("saved_models/training_metadata_1.json", 'r') as f:
        training_metadata = json.load(f)
    
    logger.info("✅ All models loaded successfully")
    
except FileNotFoundError as e:
    logger.error(f"❌ Model file not found: {e}")
    raise RuntimeError(f"Could not load model files: {e}")
except Exception as e:
    logger.error(f"❌ Error loading models: {e}")
    raise RuntimeError(f"Failed to load models: {e}")

# Global variables from training
year_min = 1994  # Replace with actual min year from your data
year_max = 2024  # Replace with actual max year from your data
features = training_metadata['features']

# Precomputed mean values from your training data
spatial_lag_mean = 12.5  # Replace with actual mean from your training
prev_measurement_mean = 11.8  # Replace with actual mean from your training
prev_year_measurement_mean = 12.1  # Replace with actual mean from your training

# --------------------------------------------------
# Enable CORS (for React Native app)
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Pydantic Models for Input/Output
# --------------------------------------------------
class PredictionInput(BaseModel):
    latitude: float
    longitude: float
    date: str  # YYYY-MM-DD format

    @validator("latitude")
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @validator("longitude")
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        return v

    @validator("date")
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format")
        return v

class PredictionOutput(BaseModel):
    prediction: float
    confidence: Optional[float] = None
    units: str = "meters below ground level"

# --------------------------------------------------
# Utility Functions
# --------------------------------------------------
def prepare_features(latitude: float, longitude: float, date_str: str):
    """Prepare all 65 features from just lat, long, and date"""
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    
    # Extract date components
    day = date_obj.day
    month = date_obj.month
    year = date_obj.year
    day_of_year = date_obj.timetuple().tm_yday
    
    # Create cyclical features
    doy_sin = np.sin(2 * np.pi * day_of_year/365)
    doy_cos = np.cos(2 * np.pi * day_of_year/365)
    month_sin = np.sin(2 * np.pi * month/12)
    month_cos = np.cos(2 * np.pi * month/12)
    year_sin = np.sin(2 * np.pi * (year - year_min) / (year_max - year_min))
    year_cos = np.cos(2 * np.pi * (year - year_min) / (year_max - year_min))
    
    # Seasonal features
    is_summer = 1 if month in [4, 5, 6] else 0
    is_winter = 1 if month in [11, 12, 1] else 0
    is_spring = 1 if month in [2, 3] else 0
    
    # Use precomputed mean values for features that require historical data
    spatial_lag_est = spatial_lag_mean
    prev_measurement_est = prev_measurement_mean
    prev_year_measurement_est = prev_year_measurement_mean
    
    # Simple cluster assignment based on coordinates
    cluster_features = [0] * 50
    cluster_idx = int((abs(latitude) + abs(longitude)) % 50)
    cluster_features[cluster_idx] = 1
    
    # Create the full feature array in the exact order used during training
    feature_values = [
        latitude, longitude, doy_sin, doy_cos, month_sin, month_cos, 
        year, year_sin, year_cos, is_summer, is_winter, is_spring,
        spatial_lag_est, prev_measurement_est, prev_year_measurement_est
    ] + cluster_features
    
    return np.array([feature_values])

def weighted_ensemble_predictions(xgb_pred, stacking_pred, weights):
    """Combine predictions using optimized weights"""
    return weights[0] * xgb_pred + weights[1] * stacking_pred

# --------------------------------------------------
# API Routes
# --------------------------------------------------
@app.post("/predict", response_model=PredictionOutput)
async def predict(input_data: PredictionInput):
    """
    Predict groundwater level from latitude, longitude, and date only
    """
    try:
        logger.info(f"Received prediction request: {input_data}")
        
        # Prepare all 65 features from the 3 input values
        features_array = prepare_features(
            input_data.latitude, 
            input_data.longitude, 
            input_data.date
        )
        
        # Scale the features
        features_scaled = scaler.transform(features_array)
        
        # Get predictions from base models
        xgb_pred = best_xgb.predict(features_scaled)[0]
        stacking_pred = stacking_model.predict(features_scaled)[0]
        
        # Combine predictions using optimized weights
        ensemble_pred = weighted_ensemble_predictions(
            xgb_pred, 
            stacking_pred, 
            [ensemble_weights['xgb_weight'], ensemble_weights['stacking_weight']]
        )
        
        # Apply residual correction
        residual_pred = residual_model.predict(features_scaled)[0]
        final_prediction = ensemble_pred + residual_pred

        # Calculate confidence (simple heuristic based on prediction range)
        confidence = max(0.7, 1.0 - abs(final_prediction - 10) / 20)

        logger.info(f"Prediction completed: {final_prediction:.2f} meters")
        
        return PredictionOutput(
            prediction=float(final_prediction),
            confidence=float(confidence),
            units="meters below ground level"
        )

    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": True,
        "model_performance": {
            "r2_score": float(training_metadata['calibrated_r2']),
            "rmse": float(training_metadata['calibrated_rmse'])
        }
    }


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Groundwater Prediction API",
        "version": "1.0.0",
        "input_required": ["latitude", "longitude", "date (YYYY-MM-DD)"],
        "output": "predicted_water_level (meters below ground)",
        "endpoint": "POST /predict"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)