// Appwrite Cloud Function - Strict & Safe Indian Food Detector
// Env vars: RESNET_SERVICE_URL, RESNET_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, REPLICATE_API_TOKEN, HUGGINGFACE_TOKEN
// Deploy `foods-database.json` next to main.js (~5000 keyword rows). Regenerate: node scripts/generate-foods-database.mjs

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let BULK_FOODS = {};
try {
  BULK_FOODS = JSON.parse(readFileSync(join(__dirname, "foods-database.json"), "utf8"));
} catch {
  /* optional file — function still works with critical map only */
}

/** Hand-tuned entries override bulk (paneer vs biryani, rice-dish skips, etc.) */
const CRITICAL_FOODS = {
  /** Longer / more specific keys are matched first (see buildFinalResult). */
  "paneer butter masala": { name: "Paneer Butter Masala", calories: 300 },
  "paneer cubes": { name: "Plain Paneer", calories: 265 },
  "plain paneer": { name: "Plain Paneer", calories: 265 },
  "cottage cheese": { name: "Plain Paneer", calories: 265 },
  "paneer tikka": { name: "Paneer Tikka", calories: 290 },
  "paneer curry": { name: "Paneer Curry", calories: 300 },
  paneer: { name: "Paneer Curry", calories: 300 },
  biryani: { name: "Biryani", calories: 290 },
  dosa: { name: "Dosa", calories: 120 },
  "masala dosa": { name: "Masala Dosa", calories: 250 },
  idli: { name: "Idli", calories: 58 },
  samosa: { name: "Samosa", calories: 262 },
  chapati: { name: "Chapati", calories: 104 },
  roti: { name: "Chapati", calories: 104 },
  naan: { name: "Naan", calories: 260 },
  dal: { name: "Dal", calories: 180 },
  "dal tadka": { name: "Dal", calories: 180 },
  "dal fry": { name: "Dal", calories: 180 },
  "lentil soup": { name: "Dal", calories: 180 },
  chole: { name: "Chole", calories: 270 },
  "chana masala": { name: "Chole", calories: 270 },
  rajma: { name: "Rajma", calories: 250 },
  poha: { name: "Poha", calories: 180 },
  upma: { name: "Upma", calories: 200 },
  paratha: { name: "Paratha", calories: 260 },
  "aloo paratha": { name: "Aloo Paratha", calories: 320 },
  pulao: { name: "Pulao", calories: 280 },
  pulav: { name: "Pulao", calories: 280 },
  khichdi: { name: "Khichdi", calories: 220 },
  "fried rice": { name: "Fried Rice", calories: 330 },
  vada: { name: "Vada", calories: 150 },
  "medu vada": { name: "Vada", calories: 150 },
  "lentil curry": { name: "Dal", calories: 180 },
  lentil: { name: "Dal", calories: 180 },
  curry: { name: "Vegetable Curry", calories: 220 },
  sabzi: { name: "Vegetable Curry", calories: 220 },
  "veg curry": { name: "Vegetable Curry", calories: 220 },
  "vegetable curry": { name: "Vegetable Curry", calories: 220 },
  rice: { name: "Rice", calories: 220 },
  chawal: { name: "Rice", calories: 220 },
};

const ALLOWED_FOODS = { ...BULK_FOODS, ...CRITICAL_FOODS };
const SORTED_FOOD_ENTRIES = Object.entries(ALLOWED_FOODS).sort((a, b) => b[0].length - a[0].length);

const NON_FOOD_KEYWORDS = [
  "person",
  "people",
  "human",
  "woman",
  "boy",
  "girl",
  "portrait",
  "face",
  "selfie",
  "car",
  "vehicle",
  "bike",
  "bus",
  "building",
  "house",
  "road",
  "street",
  "sky",
  "tree",
  "plant",
  "flower",
  "dog",
  "cat",
  "animal",
  "laptop",
  "computer",
  "phone",
  "mobile",
  "book",
  "text",
  "document",
  "paper",
  "room",
  "bed",
  "table",
  "chair",
];

