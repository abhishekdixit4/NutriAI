# Appwrite Cloud Setup for NutriAI

## 1. Create Appwrite Project

1. Go to [cloud.appwrite.io](https://cloud.appwrite.io)
2. Create a new project (e.g. "NutriAI")
3. Note your **Project ID** and **API Endpoint** (e.g. `https://cloud.appwrite.io/v1`)

## 2. Authentication – Email/Password

1. In Appwrite Console → **Auth** → **Settings** → **Auth Providers**
2. Enable **Email/Password** (no OAuth setup needed)
3. Add your app URL to **Auth** → **Settings** → **Platforms** (e.g. `http://localhost:8080` for dev)

## 3. Database

1. **Databases** → Create database → Name: `nutriai` (or use default)
2. Create collection **profiles** with attributes:
   - `user_id` (string, required)
   - `full_name` (string)
   - `age` (integer)
   - `gender` (string)
   - `height_cm` (float)
   - `weight_kg` (float)
   - `activity_level` (string)
   - `dietary_preference` (string)
   - `goal` (string)
   - `target_calories` (integer)
   - `target_protein` (integer)
   - `target_carbs` (integer)
   - `target_fat` (integer)
   - `onboarding_completed` (boolean)
3. Create collection **meal_logs** with attributes:
   - `user_id` (string, required)
   - `meal_type` (string, required)
   - `meal_name` (string, required)
   - `calories` (integer)
   - `protein_g` (float)
   - `carbs_g` (float)
   - `fat_g` (float)
   - `image_url` (string)
   - `log_date` (string, required)
4. Set permissions: **Create** and **Read** for `users` role on both collections

## 4. Storage

1. **Storage** → Create bucket → ID: `meal-images`
2. Set permissions: **Create** and **Read** for `users` role
3. For public image URLs, enable **File security** or use a public bucket

## 5. Functions – AI Meal Detection

1. **Functions** → Create function → Name: `analyze-food-image`
2. Runtime: **Node.js 18**
3. Add environment variables:
   - `GEMINI_API_KEY` or `OPENAI_API_KEY` or `REPLICATE_API_TOKEN` or `HUGGINGFACE_TOKEN`
4. Deploy the code from `appwrite/functions/analyze-food-image/src/` (**include `main.js` and `foods-database.json`** — ~5000 Indian food keywords). To regenerate the JSON: `node scripts/generate-foods-database.mjs` from `analyze-food-image`.
5. Set **Execute** permission to `users` or `any`

## 6. Environment Variables

Create `.env` in the `Client` folder:

```
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=nutriai
VITE_APPWRITE_ANALYZE_FUNCTION_ID=analyze-food-image

# Contact form (required): get an access key at https://web3forms.com
# VITE_WEB3FORMS_ACCESS_KEY=your_key
```

## 7. Run

```bash
cd Client
npm install
npm run dev
```
