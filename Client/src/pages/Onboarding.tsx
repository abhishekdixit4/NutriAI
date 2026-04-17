import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { databases, DB_ID, PROFILES_COLLECTION } from "@/integrations/appwrite/client";
import { ID, Query } from "appwrite";
import { useAuth } from "@/contexts/AuthContext";
import { calculateTargets } from "@/lib/nutrition";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [form, setForm] = useState({
    full_name: "",
    age: "",
    gender: "male",
    height_cm: "",
    weight_kg: "",
    activity_level: "moderate",
    dietary_preference: "vegetarian",
    goal: "maintain",
  });

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    if (authLoading || !user) return;
    const check = async () => {
      try {
        const res = await databases.listDocuments(DB_ID, PROFILES_COLLECTION, [
          Query.equal("user_id", user.$id),
        ]);
        const profile = res.documents[0] as { onboarding_completed?: boolean } | undefined;
        if (profile?.onboarding_completed) {
          navigate("/dashboard", { replace: true });
          return;
        }
        if (profile) {
          setForm((p) => ({
            ...p,
            full_name: (profile as { full_name?: string }).full_name ?? "",
            age: String((profile as { age?: number }).age ?? ""),
            gender: (profile as { gender?: string }).gender ?? "male",
            height_cm: String((profile as { height_cm?: number }).height_cm ?? ""),
            weight_kg: String((profile as { weight_kg?: number }).weight_kg ?? ""),
            activity_level: (profile as { activity_level?: string }).activity_level ?? "moderate",
            dietary_preference: (profile as { dietary_preference?: string }).dietary_preference ?? "vegetarian",
            goal: (profile as { goal?: string }).goal ?? "maintain",
          }));
        }
      } catch {
        // No profile yet, show form
      } finally {
        setCheckingProfile(false);
      }
    };
    check();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [authLoading, user, navigate]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.age || !form.height_cm || !form.weight_kg) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const targets = calculateTargets(
      parseFloat(form.weight_kg),
      parseFloat(form.height_cm),
      parseInt(form.age),
      form.gender,
      form.activity_level,
      form.goal
    );

    try {
      const existing = await databases.listDocuments(DB_ID, PROFILES_COLLECTION, [
        Query.equal("user_id", user.$id),
      ]);

      const doc = {
        user_id: user.$id,
        full_name: form.full_name || null,
        age: parseInt(form.age),
        gender: form.gender,
        height_cm: parseFloat(form.height_cm),
        weight_kg: parseFloat(form.weight_kg),
        activity_level: form.activity_level,
        dietary_preference: form.dietary_preference,
        goal: form.goal,
        target_calories: targets.calories,
        target_protein: targets.protein,
        target_carbs: targets.carbs,
        target_fat: targets.fat,
        onboarding_completed: true,
      };

      if (existing.documents.length > 0) {
        await databases.updateDocument(DB_ID, PROFILES_COLLECTION, existing.documents[0].$id, doc);
      } else {
        await databases.createDocument(DB_ID, PROFILES_COLLECTION, ID.unique(), doc);
      }

      toast.success("Profile setup complete!");
      navigate("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full gradient-hero" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Link
        to="/dashboard"
        className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <img src="/app-logo.png" alt="NutriAI logo" className="mx-auto h-12 w-12 rounded-md object-cover" />
          <h1 className="text-3xl font-bold font-display text-foreground mt-2">Set Up Your Profile</h1>
          <p className="text-muted-foreground font-body mt-2">Tell us about yourself for personalized nutrition plans</p>
        </div>

        <Card className="shadow-elevated">
          <CardContent className="p-6 space-y-5">
            <div>
              <Label className="font-body">Full Name</Label>
              <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Your name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-body">Age *</Label>
                <Input type="number" value={form.age} onChange={(e) => update("age", e.target.value)} placeholder="25" />
              </div>
              <div>
                <Label className="font-body">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-body">Height (cm) *</Label>
                <Input type="number" value={form.height_cm} onChange={(e) => update("height_cm", e.target.value)} placeholder="170" />
              </div>
              <div>
                <Label className="font-body">Weight (kg) *</Label>
                <Input type="number" value={form.weight_kg} onChange={(e) => update("weight_kg", e.target.value)} placeholder="70" />
              </div>
            </div>

            <div>
              <Label className="font-body">Activity Level</Label>
              <Select value={form.activity_level} onValueChange={(v) => update("activity_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="light">Lightly Active</SelectItem>
                  <SelectItem value="moderate">Moderately Active</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="very_active">Very Active</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-body">Dietary Preference</Label>
              <Select value={form.dietary_preference} onValueChange={(v) => update("dietary_preference", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="non-vegetarian">Non-Vegetarian</SelectItem>
                  <SelectItem value="eggetarian">Eggetarian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-body">Goal</Label>
              <Select value={form.goal} onValueChange={(v) => update("goal", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Lose Weight</SelectItem>
                  <SelectItem value="maintain">Maintain Weight</SelectItem>
                  <SelectItem value="gain">Gain Muscle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full gradient-hero text-primary-foreground font-body text-lg py-6 gap-2"
            >
              {loading ? "Saving..." : "Continue to Dashboard"} <ArrowRight className="w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Onboarding;
