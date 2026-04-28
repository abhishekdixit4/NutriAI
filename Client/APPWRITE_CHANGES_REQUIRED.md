# Appwrite Changes Required

Use this checklist so the upgraded project runs correctly.

## Must Change

- In `profiles` collection, add optional attributes:
  - `medical_conditions` (string array)
  - `allergen_flags` (string array)
  - `cultural_preference` (string)

- In `analyze-food-image` function environment variables, set:
  - `RESNET_SERVICE_URL` = `http://<your-ml-host>:8000/predict` (or deployed URL)

## Optional but Recommended

- `RESNET_API_KEY` if your ML endpoint is protected.
- Keep one fallback provider key configured:
  - `GEMINI_API_KEY` or `OPENAI_API_KEY` or `REPLICATE_API_TOKEN` or `HUGGINGFACE_TOKEN`
  - This is used only if ResNet service is unavailable.

## No Change Needed

- Existing `meal_logs` schema remains valid.
- Existing frontend `.env` keys remain valid.

