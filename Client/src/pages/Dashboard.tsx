import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { databases, DB_ID, PROFILES_COLLECTION, MEAL_LOGS_COLLECTION } from "@/integrations/appwrite/client";
import { Query } from "appwrite";
import MacroRing from "@/components/MacroRing";
import MealCard from "@/components/MealCard";
import MealSuggestions from "@/components/MealSuggestions";
import AddMealDialog from "@/components/AddMealDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut, Mail, Flame, Target, ChevronLeft, ChevronRight, History, FileBarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import { format, isToday, isYesterday, addDays, subDays } from "date-fns";
import type { Profile, MealLog } from "@/integrations/appwrite/types";
import { calculateBMR, calculateTDEE, calculateBMI, getBMICategory } from "@/lib/nutrition";

const formatDateLabel = (d: Date) => {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
};

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const fetchProfile = useCallback(async () => {
    if (!user) return null;
    const profileRes = await databases.listDocuments(DB_ID, PROFILES_COLLECTION, [
      Query.equal("user_id", user.$id),
    ]);
    return profileRes.documents[0] as Profile | undefined;
  }, [user]);

  const fetchMealsForDate = useCallback(async (date: Date) => {
    if (!user) return [];
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const mealsRes = await databases.listDocuments(DB_ID, MEAL_LOGS_COLLECTION, [
        Query.equal("user_id", user.$id),
        Query.equal("log_date", dateStr),
        Query.orderAsc("$createdAt"),
      ]);
      return (mealsRes.documents as MealLog[]) || [];
    } catch {
      return [];
    }
  }, [user]);

  const fetchData = useCallback(async (date?: Date) => {
    if (!user) return;
    setLoadingData(true);
    const targetDate = date ?? selectedDate;

    try {
      const p = await fetchProfile();
      if (!p || !p.onboarding_completed) {
        navigate("/onboarding");
        setLoadingData(false);
        return;
      }
      setProfile(p);

      const mealsList = await fetchMealsForDate(targetDate);
      setMeals(mealsList);
    } catch {
      navigate("/onboarding");
    } finally {
      setLoadingData(false);
    }
  }, [user, selectedDate, fetchProfile, fetchMealsForDate, navigate]);

  const loadMealsForDate = useCallback(
    async (date: Date) => {
      setSelectedDate(date);
      setLoadingData(true);
      try {
        const list = await fetchMealsForDate(date);
        setMeals(list);
      } finally {
        setLoadingData(false);
      }
    },
    [fetchMealsForDate]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
      return;
    }
    if (user) fetchData();
  }, [user, authLoading, navigate, fetchData]);

  const handleDateChange = (delta: number) => {
    const next = addDays(selectedDate, delta);
    if (next > new Date()) return;
    loadMealsForDate(next);
  };

  const goToToday = () => {
    loadMealsForDate(new Date());
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full gradient-hero" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Redirecting to setup...</p>
      </div>
    );
  }

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein_g || 0),
      carbs: acc.carbs + (m.carbs_g || 0),
      fat: acc.fat + (m.fat_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const bmiValue = profile.weight_kg && profile.height_cm
    ? calculateBMI(Number(profile.weight_kg), Number(profile.height_cm))
    : null;
  const bmiCategory = bmiValue ? getBMICategory(bmiValue) : null;
  const bmr = profile.weight_kg && profile.height_cm && profile.age && profile.gender
    ? Math.round(calculateBMR(Number(profile.weight_kg), Number(profile.height_cm), Number(profile.age), String(profile.gender)))
    : null;
  const tdee = bmr && profile.activity_level
    ? calculateTDEE(bmr, String(profile.activity_level))
    : null;
  const remainingCalories = Math.max(0, (profile.target_calories || 0) - totals.calories);
  const remainingProtein = Math.max(0, (profile.target_protein || 0) - totals.protein);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img src="/app-logo.png" alt="NutriAI logo" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-display text-xl font-bold text-foreground">NutriAI</span>
          </div>
          <div className="flex items-center gap-2">
            <AddMealDialog onMealAdded={fetchData} />
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} aria-label="Open contact page">
              <Mail className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/results")} aria-label="Open research results">
              <FileBarChart2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
            Hello, {profile.full_name || "there"} 👋
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            {isToday(selectedDate)
              ? "Here's your nutrition overview for today"
              : `Here's your nutrition overview for ${formatDateLabel(selectedDate)}`}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
            { label: "BMI", value: bmiValue ? `${bmiValue} (${bmiCategory})` : "—", icon: Target, color: "text-primary" },
            { label: "Goal", value: profile.goal === "lose" ? "Lose" : profile.goal === "gain" ? "Gain" : "Maintain", icon: Flame, color: "text-accent" },
            { label: "Diet", value: profile.dietary_preference || "—", icon: () => <span className="text-lg">🌿</span>, color: "text-secondary" },
            { label: "Activity", value: profile.activity_level || "—", icon: () => <span className="text-lg">🏃</span>, color: "text-primary" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="shadow-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={s.color}><s.icon className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground font-body">{s.label}</p>
                    <p className="font-semibold text-foreground font-body capitalize">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">{formatDateLabel(selectedDate)}</h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => handleDateChange(-1)} aria-label="View previous day meals">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} disabled={isToday(selectedDate)}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleDateChange(1)} disabled={isToday(selectedDate)} aria-label="View next day meals">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Card className="shadow-card">
            <CardContent className="pt-6 pb-2">
              <h2 className="font-display text-lg mb-4">{formatDateLabel(selectedDate)}'s Macros</h2>
              <div className="flex justify-around flex-wrap gap-4">
                <MacroRing label="Calories" current={totals.calories} target={profile.target_calories || 2000} unit=" kcal" color="hsl(var(--primary))" />
                <MacroRing label="Protein" current={totals.protein} target={profile.target_protein || 100} unit="g" color="hsl(var(--secondary))" />
                <MacroRing label="Carbs" current={totals.carbs} target={profile.target_carbs || 250} unit="g" color="hsl(var(--accent))" />
                <MacroRing label="Fat" current={totals.fat} target={profile.target_fat || 60} unit="g" color="hsl(var(--saffron))" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-xl font-display font-bold text-foreground mb-4">{formatDateLabel(selectedDate)}'s Meals</h2>
            {meals.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <span className="text-4xl">🍽️</span>
                  <p className="text-muted-foreground font-body mt-3">
                    {isToday(selectedDate) ? "No meals logged yet today" : `No meals logged on ${formatDateLabel(selectedDate)}`}
                  </p>
                  <p className="text-sm text-muted-foreground font-body">Click "Log Meal" to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {meals.map((m) => (
                  <MealCard
                    key={m.$id}
                    mealType={m.meal_type}
                    mealName={m.meal_name}
                    calories={m.calories || 0}
                    protein={m.protein_g || 0}
                    carbs={m.carbs_g || 0}
                    imageUrl={m.image_url || undefined}
                  />
                ))}
              </div>
            )}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <History className="w-4 h-4" />
                Meal History
              </h3>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((daysAgo) => {
                  const d = subDays(new Date(), daysAgo);
                  const isSelected = format(selectedDate, "yyyy-MM-dd") === format(d, "yyyy-MM-dd");
                  return (
                    <Button
                      key={daysAgo}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadMealsForDate(d)}
                    >
                      {formatDateLabel(d)}
                    </Button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="text-xl font-display font-bold text-foreground mb-4">AI Recommendations</h2>
            <MealSuggestions
              dietaryPreference={profile.dietary_preference}
              goal={profile.goal}
              remainingCalories={remainingCalories}
              remainingProtein={remainingProtein}
              bmiCategory={bmiCategory || undefined}
              medicalConditions={profile.medical_conditions || []}
            />
            <Card className="shadow-card mt-4">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold font-display">Why these recommendations (XAI)</h3>
                <p className="text-sm text-muted-foreground">
                  Your suggestions are adjusted using your BMI category ({bmiCategory || "N/A"}), activity level
                  ({profile.activity_level || "N/A"}), and goal ({profile.goal || "N/A"}).
                </p>
                <p className="text-sm text-muted-foreground">
                  Estimated BMR: {bmr ?? "N/A"} kcal/day, TDEE: {tdee ?? "N/A"} kcal/day, target calories:
                  {" "}{profile.target_calories || "N/A"} kcal/day, remaining today: {remainingCalories} kcal.
                </p>
                <p className="text-sm text-muted-foreground">
                  Medical constraints applied: {(profile.medical_conditions || []).length > 0
                    ? (profile.medical_conditions || []).join(", ")
                    : "None selected"}.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