/** Strong visual/ingredient cues — used to override non-food labels. */
const FOOD_SIGNAL_CONCRETE = [
  "plate",
  "bowl",
  "curry",
  "rice",
  "bread",
  "snack",
  "vegetable",
  "lentil",
  "chapati",
  "roti",
  "naan",
  "paratha",
  "dosa",
  "idli",
  "biryani",
  "pulao",
  "khichdi",
  "samosa",
  "egg",
  "paneer",
  "sambar",
  "rasam",
];

/**
 * Weak words (meal, food, dish) often appear in wrong captions — only count as
 * food evidence when there are no strong non-food labels.
 */
const FOOD_SIGNAL_GENERIC = ["meal", "food", "dish", "cuisine", "cooked", "recipe", "lunch", "dinner", "breakfast"];

/** Rice-heavy dishes — do not pick these from keywords when the scene looks like paneer/cubes only (no rice). */
const RICE_DISH_KEYS = new Set(["biryani", "pulao", "pulav", "fried rice", "khichdi"]);

function paneerLikeHaystack(labels) {
  const s = labels.join(" ");
  return (
    /\b(paneer|cottage cheese|chenna|chhena|indian cheese|cheese cube)\b/i.test(s) ||
    /\b(white cubes|cubed cheese|cubes|cubed)\b/i.test(s) ||
    (s.includes("cube") && /\b(white|cream|paneer)\b/i.test(s))
  );
}

/** Actual rice/grains visible — do NOT treat the word "biryani" alone as rice proof (models hallucinate). */
function riceVisibleHaystack(labels) {
  const s = labels.join(" ");
  return /\b(rice|pulao|basmati|jeera rice|fried rice|steamed rice|grains)\b/i.test(s);
}

/** Allow matching keyword "biryani" only when labels mention rice OR a typical X biryani phrase. */
function allowBiryaniKeywordMatch(haystack) {
  if (!haystack.includes("biryani")) return true;
  return (
    /\b(rice|basmati|pulao|fried rice|jeera)\b/i.test(haystack) ||
    /\b(chicken|mutton|lamb|egg|fish|prawn|shrimp|veg|vegetable|paneer)\s+biryani\b/i.test(haystack) ||
    /\b(hyderabadi|lucknow|awadhi|dum)\s*biryani\b/i.test(haystack)
  );
}

