from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import base64
from typing import List, Dict, Optional
import os
import requests
from math import radians, cos, sin, asin, sqrt

app = FastAPI(title="Garbage Classifier API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "garbage_classifier_fixed.keras")

CATEGORIES = [
    "cardboard",
    "glass", 
    "metal",
    "paper",
    "plastic",
    "trash",
]

TIPS = {
    "recyclable": "Rinse recyclables to remove food residue before placing them in the bin.",
    "non-recyclable": "Consider reusing or disposing of non-recyclables responsibly.",
    "cardboard": "Flatten cardboard boxes to save space in the recycling bin.",
    "glass": "Remove caps and rinse glass containers before recycling.",
    "metal": "Clean metal cans and check local guidelines for aerosol cans.",
    "paper": "Avoid recycling wet or heavily soiled paper.",
    "plastic": "Check resin codes; not all plastics are accepted in every program.",
    "trash": "If unsure, check your municipality's waste guide to avoid contamination.",
}


class ImageRequest(BaseModel):
    image: str 


class PredictionScore(BaseModel):
    label: str
    confidence: float


class ClassificationResponse(BaseModel):
    top: PredictionScore
    scores: List[PredictionScore]
    tip: str


def load_model():
    """Load the H5 model on startup"""
    global model
    try:
        if not os.path.exists(MODEL_PATH):
            print(f"Model file not found at: {MODEL_PATH}")
            print(f"Please place your 'garbage_classifier.keras' file in the 'models' folder")
            return
        
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"Model loaded successfully from {MODEL_PATH}")
        print(f"Model input shape: {model.input_shape}")
        print(f"Model output shape: {model.output_shape}")
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        model = None


