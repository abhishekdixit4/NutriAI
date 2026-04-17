import { useState } from "react";
import { Flame, Drumstick, Wheat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MealCardProps {
  mealType: string;
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  imageUrl?: string;
}

const mealIcons: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

const MealCard = ({ mealType, mealName, calories, protein, carbs, imageUrl }: MealCardProps) => {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const canShowImage = Boolean(imageUrl) && !imageLoadFailed;

  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow duration-300 overflow-hidden">
      <CardContent className="p-4 flex gap-4">
        {canShowImage ? (
          <img
            src={imageUrl}
            alt={mealName}
            className="w-16 h-16 rounded-lg object-cover"
            onError={() => setImageLoadFailed(true)}
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl">
            {mealIcons[mealType] || "🍽️"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary uppercase tracking-wide font-body">{mealType}</p>
          <p className="font-semibold text-foreground truncate font-body">{mealName}</p>
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground font-body">
            <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-accent" />{calories} kcal</span>
            <span className="flex items-center gap-1"><Drumstick className="w-3 h-3 text-secondary" />{protein}g</span>
            <span className="flex items-center gap-1"><Wheat className="w-3 h-3 text-primary" />{carbs}g</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MealCard;
