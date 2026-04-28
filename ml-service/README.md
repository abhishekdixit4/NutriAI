# ResNet-50 Service (Paper Alignment)

This service provides a ResNet-based image inference endpoint for NutriAI.

## Run

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

Endpoint:
- `POST /predict` with JSON `{ "image_base64": "data:image/jpeg;base64,..." }`

Response fields:
- `meal_name`
- `confidence`
- `dish_candidates` (top-k classes)
- `estimated_calories`
- `model`
- `inference_ms`

## Training Script

`train_food101.py` fine-tunes ResNet-50 on Food-101 and exports `resnet50_food101.pt`.

```bash
python train_food101.py
```

## Evaluation (200 profiles)

Run paper-style demo evaluation:

```bash
python evaluate_system.py
```

This generates `evaluation_summary.json`, which you can copy to:
- `Client/public/evaluation-summary.json`
for UI display at `/results`.

For Food-101 inference, place:
- `resnet50_food101.pt`
- `food101_classes.txt` (one class per line, same order as training labels)

and set optional env vars:
- `RESNET_CHECKPOINT_PATH` (default `resnet50_food101.pt`)
- `RESNET_CLASSES_PATH` (default `food101_classes.txt`)

## Fast Inference Tips (ResNet)

- Use GPU if available (service auto-detects CUDA).
- Keep image input around 224x224 effective size (already handled).
- Use `top_k=3` in request for faster post-processing.
- If demo machine is CPU-only, keep only one service process and avoid debug reload mode.

For app integration, Appwrite function should call this service via `RESNET_SERVICE_URL`.