function nonFoodResponse(labels) {
  return {
    foodName: "",
    calories: "",
    source: "Non-food image detected",
    detectedLabels: labels.slice(0, 5),
    meal_name: "",
    calories_value: 0,
    calories_num: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    isFoodImage: false,
    errorType: "NON_FOOD",
    message: "Please upload a food photo.",
  };
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hashText(seed) {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function fallbackCaloriesFromSeed(seed) {
  return 220 + (hashText(seed) % 121); // 220-340
}

function parseJsonLoose(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function labelsFromCaption(caption) {
  const n = normalizeText(caption);
  if (!n) return [];
  const chunks = n.split(/,| and | with | served | topped /).map((x) => x.trim()).filter(Boolean);
  const labels = [];
  for (const c of chunks) {
    if (c.length >= 3) labels.push(c);
    if (labels.length >= 5) break;
  }
  return labels;
}

function labelsFromAiPayload(payload, caption = "") {
  const labels = Array.isArray(payload?.labels) ? payload.labels : [];
  const normalized = labels
    .map((l) => normalizeText(l))
    .filter((l) => l.length > 1)
    .slice(0, 5);
  if (normalized.length > 0) return normalized;
  return labelsFromCaption(caption).slice(0, 5);
}

function mergeUniqueLabels(existing, incoming, max = 12) {
  const set = new Set(existing);
  for (const label of incoming) {
    const n = normalizeText(label);
    if (!n || set.has(n)) continue;
    existing.push(n);
    set.add(n);
    if (existing.length >= max) break;
  }
  return existing;
}

/** Gemini/OpenAI `primary`: what we show as Meal Name — not replaced by keyword DB when present. */
function sanitizeAiPrimary(raw) {
  let s = String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
  if (s.length < 2 || s.length > 120) return "";
  const lower = s.toLowerCase();
  const banned = ["food", "meal", "dish", "unknown", "not sure", "unclear", "cannot identify", "indian meal", "n/a", "none"];
  if (banned.includes(lower)) return "";
  return s;
}

function nutritionPayload(mealName, caloriesNum, cleanLabels, source) {
  return {
    foodName: mealName,
    calories: `${caloriesNum} kcal`,
    source,
    detectedLabels: cleanLabels.slice(0, 5),
    isFoodImage: true,
    meal_name: mealName,
    calories_value: caloriesNum,
    calories_num: caloriesNum,
    protein_g: Math.round((caloriesNum * 0.14) / 4),
    carbs_g: Math.round((caloriesNum * 0.56) / 4),
    fat_g: Math.round((caloriesNum * 0.3) / 9),
  };
}

function buildFinalResult(labels, fallbackCalories = 250, aiPrimaryPreferred = "") {
  const cleanLabels = labels.map((l) => normalizeText(l)).filter(Boolean).slice(0, 12);
  const labelHaystack = cleanLabels.join(" ");
  const preferred = sanitizeAiPrimary(aiPrimaryPreferred);
  const macroHaystack = preferred ? `${normalizeText(preferred)} ${labelHaystack}`.trim() : labelHaystack;

  const hasFoodKeyword =
    SORTED_FOOD_ENTRIES.some(([keyword]) => macroHaystack.includes(keyword)) || Boolean(preferred);
  const hasConcreteFoodSignal = cleanLabels.some((label) =>
    FOOD_SIGNAL_CONCRETE.some((keyword) => label.includes(keyword))
  );
  const hasGenericFoodWord = cleanLabels.some((label) =>
    FOOD_SIGNAL_GENERIC.some((keyword) => label.includes(keyword))
  );
  const hasNonFoodKeyword = cleanLabels.some((label) =>
    NON_FOOD_KEYWORDS.some((keyword) => label.includes(keyword))
  );
  /** Reject selfies/scenes: generic words like "meal" do not save a person-only label set. */
  const hasFoodEvidence =
    hasFoodKeyword ||
    hasConcreteFoodSignal ||
    (hasGenericFoodWord && !hasNonFoodKeyword) ||
    Boolean(preferred);

  if (!hasFoodEvidence && hasNonFoodKeyword) {
    return nonFoodResponse(cleanLabels);
  }

  const paneerScene = paneerLikeHaystack(cleanLabels);
  const riceScene = riceVisibleHaystack(cleanLabels);
  const cubeOrWhiteProtein = /\b(cube|cubes|cubed|paneer|tofu|cottage)\b/i.test(labelHaystack);
  const skipRiceDishes = (paneerScene && !riceScene) || (cubeOrWhiteProtein && !riceScene);

  for (const [keyword, value] of SORTED_FOOD_ENTRIES) {
    if (skipRiceDishes && RICE_DISH_KEYS.has(keyword)) continue;
    if (keyword === "biryani" && !allowBiryaniKeywordMatch(macroHaystack)) continue;
    if (macroHaystack.includes(keyword)) {
      const mealName = preferred || value.name;
      const src = preferred
        ? `Vision model dish name + calorie match (${keyword})`
        : "Keyword match (longest-first)";
      return nutritionPayload(mealName, value.calories, cleanLabels, src);
    }
  }

  if (skipRiceDishes) {
    const c = 265;
    if (preferred) {
      return nutritionPayload(preferred, c, cleanLabels, "Vision model name (paneer-like scene, estimated kcal)");
    }
    return nutritionPayload("Plain Paneer", c, cleanLabels, "Paneer-like image (rice dishes excluded)");
  }

  if (preferred) {
    return nutritionPayload(preferred, fallbackCalories, cleanLabels, "Vision model dish name (estimated macros)");
  }

  return nutritionPayload("Indian Meal", fallbackCalories, cleanLabels, "Safe fallback");
}

async function analyzeWithGemini(apiKey, mimeType, base64Data) {
  const prompt = `You are the vision brain for a meal-tracking website. Output what the user should see as the dish name.

Return JSON only:
- isFoodImage: true if any food/drink meant to eat is clearly visible; false for selfies, only a face, empty plate, pets, phones, documents, non-food.

- primary: THIS IS THE MAIN DISH NAME SHOWN ON THE WEBSITE. Write it like you are telling a friend exactly what is on the plate:
  • If idli AND sambar (or any combo) are visible → e.g. "Idli with sambar" or "Idli, sambar and coconut chutney" (describe everything important you see).
  • If only paneer cubes / cheese cubes → e.g. "Plain paneer cubes" (do not say biryani unless you clearly see rice in a rice dish).
  • If one main item only → name that item simply, e.g. "Paneer", "Masala dosa", "Veg thali".
  • Thali / multiple compartments → list the main parts, e.g. "South Indian veg thali with sambar and rice".

- labels: up to 5 short English tags (ingredients + dish types) to help search.

Be specific. Never use vague words alone like "food" or "meal" for primary.

Return ONLY JSON:
{"labels":["tag1","tag2"],"primary":"exact dish description for the UI","isFoodImage":true}`;
  const models = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-2.0-flash"];
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }],
          generationConfig: { maxOutputTokens: 512, temperature: 0.1, responseMimeType: "application/json" },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json?.error?.message || `Gemini ${res.status}`);
      const text = (json?.candidates?.[0]?.content?.parts || [])
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .join("\n")
        .trim();
      if (text) return text;
    } catch {
      // try next model
    }
  }
  throw new Error("Gemini failed");
}

