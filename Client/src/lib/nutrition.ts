export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string
): number {
  if (gender === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateTDEE(bmr: number, activityLevel: string): number {
  return Math.round(bmr * (activityMultipliers[activityLevel] || 1.55));
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  if (!heightM) return 0;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export function calculateTargets(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string,
  activityLevel: string,
  goal: string
) {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  let tdee = calculateTDEE(bmr, activityLevel);

  if (goal === "lose") tdee -= 500;
  else if (goal === "gain") tdee += 400;

  const protein = Math.round(weightKg * (goal === "gain" ? 2.0 : 1.6));
  const fat = Math.round((tdee * 0.25) / 9);
  const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);

  return {
    calories: tdee,
    protein,
    carbs,
    fat,
  };
}
