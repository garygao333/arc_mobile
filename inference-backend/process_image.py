import os, json, cv2, numpy as np, base64
from inference_sdk import InferenceHTTPClient
from dotenv import load_dotenv

load_dotenv()

OUTPUT_DIR = "output"
API_KEY = os.getenv("API_KEY")
WORKSPACE = os.getenv("WORKSPACE")
WORKFLOW_ID = os.getenv("WORKFLOW_ID")
SERVERLESS_URL = os.getenv("SERVERLESS_URL")

def process_image(image_path: str, total_weight: float = 100):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    client = InferenceHTTPClient(api_url=SERVERLESS_URL, api_key=API_KEY)
    result = client.run_workflow(WORKSPACE, WORKFLOW_ID, images={"image": image_path}, use_cache=False)
    result = result[0]
    
    image = cv2.imread(image_path)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    detections = result["detection_predictions"]["predictions"]
    type_preds = result["classification_predictions"]
    qual_preds = result["model_predictions"]
    
    type_map = {p["predictions"]["parent_id"]: p["predictions"].get("top", "unknown") for p in type_preds}
    qual_map = {p["parent_id"]: p.get("top", "unknown") for p in qual_preds}
    
    total_area = sum(d["width"] * d["height"] for d in detections)
    
    annotated_image = image_rgb.copy()
    
    sherds = []
    for i, d in enumerate(detections):
        area = d["width"] * d["height"]
        weight = (area / total_area) * total_weight if total_area > 0 else 0
        
        x, y, w, h = int(d["x"] - d["width"]/2), int(d["y"] - d["height"]/2), int(d["width"]), int(d["height"])
        
        cv2.rectangle(annotated_image, (x, y), (x + w, y + h), (255, 0, 0), 2)
        
        label = f"Sherd {i + 1}"
        type_pred = type_map.get(d["detection_id"], "unknown")
        qual_pred = qual_map.get(d["detection_id"], "unknown")
        
        cv2.putText(annotated_image, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
        cv2.putText(annotated_image, f"{type_pred}/{qual_pred}", (x, y + h + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
        
        sherds.append({
            "sherd_id": f"Sherd {i + 1}",
            "weight": round(weight, 2),
            "type_prediction": type_pred,
            "qualification_prediction": qual_pred
        })
    
    _, buffer = cv2.imencode('.jpg', cv2.cvtColor(annotated_image, cv2.COLOR_RGB2BGR))
    annotated_image_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return {
        "sherds": sherds,
        "annotated_image": annotated_image_base64
    }