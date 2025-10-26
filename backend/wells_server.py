from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
from typing import List, Dict, Any
from pymongo import MongoClient
import random
import math
from datetime import datetime, timedelta

# --------------------------------------------------
# Configure logging
# --------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------------------------------
# Initialize FastAPI app
# --------------------------------------------------
app = FastAPI(title="Groundwater Wells API", version="1.0.0")

# --------------------------------------------------
# MongoDB connection
# --------------------------------------------------
try:
    # Connect to MongoDB with a timeout
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=5000)
    # Test the connection
    client.admin.command('ping')
    db = client.groundwaterDB
    wells_collection = db.wells
    
    logger.info("✅ Connected to MongoDB successfully")
    
    # Check collection stats
    total_docs = wells_collection.count_documents({})
    logger.info(f"📊 Found {total_docs:,} documents in wells collection")
    
except Exception as e:
    logger.error(f"❌ MongoDB connection failed: {e}")
    logger.info("🔄 Continuing without MongoDB - will provide sample data")
    client = None
    db = None
    wells_collection = None

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
# Wells Data Endpoints
# --------------------------------------------------

@app.get("/wells")
async def get_wells():
    """Get unique wells locations from MongoDB (optimized for large dataset)"""
    try:
        if wells_collection is not None:
            logger.info("📊 Fetching unique well locations from MongoDB...")
            
            # Optimized aggregation pipeline for large dataset
            pipeline = [
                {
                    "$group": {
                        "_id": {
                            "lat": "$LATITUDE", 
                            "lng": "$LONGITUDE"
                        },
                        "count": {"$sum": 1},
                        "avg_dtwl": {"$avg": "$DTWL"},
                        "min_dtwl": {"$min": "$DTWL"},
                        "max_dtwl": {"$max": "$DTWL"},
                        "latest_date": {"$max": "$Date"},
                        "earliest_date": {"$min": "$Date"}
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "lat": "$_id.lat",
                        "long": "$_id.lng", 
                        "waterlevel": "$avg_dtwl",
                        "date": "$latest_date",
                        "count": "$count",
                        "min_waterlevel": "$min_dtwl",
                        "max_waterlevel": "$max_dtwl",
                        "date_range": {
                            "$concat": ["$earliest_date", " to ", "$latest_date"]
                        }
                    }
                },
                {"$limit": 5000}  # Limit for mobile performance
            ]
            
            wells_data = list(wells_collection.aggregate(pipeline))
            
            if wells_data:
                total_records = wells_collection.count_documents({})
                logger.info(f"✅ Retrieved {len(wells_data)} unique well locations from {total_records:,} total records")
                return {
                    "success": True,
                    "count": len(wells_data),
                    "total_records": total_records,
                    "data": wells_data,
                    "source": "mongodb_aggregated"
                }
        
        # Fallback to sample data
        logger.info("📊 Providing sample wells data")
        sample_wells_data = generate_sample_wells_data()
        
        return {
            "success": True,
            "count": len(sample_wells_data),
            "data": sample_wells_data,
            "source": "sample_data"
        }
        
    except Exception as e:
        logger.error(f"❌ Error in wells endpoint: {e}")
        # Fallback to sample data on any error
        logger.info("🔄 Falling back to sample data due to error")
        sample_wells_data = generate_sample_wells_data()
        
        return {
            "success": True,
            "count": len(sample_wells_data),
            "data": sample_wells_data,
            "source": "sample_data_fallback"
        }

