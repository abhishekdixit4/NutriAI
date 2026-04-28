from io import BytesIO
import base64
import os
import time
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
import torch
from torchvision import models, transforms


class PredictRequest(BaseModel):
    image_base64: str
    top_k: int = 3


app = FastAPI(title="NutriAI ResNet Service")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))
if hasattr(torch, "set_float32_matmul_precision"):
    torch.set_float32_matmul_precision("high")


def load_model_and_categories():
    checkpoint_path = os.getenv("RESNET_CHECKPOINT_PATH", "resnet50_food101.pt")
    classes_path = os.getenv("RESNET_CLASSES_PATH", "food101_classes.txt")
    if os.path.exists(checkpoint_path) and os.path.exists(classes_path):
        with open(classes_path, "r", encoding="utf-8") as fh:
            class_names = [line.strip() for line in fh.readlines() if line.strip()]
        model_local = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
        model_local.fc = torch.nn.Linear(model_local.fc.in_features, len(class_names))
        state = torch.load(checkpoint_path, map_location="cpu")
        model_local.load_state_dict(state, strict=False)
        return model_local.eval().to(DEVICE), class_names, "resnet50-food101-finetuned"

    model_local = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
    weights_meta = models.ResNet50_Weights.IMAGENET1K_V2.meta
    class_names = weights_meta.get("categories", [])
    return model_local.eval().to(DEVICE), class_names, "resnet50-imagenet-fallback"


model, categories, model_name = load_model_and_categories()

preprocess = transforms.Compose(
    [
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


def decode_image(image_base64: str) -> Image.Image:
    payload = image_base64
    if image_base64.startswith("data:"):
        parts = image_base64.split(",", 1)
        payload = parts[1] if len(parts) > 1 else ""
    try:
        image_bytes = base64.b64decode(payload)
        return Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image payload: {exc}") from exc


@app.post("/predict")
def predict(req: PredictRequest):
    image = decode_image(req.image_base64)
    x = preprocess(image).unsqueeze(0).to(DEVICE)
    start = time.time()
    with torch.no_grad(), torch.autocast(device_type=DEVICE, enabled=DEVICE == "cuda"):
        logits = model(x)
        probs = torch.softmax(logits, dim=1)
        confidence, index = torch.max(probs, dim=1)
        k = max(1, min(5, int(req.top_k or 3)))
        top_probs, top_idx = torch.topk(probs, k=k, dim=1)
    inference_ms = int((time.time() - start) * 1000)
    class_name = categories[int(index.item())] if categories else f"class_{int(index.item())}"
    conf = float(confidence.item())
    candidates: List[dict] = []
    for prob, idx in zip(top_probs[0], top_idx[0]):
        idx_int = int(idx.item())
        name = categories[idx_int] if categories else f"class_{idx_int}"
        candidates.append({"meal_name": name, "confidence": round(float(prob.item()), 4)})

    # Placeholder calorie estimate; replace with Food-101 + nutrition mapping checkpoint output.
    estimated_calories = int(220 + (int(index.item()) % 130))
    return {
        "meal_name": class_name,
        "class_name": class_name,
        "confidence": round(conf, 4),
        "estimated_calories": estimated_calories,
        "dish_candidates": candidates,
        "model": model_name,
        "inference_ms": inference_ms,
    }

