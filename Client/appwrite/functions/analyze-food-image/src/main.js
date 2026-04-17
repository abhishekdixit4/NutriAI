// Appwrite Cloud Function - Strict & Safe Indian Food Detector
// Env vars: GEMINI_API_KEY, OPENAI_API_KEY, REPLICATE_API_TOKEN, HUGGINGFACE_TOKEN

const ALLOWED_FOODS = {
  paneer: { name: "Paneer Curry", calories: 300 },
  "paneer curry": { name: "Paneer Curry", calories: 300 },
  "paneer butter masala": { name: "Paneer Butter Masala", calories: 300 },
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
  "paneer tikka": { name: "Paneer Tikka", calories: 290 },
  "paneer cubes": { name: "Paneer Curry", calories: 300 },
  "lentil curry": { name: "Dal", calories: 180 },
  lentil: { name: "Dal", calories: 180 },
  curry: { name: "Vegetable Curry", calories: 220 },
  sabzi: { name: "Vegetable Curry", calories: 220 },
  "veg curry": { name: "Vegetable Curry", calories: 220 },
  "vegetable curry": { name: "Vegetable Curry", calories: 220 },
  rice: { name: "Rice", calories: 220 },
  chawal: { name: "Rice", calories: 220 },
};

const NON_FOOD_KEYWORDS = [
  "person",
  "human",
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

const FOOD_SIGNAL_KEYWORDS = [
  "plate",
  "bowl",
  "curry",
  "rice",
  "bread",
  "snack",
  "lunch",
  "dinner",
  "breakfast",
  "vegetable",
  "lentil",
];

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

function buildFinalResult(labels, fallbackCalories = 250) {
  const cleanLabels = labels.map((l) => normalizeText(l)).filter(Boolean).slice(0, 12);
  const hasFoodKeyword = cleanLabels.some((label) =>
    Object.keys(ALLOWED_FOODS).some((keyword) => label.includes(keyword))
  );
  const hasFoodSignal = cleanLabels.some((label) =>
    FOOD_SIGNAL_KEYWORDS.some((keyword) => label.includes(keyword))
  );
  const hasNonFoodKeyword = cleanLabels.some((label) =>
    NON_FOOD_KEYWORDS.some((keyword) => label.includes(keyword))
  );

  if (!hasFoodKeyword && !hasFoodSignal && hasNonFoodKeyword) {
    return nonFoodResponse(cleanLabels);
  }

  for (const label of cleanLabels) {
    for (const [keyword, value] of Object.entries(ALLOWED_FOODS)) {
      if (label.includes(keyword)) {
        const calories = value.calories;
        return {
          foodName: value.name,
          calories: `${calories} kcal`,
          source: "AI + exact keyword match",
          detectedLabels: cleanLabels.slice(0, 5),
          isFoodImage: true,
          meal_name: value.name,
          calories_value: calories,
          calories_num: calories,
          protein_g: Math.round((calories * 0.14) / 4),
          carbs_g: Math.round((calories * 0.56) / 4),
          fat_g: Math.round((calories * 0.3) / 9),
        };
      }
    }
  }

  const calories = fallbackCalories;
  return {
    foodName: "Indian Meal",
    calories: `${calories} kcal`,
    source: "Safe fallback",
    detectedLabels: cleanLabels.slice(0, 5),
    isFoodImage: true,
    meal_name: "Indian Meal",
    calories_value: calories,
    calories_num: calories,
    protein_g: Math.round((calories * 0.14) / 4),
    carbs_g: Math.round((calories * 0.56) / 4),
    fat_g: Math.round((calories * 0.3) / 9),
  };
}

async function analyzeWithGemini(apiKey, mimeType, base64Data) {
  const prompt = `Identify food from this image with TOP 5 labels.
Return ONLY JSON:
{"labels":["label1","label2","label3","label4","label5"],"primary":"best guess","isFoodImage":true}
If image is not food, set "isFoodImage": false and return scene/object labels.`;
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
              "Extract TOP 5 labels and primary label. If image is not food then set isFoodImage false and give scene/object labels. Return ONLY JSON: {\"labels\":[\"a\",\"b\",\"c\",\"d\",\"e\"],\"primary\":\"best label\",\"isFoodImage\":true}",
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

    const providers = [
      { name: "Gemini", enabled: process.env.GEMINI_API_KEY, run: () => analyzeWithGemini(process.env.GEMINI_API_KEY, mimeType, base64Data) },
      { name: "OpenAI", enabled: process.env.OPENAI_API_KEY, run: () => analyzeWithOpenAI(process.env.OPENAI_API_KEY, mimeType, base64Data) },
      { name: "Replicate", enabled: process.env.REPLICATE_API_TOKEN, run: () => analyzeWithReplicate(process.env.REPLICATE_API_TOKEN, imageDataUri) },
      { name: "HuggingFace", enabled: process.env.HUGGINGFACE_TOKEN, run: () => analyzeWithHuggingFace(process.env.HUGGINGFACE_TOKEN, imageBytes) },
    ];

    let aggregatedLabels = [];
    let successfulProviders = 0;

    for (const provider of providers) {
      if (!provider.enabled) continue;
      try {
        const result = await provider.run();
        const payload = typeof result === "string" ? parseJsonLoose(result) : null;
        const caption = typeof result === "object" && result?.caption ? result.caption : "";
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

    if (aggregatedLabels.length > 0) {
      const finalResult = buildFinalResult(aggregatedLabels, fallbackCalories);
      return res.json({
        ...finalResult,
        source: `${finalResult.source} (${successfulProviders} provider${successfulProviders === 1 ? "" : "s"})`,
      });
    }

    const fallback = buildFinalResult(["indian food", "meal"], fallbackCalories);
    return res.json({ ...fallback, source: "Final safe fallback" });
  } catch (err) {
    error(err);
    const fallback = buildFinalResult(["indian food", "meal"], 250);
    return res.json({ ...fallback, source: "Error fallback" });
  }
};
