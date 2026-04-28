import { clinicalRules } from "@/data/recommendationRules";

export interface RecommendationInput {
  dietaryPreference?: string | null;
  goal?: string | null;
  bmiCategory?: string | null;
  remainingCalories?: number;
  remainingProtein?: number;
  medicalConditions?: string[];
}

export interface RecommendationResult {
  name: string;
  calories: number;
  protein: number;
  description: string;
  tier1Reason: string;
  tier2Reason: string;
  score: number;
}

interface MealCandidate {
  name: string;
  calories: number;
  protein: number;
  dietTags: Array<"vegetarian" | "vegan" | "non-vegetarian" | "eggetarian">;
  avoidFor?: string[];
  tags: string[];
}

const MEAL_CANDIDATES: MealCandidate[] = [
  { name: "Moong Dal Chilla", calories: 220, protein: 14, dietTags: ["vegetarian", "vegan", "eggetarian"], tags: ["high-fibre", "low-gi"] },
  { name: "Paneer Bhurji", calories: 280, protein: 18, dietTags: ["vegetarian", "eggetarian"], tags: ["high-protein"] },
  { name: "Sprouts Salad", calories: 170, protein: 11, dietTags: ["vegetarian", "vegan", "eggetarian"], tags: ["high-fibre", "low-gi"] },
  { name: "Dal Chawal", calories: 330, protein: 13, dietTags: ["vegetarian", "vegan", "eggetarian"], tags: ["balanced"] },
  { name: "Vegetable Pulao", calories: 310, protein: 8, dietTags: ["vegetarian", "vegan", "eggetarian"], tags: ["balanced"] },
  { name: "Chana Masala", calories: 290, protein: 15, dietTags: ["vegetarian", "vegan", "eggetarian"], tags: ["high-fibre", "low-gi"] },
  { name: "Palak Paneer", calories: 300, protein: 19, dietTags: ["vegetarian", "eggetarian"], tags: ["high-protein"] },
  { name: "Idli with Sambar", calories: 240, protein: 10, dietTags: ["vegetarian", "vegan", "eggetarian"], tags: ["light"] },
  { name: "Poha", calories: 230, protein: 6, dietTags: ["vegetarian", "vegan", "eggetarian"], tags: ["light"] },
  { name: "Upma", calories: 250, protein: 7, dietTags: ["vegetarian", "vegan", "eggetarian"], tags: ["light"] },
  { name: "Chicken Curry", calories: 320, protein: 24, dietTags: ["non-vegetarian"], tags: ["high-protein"] },
  { name: "Egg Bhurji", calories: 260, protein: 17, dietTags: ["non-vegetarian", "eggetarian"], tags: ["high-protein"] },
  { name: "Fish Curry", calories: 290, protein: 23, dietTags: ["non-vegetarian"], avoidFor: ["hypertension"], tags: ["high-protein"] },
  { name: "Chicken Salad", calories: 210, protein: 25, dietTags: ["non-vegetarian"], tags: ["high-protein", "light"] },
];

const hasCondition = (conditions: string[], key: string) =>
  conditions.some((c) => c.toLowerCase().includes(key));

export function generateHybridRecommendations(input: RecommendationInput): RecommendationResult[] {
  const conditions = (input.medicalConditions || []).map((v) => String(v).toLowerCase());
  const preference = (input.dietaryPreference || "vegetarian").toLowerCase();
  const remainingCalories = Math.max(0, Math.round(input.remainingCalories || 0));
  const remainingProtein = Math.max(0, Math.round(input.remainingProtein || 0));

  // Tier-1 hard constraints: diet type + known condition restrictions + calorie budget sanity.
  const tier1 = MEAL_CANDIDATES.filter((meal) => {
    const dietOk = meal.dietTags.includes(preference as MealCandidate["dietTags"][number]);
    if (!dietOk) return false;

    if (
      hasCondition(conditions, "diabetes") &&
      !clinicalRules.diabetes.requiredTags.some((tag) => meal.tags.includes(tag))
    ) return false;
    if (hasCondition(conditions, "obesity") && meal.calories > clinicalRules.obesity.maxMealCalories) return false;
    if (
      hasCondition(conditions, "hypertension") &&
      ((meal.avoidFor || []).includes("hypertension") || clinicalRules.hypertension.excludedMeals.includes(meal.name))
    ) return false;
    if (remainingCalories > 0 && meal.calories > remainingCalories + 120) return false;
    return true;
  });

  // Tier-2 preference-aware ranking: protein need + calorie fit + goal signal.
  const ranked = tier1
    .map((meal) => {
      const calorieFit = remainingCalories > 0 ? Math.max(0, 100 - Math.abs(remainingCalories - meal.calories)) : 40;
      const proteinFit = remainingProtein > 0 ? Math.min(100, meal.protein * 5) : meal.protein * 4;
      const goalBoost =
        input.goal === "gain" ? meal.protein * 2 : input.goal === "lose" ? Math.max(0, 60 - meal.calories / 6) : 30;
      const bmiBoost = input.bmiCategory === "Overweight" || input.bmiCategory === "Obese" ? (meal.tags.includes("light") ? 20 : 0) : 0;
      const score = calorieFit * 0.35 + proteinFit * 0.35 + goalBoost * 0.2 + bmiBoost * 0.1;
      return { meal, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return ranked.map(({ meal, score }) => ({
    name: meal.name,
    calories: meal.calories,
    protein: meal.protein,
    description: meal.tags.includes("high-protein") ? "High protein option" : "Balanced meal with good macros",
    tier1Reason: `Fits ${preference} preference and medical constraints`,
    tier2Reason: `Ranked by protein need and calorie fit (score ${score.toFixed(1)})`,
    score,
  }));
}
