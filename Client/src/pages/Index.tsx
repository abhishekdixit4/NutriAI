import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowRight, Brain, Leaf, Shield, BarChart3, Utensils, Target } from "lucide-react";
import heroFood from "@/assets/hero-food.jpg";

const features = [
  { icon: Brain, slug: "ai-powered-plans", title: "AI-Powered Plans", desc: "Personalized nutrition recommendations using intelligent algorithms" },
  { icon: Leaf, slug: "indian-diet-focus", title: "Indian Diet Focus", desc: "Built around real Indian food items and dietary patterns" },
  { icon: BarChart3, slug: "track-daily-macros", title: "Track Daily Macros", desc: "Monitor calories, protein, carbs & fat intake effortlessly" },
  { icon: Utensils, slug: "smart-meal-logging", title: "Smart Meal Logging", desc: "Log meals with photos and get next meal suggestions" },
  { icon: Shield, slug: "explainable-ai", title: "Explainable AI", desc: "Understand why each recommendation is made for you" },
  { icon: Target, slug: "healthy-habits-coach", title: "Healthy Habits Coach", desc: "Stay consistent with reminders, mini goals, and weekly nutrition check-ins" },
];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img src="/app-logo.png" alt="NutriAI logo" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-display text-xl font-bold text-foreground">NutriAI</span>
          </div>
          <Button asChild variant="outline" className="font-body gap-2">
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium font-body mb-6">
                🇮🇳 Made for Indian Diets
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-tight text-foreground mb-6">
                Your AI-Powered{" "}
                <span className="text-gradient">Nutrition</span>{" "}
                Companion
              </h1>
              <p className="text-lg text-muted-foreground font-body mb-8 max-w-lg">
                Get personalized Indian diet plans based on your health goals, BMI, and preferences. 
                Track meals, monitor macros, and let AI guide your nutrition journey.
              </p>
              <Button
                size="lg"
                asChild
                className="gradient-hero text-primary-foreground font-body text-lg px-8 py-6 gap-2 shadow-warm hover:scale-105 transition-transform"
              >
                <Link to="/login">Get Started Free <ArrowRight className="w-5 h-5" /></Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-elevated">
                <img src={heroFood} alt="Indian food spread" className="w-full h-80 lg:h-[420px] object-cover" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-card rounded-xl p-4 shadow-elevated">
                <p className="text-sm font-body text-muted-foreground">Daily Goal</p>
                <p className="text-2xl font-bold text-primary font-body">2,100 <span className="text-sm text-muted-foreground">kcal</span></p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
              Why NutriAI?
            </h2>
            <p className="text-muted-foreground font-body max-w-md mx-auto">
              A smarter approach to Indian nutrition, powered by AI
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all cursor-pointer border border-transparent hover:border-primary/20"
                onClick={() => navigate(`/features/${f.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/features/${f.slug}`);
                  }
                }}
              >
                <div className="w-12 h-12 rounded-lg gradient-hero flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground font-body">{f.desc}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  Read details <ArrowRight className="w-4 h-4" />
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="gradient-hero rounded-2xl p-12 md:p-16 shadow-elevated"
          >
            <h2 className="text-3xl md:text-4xl font-bold font-display text-primary-foreground mb-4">
              Start Your Nutrition Journey Today
            </h2>
            <Button
              size="lg"
              asChild
              className="bg-card text-foreground hover:bg-card/90 font-body text-lg px-8 py-6 gap-2"
            >
              <Link to="/login">Login <ArrowRight className="w-5 h-5" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground font-body">
            © 2026 NutriAI — AI-Based Nutrition Recommendation System
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