async function analyzeWithOpenAI(apiKey, mimeType, base64Data) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
          {
            type: "text",
            text:
              'Meal tracker UI: primary = exact dish name users see (e.g. "Idli with sambar", "Plain paneer cubes only"). Combine items on the plate in primary. isFoodImage=false only if no real food visible. JSON only: {"labels":[],"primary":"","isFoodImage":true}',
          },
        ],
      }],
      max_tokens: 256,
      temperature: 0.1,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json?.error?.message || "OpenAI failed");
  const text = json?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("OpenAI empty");
  return text;
}

async function analyzeWithReplicate(token, imageDataUri) {
  const res = await fetch("https://api.replicate.com/v1/predictions?wait=60", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d0ac4746",
      input: { image: imageDataUri },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || `Replicate: ${res.status}`);
  const caption = typeof json.output === "string" ? json.output : json.output?.[0] || "";
  if (!caption) throw new Error("Replicate empty");
  return { caption };
}

async function analyzeWithHuggingFace(token, imageBytes) {
  const models = ["Salesforce/blip-image-captioning-base", "Salesforce/blip-image-captioning-large"];
  for (const model of models) {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
      body: imageBytes,
    });
    if (res.status === 410) continue;
    if (res.ok) {
      const data = await res.json();
      const caption = data?.[0]?.generated_text || "";
      if (caption) return { caption };
    }
  }
  throw new Error("HuggingFace failed");
}

async function analyzeWithResnet(serviceUrl, apiKey, mimeType, base64Data) {
  const res = await fetch(serviceUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ image_base64: `data:${mimeType};base64,${base64Data}` }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `ResNet service failed: ${res.status}`);
  return json;
}

