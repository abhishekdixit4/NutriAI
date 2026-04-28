import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { recipes } from "@/data/recipes";
import { generateHybridRecommendations } from "@/lib/recommendation";

interface Suggestion {
  name: string;
  calories: number;
  protein: number;
  description: string;
  tier1Reason: string;
  tier2Reason: string;
  score: number;
}

interface MealSuggestionsProps {
  dietaryPreference?: string | null;
  goal?: string | null;
  remainingCalories?: number;
  remainingProtein?: number;
  bmiCategory?: string;
  medicalConditions?: string[];
}

const MealSuggestions = ({
  dietaryPreference,
  goal,
  remainingCalories = 0,
  remainingProtein = 0,
  bmiCategory,
  medicalConditions = [],
}: MealSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Suggestion | null>(null);

  useEffect(() => {
    setSuggestions(
      generateHybridRecommendations({
        dietaryPreference,
        goal,
        bmiCategory,
        remainingCalories,
        remainingProtein,
        medicalConditions,
      })
    );
  }, [dietaryPreference, goal, bmiCategory, remainingCalories, remainingProtein, medicalConditions]);

  const recipe = selectedRecipe ? recipes[selectedRecipe.name] : null;
  const safeRemaining = Math.max(0, Math.round(remainingCalories));

  if (suggestions.length === 0) return null;

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Sparkles className="w-5 h-5 text-primary" />
            Suggested Next Meals
          </CardTitle>
          <p className="text-xs text-muted-foreground font-body">
            Based on your profile: {dietaryPreference || "balanced"} diet, {goal || "maintain"} goal,
            {" "}BMI category {bmiCategory || "N/A"}, and about {safeRemaining} kcal left today.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedRecipe(s)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left cursor-pointer"
            >
              <div>
                <p className="font-semibold text-sm text-foreground font-body">{s.name}</p>
                <p className="text-xs text-muted-foreground font-body">{s.description}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Tier-1: {s.tier1Reason}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Tier-2: {s.tier2Reason}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary font-body">{s.calories} kcal</p>
                <p className="text-xs text-secondary font-body">{s.protein}g protein</p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedRecipe?.name}</DialogTitle>
          </DialogHeader>
          {selectedRecipe && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span className="font-semibold text-primary">{selectedRecipe.calories} kcal</span>
                <span className="text-secondary">{selectedRecipe.protein}g protein</span>
              </div>
              {recipe ? (
                <>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Ingredients</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {recipe.ingredients.map((ing, i) => (
                        <li key={i}>{ing}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Method</h4>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                      {recipe.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Recipe not available.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MealSuggestions;
