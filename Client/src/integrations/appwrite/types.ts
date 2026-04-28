export interface Profile {
  $id: string;
  user_id: string;
  full_name?: string | null;
  age?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: string | null;
  dietary_preference?: string | null;
  goal?: string | null;
  target_calories?: number | null;
  target_protein?: number | null;
  target_carbs?: number | null;
  target_fat?: number | null;
  medical_conditions?: string[] | null;
  allergen_flags?: string[] | null;
  cultural_preference?: string | null;
  onboarding_completed?: boolean | null;
}

export interface MealLog {
  $id: string;
  user_id: string;
  meal_type: string;
  meal_name: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  image_url?: string | null;
  log_date: string;
  created_at?: string;
}