export default async ({ req, res, log, error }) => {
  try {
    const body = req.bodyJson || {};
    const imageBase64 = body.imageBase64;
    if (!imageBase64) return res.json({ error: "imageBase64 is required" });

    let mimeType = "image/jpeg";
    let base64Data = imageBase64;
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const imageDataUri = `data:${mimeType};base64,${base64Data}`;
    const fallbackCalories = fallbackCaloriesFromSeed(base64Data.slice(0, 1800));

    if (process.env.RESNET_SERVICE_URL) {
      try {
        const cnn = await analyzeWithResnet(
          process.env.RESNET_SERVICE_URL,
          process.env.RESNET_API_KEY,
          mimeType,
          base64Data
        );
        const mealName = sanitizeAiPrimary(cnn?.meal_name || cnn?.class_name || "") || "Detected Meal";
        const caloriesNum = Number(cnn?.calories_value ?? cnn?.estimated_calories ?? fallbackCalories) || fallbackCalories;
        const topCandidate = {
          meal_name: mealName,
          confidence: Number(cnn?.confidence ?? 0),
        };
        return res.json({
          ...nutritionPayload(mealName, caloriesNum, [mealName], "ResNet-50 inference service"),
          confidence: topCandidate.confidence,
          dish_candidates: [topCandidate],
          model: String(cnn?.model || "resnet50"),
          inference_ms: Number(cnn?.inference_ms || 0),
        });
      } catch (e) {
        log(`ResNet service failed, falling back to API providers: ${e.message}`);
      }
    }

    const providers = [
      { name: "Gemini", enabled: process.env.GEMINI_API_KEY, run: () => analyzeWithGemini(process.env.GEMINI_API_KEY, mimeType, base64Data) },
      { name: "OpenAI", enabled: process.env.OPENAI_API_KEY, run: () => analyzeWithOpenAI(process.env.OPENAI_API_KEY, mimeType, base64Data) },
      { name: "Replicate", enabled: process.env.REPLICATE_API_TOKEN, run: () => analyzeWithReplicate(process.env.REPLICATE_API_TOKEN, imageDataUri) },
      { name: "HuggingFace", enabled: process.env.HUGGINGFACE_TOKEN, run: () => analyzeWithHuggingFace(process.env.HUGGINGFACE_TOKEN, imageBytes) },
    ];

    let aggregatedLabels = [];
    let successfulProviders = 0;
    /** First structured JSON vision result (Gemini/OpenAI) — primary is the website meal name. */
    let visionPrimary = "";

    for (const provider of providers) {
      if (!provider.enabled) continue;
      try {
        const result = await provider.run();
        const payload = typeof result === "string" ? parseJsonLoose(result) : null;
        const caption = typeof result === "object" && result?.caption ? result.caption : "";
        if (!visionPrimary && payload && typeof payload.primary === "string") {
          const p = String(payload.primary).trim();
          if (p) visionPrimary = p;
        }
        let labels = labelsFromAiPayload(payload, caption);
        if (payload?.primary && labels.length < 5) labels.unshift(normalizeText(payload.primary));
        if (payload?.isFoodImage === false) {
          return res.json(nonFoodResponse(labels.length > 0 ? labels : ["person", "non food"]));
        }
        if (labels.length > 0) {
          aggregatedLabels = mergeUniqueLabels(aggregatedLabels, labels, 12);
          successfulProviders += 1;
        }
      } catch (e) {
        log(`${provider.name} failed: ${e.message}`);
      }
    }

    if (aggregatedLabels.length === 0 && visionPrimary) {
      aggregatedLabels = [normalizeText(visionPrimary)];
    }

    if (aggregatedLabels.length > 0) {
      const finalResult = buildFinalResult(aggregatedLabels, fallbackCalories, visionPrimary);
      return res.json({
        ...finalResult,
        source: `${finalResult.source} (${successfulProviders} provider${successfulProviders === 1 ? "" : "s"})`,
      });
    }

    return res.json(
      nonFoodResponse([
        "unable to classify",
        "configure gemini or openai for best results",
        "no labels from vision providers",
      ])
    );
  } catch (err) {
    error(err);
    return res.json(nonFoodResponse(["analysis error"]));
  }
};