def preprocess_image(base64_image: str, target_size=(224, 224)):
    """
    Convert base64 image to preprocessed numpy array
    Adjust target_size based on your model's input requirements
    """
    try:
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]

        image_bytes = base64.b64decode(base64_image)
        
        image = Image.open(io.BytesIO(image_bytes))
        
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        image = image.resize(target_size)
        img_array = np.array(image)
        
        img_array = img_array.astype(np.float32) / 255.0
        
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Load model when the API starts"""
    load_model()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "message": "Garbage Classifier API",
        "model_loaded": model is not None
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy" if model is not None else "model_not_loaded",
        "model_path": MODEL_PATH,
        "model_exists": os.path.exists(MODEL_PATH),
        "categories": CATEGORIES
    }


@app.post("/classify", response_model=ClassificationResponse)
async def classify_image(request: ImageRequest):
    """
    Classify a garbage image
    Expects a base64 encoded image in the request body
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please ensure the model file is in the models folder."
        )
    
    try:
        img_array = preprocess_image(request.image)
        
        predictions = model.predict(img_array, verbose=0)
        
        if len(predictions.shape) == 2:
            predictions = predictions[0]

        scores = []
        for i, category in enumerate(CATEGORIES):
            confidence = float(predictions[i]) if i < len(predictions) else 0.0
            scores.append(PredictionScore(
                label=category,
                confidence=round(confidence, 2)
            ))
        
        scores.sort(key=lambda x: x.confidence, reverse=True)
    
        top = scores[0]
    
        tip = TIPS.get(top.label, "Dispose according to local guidelines.")
        
        return ClassificationResponse(
            top=top,
            scores=scores,
            tip=tip
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")


@app.post("/test")
async def test_endpoint(request: ImageRequest):
    """Test endpoint to verify image processing without model"""
    try:
        img_array = preprocess_image(request.image)
        return {
            "success": True,
            "message": "Image processed successfully",
            "shape": img_array.shape,
            "dtype": str(img_array.dtype)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on earth in kilometers"""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return 6371 * c  # Radius of earth in kilometers


def get_overpass_query(lat: float, lng: float, radius: int, material: str) -> str:
    """
    Generate Overpass QL query for recycling/waste facilities
    Searches for amenities and facilities related to waste management
    """
    # Map material types to Overpass tags
    material_tags = {
        "cardboard": ["recycling", "recycling_centre", "waste_disposal"],
        "glass": ["recycling", "recycling_centre", "bottle_bank"],
        "metal": ["recycling", "recycling_centre", "scrap_yard"],
        "paper": ["recycling", "recycling_centre", "waste_disposal"],
        "plastic": ["recycling", "recycling_centre", "waste_disposal"],
        "trash": ["waste_disposal", "waste_transfer_station", "waste_basket"]
    }
    
    tags = material_tags.get(material.lower(), ["recycling", "recycling_centre", "waste_disposal"])
    
    # Build query for multiple amenity types
    queries = []
    for tag in tags:
        queries.append(f'node["amenity"="{tag}"](around:{radius},{lat},{lng});')
        queries.append(f'way["amenity"="{tag}"](around:{radius},{lat},{lng});')
    
    query = f"""
    [out:json][timeout:10];
    (
      {''.join(queries)}
    );
    out body;
    >;
    out skel qt;
    """
    return query


@app.get("/places")
async def nearby_places(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lng: float = Query(..., description="Longitude", ge=-180, le=180),
    material: Optional[str] = Query("recycling", description="Material type from classification"),
    radius: int = Query(10000, description="Search radius in meters", ge=100, le=50000)
):
    """
    Find nearby recycling and waste disposal points using OpenStreetMap Overpass API
    Free to use, no API key required
    """
    try:
        # Use public Overpass API endpoint
        overpass_url = "https://overpass-api.de/api/interpreter"
        
        query = get_overpass_query(lat, lng, radius, material)
        
        response = requests.post(
            overpass_url,
            data={"data": query},
            timeout=15,
            headers={"User-Agent": "GarbageClassifierApp/1.0"}
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Overpass API error: {response.status_code}"
            )
        
        data = response.json()
        elements = data.get("elements", [])
        
        # Process results
        results = []
        seen_ids = set()
        
        for element in elements:
            # Skip if we've already processed this element
            if element.get("id") in seen_ids:
                continue
            
            # Only process nodes and ways with tags
            if element.get("type") not in ["node", "way"]:
                continue
            
            tags = element.get("tags", {})
            if not tags:
                continue
            
            # Get coordinates
            if element.get("type") == "node":
                elem_lat = element.get("lat")
                elem_lng = element.get("lon")
            elif element.get("type") == "way" and element.get("center"):
                elem_lat = element["center"].get("lat")
                elem_lng = element["center"].get("lon")
            else:
                continue
            
            if elem_lat is None or elem_lng is None:
                continue
            
            # Calculate distance
            distance_km = haversine_km(lat, lng, elem_lat, elem_lng)
            
            # Extract useful information
            name = tags.get("name", tags.get("amenity", "Recycling Point").replace("_", " ").title())
            
            # Build address from available tags
            address_parts = []
            for key in ["addr:street", "addr:housenumber", "addr:city", "addr:postcode"]:
                if tags.get(key):
                    address_parts.append(tags[key])
            address = ", ".join(address_parts) if address_parts else "Address not available"
            
            # Get opening hours if available
            opening_hours = tags.get("opening_hours")
            
            # Get recycling types if specified
            recycling_types = []
            for key, value in tags.items():
                if key.startswith("recycling:") and value == "yes":
                    recycling_types.append(key.replace("recycling:", ""))
            
            results.append({
                "name": name,
                "address": address,
                "location": {
                    "lat": elem_lat,
                    "lng": elem_lng
                },
                "distance_km": round(distance_km, 2),
                "amenity_type": tags.get("amenity", "unknown"),
                "opening_hours": opening_hours,
                "recycling_types": recycling_types if recycling_types else None,
                "phone": tags.get("phone"),
                "website": tags.get("website"),
                "osm_id": element.get("id"),
                "osm_type": element.get("type")
            })
            
            seen_ids.add(element.get("id"))
        
        # Sort by distance
        results.sort(key=lambda x: x["distance_km"])
        
        return {
            "count": len(results),
            "results": results,
            "query_info": {
                "latitude": lat,
                "longitude": lng,
                "radius_meters": radius,
                "material": material
            }
        }
    
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request to Overpass API timed out")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error contacting Overpass API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