@app.get("/well-details/{lat}/{lng}")
async def get_well_details(lat: float, lng: float):
    """Get detailed time series data for a specific well location"""
    try:
        if wells_collection is None:
            raise HTTPException(status_code=503, detail="MongoDB connection not available")
        
        # Find all records for this specific location (with small tolerance for floating point)
        tolerance = 0.001  # ~100 meters tolerance
        query = {
            "LATITUDE": {"$gte": lat - tolerance, "$lte": lat + tolerance},
            "LONGITUDE": {"$gte": lng - tolerance, "$lte": lng + tolerance}
        }
        
        # Get time series data sorted by date
        well_records = list(wells_collection.find(
            query, 
            {"_id": 0, "LATITUDE": 1, "LONGITUDE": 1, "Date": 1, "DTWL": 1}
        ).sort("Date", 1).limit(365))  # Limit to 1 year of data for performance
        
        if not well_records:
            raise HTTPException(status_code=404, detail="No data found for this location")
        
        # Process data for visualization
        processed_data = []
        for record in well_records:
            processed_data.append({
                "date": record["Date"],
                "waterlevel": record["DTWL"],
                "lat": record["LATITUDE"],
                "long": record["LONGITUDE"]
            })
        
        # Calculate statistics
        water_levels = [r["DTWL"] for r in well_records]
        stats = {
            "average": sum(water_levels) / len(water_levels),
            "minimum": min(water_levels),
            "maximum": max(water_levels),
            "trend": "stable"  # Could calculate actual trend
        }
        
        return {
            "success": True,
            "location": {"lat": lat, "lng": lng},
            "count": len(processed_data),
            "timeseries": processed_data,
            "statistics": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching well details: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def generate_sample_wells_data():
    """Generate sample wells data for demonstration"""
    
    # Sample locations in India
    locations = [
        {"lat": 28.6139, "long": 77.2090, "name": "New Delhi"},
        {"lat": 19.0760, "long": 72.8777, "name": "Mumbai"},
        {"lat": 13.0827, "long": 80.2707, "name": "Chennai"},
        {"lat": 22.5726, "long": 88.3639, "name": "Kolkata"},
        {"lat": 12.9716, "long": 77.5946, "name": "Bangalore"},
        {"lat": 26.9124, "long": 75.7873, "name": "Jaipur"},
        {"lat": 21.1458, "long": 79.0882, "name": "Nagpur"},
        {"lat": 15.2993, "long": 74.1240, "name": "Goa"},
        {"lat": 23.0225, "long": 72.5714, "name": "Ahmedabad"},
        {"lat": 17.3850, "long": 78.4867, "name": "Hyderabad"}
    ]
    
    sample_data = []
    
    for location in locations:
        # Add some random variation to coordinates
        lat_variation = random.uniform(-0.01, 0.01)
        long_variation = random.uniform(-0.01, 0.01)
        # Generate realistic water level data
        base_level = random.uniform(1, 15)  # DTWL typically 1-15 meters
        
        sample_data.append({
            "lat": location["lat"] + lat_variation,
            "long": location["long"] + long_variation,
            "waterlevel": base_level,
            "date": "2024-01-01",
            "count": random.randint(50, 200),
            "min_waterlevel": base_level - random.uniform(1, 3),
            "max_waterlevel": base_level + random.uniform(1, 3)
        })
    
    return sample_data

@app.get("/wells/summary")
async def get_wells_summary():
    """Get wells summary statistics from MongoDB"""
    try:
        if wells_collection is None:
            return {"message": "MongoDB not available, using sample data"}
        
        # Get basic statistics
        total_records = wells_collection.count_documents({})
        
        # Get date range
        date_pipeline = [
            {"$group": {
                "_id": None,
                "min_date": {"$min": "$Date"},
                "max_date": {"$max": "$Date"},
                "avg_dtwl": {"$avg": "$DTWL"}
            }}
        ]
        
        date_stats = list(wells_collection.aggregate(date_pipeline))
        
        # Get unique locations count
        unique_locations = wells_collection.aggregate([
            {"$group": {"_id": {"lat": "$LATITUDE", "lng": "$LONGITUDE"}}},
            {"$count": "unique_wells"}
        ])
        unique_count = list(unique_locations)
        
        logger.info(f"✅ Summary: {total_records:,} records, {unique_count[0]['unique_wells'] if unique_count else 0} unique locations")
        
        return {
            "success": True,
            "total_records": total_records,
            "unique_wells": unique_count[0]["unique_wells"] if unique_count else 0,
            "date_range": date_stats[0] if date_stats else {},
            "source": "mongodb"
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching wells summary: {e}")
        return {"error": f"Database error: {str(e)}"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Wells Data API",
        "mongodb_connected": wells_collection is not None,
        "total_records": wells_collection.count_documents({}) if wells_collection else 0
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Groundwater Wells Data API",
        "version": "1.0.0",
        "endpoints": {
            "/wells": "Get unique well locations (optimized for large dataset)",
            "/well-details/{lat}/{lng}": "Get time series data for specific location",
            "/wells/summary": "Get wells summary statistics",
            "/health": "Health check"
        },
        "mongodb_status": "connected" if wells_collection else "disconnected",
        "total_records": wells_collection.count_documents({}) if wells_collection else 0
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting Wells Data API server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)