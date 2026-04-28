export const clinicalRules = {
  diabetes: {
    requiredTags: ["low-gi", "high-fibre"],
    maxMealCalories: 340,
  },
  hypertension: {
    excludedMeals: ["Fish Curry"],
    note: "Prefer lower-sodium options",
  },
  obesity: {
    maxMealCalories: 320,
    preferredTags: ["light", "high-fibre"],
  },
} as const;

export const goalMacroHints = {
  lose: { proteinMultiplier: 1.7, calorieAdjustment: -450 },
  maintain: { proteinMultiplier: 1.5, calorieAdjustment: 0 },
  gain: { proteinMultiplier: 2.0, calorieAdjustment: 350 },
} as const;
