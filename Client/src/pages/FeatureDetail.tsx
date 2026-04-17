import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BarChart3, Brain, CheckCircle2, Leaf, Shield, Target, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const featureDetails = {
  "ai-powered-plans": {
    title: "AI-Powered Plans",
    icon: Brain,
    description:
      "NutriAI studies your goal, age, activity, and meal preferences to create a realistic plan you can follow daily.",
    points: [
      "Builds daily calorie and macro targets from your profile inputs.",
      "Suggests practical meal patterns for Indian home food.",
      "Adapts guidance based on your goal: lose, maintain, or gain.",
    ],
    highlights: ["Goal-based recommendations", "Easy to follow routine", "Weekly smart adjustments"],
  },
  "indian-diet-focus": {
    title: "Indian Diet Focus",
    icon: Leaf,
    description:
      "Recommendations are designed around Indian kitchens so your plan feels natural, affordable, and practical for daily life.",
    points: [
      "Designed around common Indian dishes and food combinations.",
      "Supports vegetarian and mixed dietary preferences.",
      "Keeps recommendations realistic for local ingredients.",
    ],
    highlights: ["Regional food familiarity", "Flexible meal choices", "Works with family meals"],
  },
  "track-daily-macros": {
    title: "Track Daily Macros",
    icon: BarChart3,
    description:
      "You get a clear macro breakdown after every meal so it is easy to understand progress and fix gaps quickly.",
    points: [
      "Tracks calories, protein, carbs, and fats for each meal.",
      "Shows simple daily progress against target values.",
      "Helps you quickly identify nutrition gaps.",
    ],
    highlights: ["Real-time macro view", "Daily target tracking", "Simple trend insights"],
  },
  "smart-meal-logging": {
    title: "Smart Meal Logging",
    icon: Utensils,
    description:
      "Logging meals is fast and flexible with manual input, image-based analysis, and categorized timeline history.",
    points: [
      "Log meals manually or detect from a photo.",
      "Save meals by breakfast, lunch, dinner, and snacks.",
      "Keep a practical day-by-day food history.",
    ],
    highlights: ["Fast meal capture", "Photo + manual support", "Organized daily timeline"],
  },
  "explainable-ai": {
    title: "Explainable AI",
    icon: Shield,
    description:
      "Every recommendation includes a clear reason so users understand what to do, why it matters, and how to improve.",
    points: [
      "Shows recommendations with clear, understandable context.",
      "Lets you review and edit AI-detected values.",
      "Keeps final control with the user before saving.",
    ],
    highlights: ["Transparent recommendations", "User control first", "Confidence in every suggestion"],
  },
  "healthy-habits-coach": {
    title: "Healthy Habits Coach",
    icon: Target,
    description:
      "NutriAI helps you stay consistent by breaking health goals into small habits that are easier to maintain every week.",
    points: [
      "Set mini weekly goals for hydration, steps, and balanced meals.",
      "Get reminder prompts for meal timing and routine consistency.",
      "View habit streaks to stay motivated and accountable.",
    ],
    highlights: ["Small daily actions", "Habit consistency support", "Motivation with progress streaks"],
  },
} as const;

const FeatureDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const feature = slug ? featureDetails[slug as keyof typeof featureDetails] : undefined;

  if (!feature) {
    return <Navigate to="/" replace />;
  }

  const Icon = feature.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <img src="/app-logo.png" alt="NutriAI logo" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-display text-xl font-bold text-foreground">NutriAI</span>
          </div>
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <Card className="max-w-4xl mx-auto border-primary/10 shadow-elevated">
          <CardHeader className="space-y-5">
            <div className="w-14 h-14 rounded-xl gradient-hero flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-primary/80 mb-2">Feature Deep Dive</p>
              <CardTitle className="text-3xl font-display">{feature.title}</CardTitle>
            </div>
            <p className="text-muted-foreground font-body leading-relaxed">{feature.description}</p>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold font-display mb-4 text-foreground">What you get</h3>
              <div className="space-y-3">
                {feature.points.map((point) => (
                  <div key={point} className="flex items-start gap-3 rounded-lg bg-muted/50 border border-border p-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-muted-foreground font-body">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold font-display mb-4 text-foreground">Why it is useful</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {feature.highlights.map((highlight) => (
                  <div key={highlight} className="rounded-lg bg-primary/10 text-primary border border-primary/20 px-4 py-3 text-sm font-medium">
                    {highlight}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl gradient-hero p-6 text-primary-foreground">
              <h3 className="text-xl font-semibold font-display mb-2">Ready to try this in your daily plan?</h3>
              <p className="text-primary-foreground/90 font-body mb-4">
                Create your profile once and NutriAI will personalize this feature to your goals, meals, and routine.
              </p>
              <Button asChild className="bg-card text-foreground hover:bg-card/90">
                <Link to="/login">
                  Continue with NutriAI <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FeatureDetail;
