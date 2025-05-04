from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import numpy as np
import io

app = FastAPI()

# Allow CORS for communication with Express and React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv8 model (using yolov8n.pt as placeholder)
model = YOLO("./best.pt")  # Ensure this file exists in the project directory

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        # Read and process the uploaded image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image_np = np.array(image)

        # Get predictions from YOLOv8
        results = model(image_np)[0]

        # Simulate tuberculosis detection (placeholder logic)
        tuberculosis_detected = False
        confidence = 0
        bbox = None

        for box in results.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            label = model.names[class_id]

            # Placeholder: Assume "person" detection simulates tuberculosis for testing
            if label == "tuberculosis" and confidence > 0.5:  # Adjust threshold as needed
                tuberculosis_detected = True
                bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                break  # Take the first confident detection

        # Prepare response
        result = {
            "status": "success",
            "result": "has tuberculosis" if tuberculosis_detected else "no tuberculosis",
            "confidence": round(confidence, 4),
            "bbox": [round(coord, 2) for coord in bbox] if bbox else None
        }

        return result

    except Exception as e:
        return {"status": "error", "message": str(e)}