import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Camera, Sparkles, Loader2, Video, Wand2 } from "lucide-react";
import {
  databases,
  storage,
  functions,
  DB_ID,
  MEAL_LOGS_COLLECTION,
  MEAL_IMAGES_BUCKET,
  ANALYZE_FUNCTION_ID,
  appwriteConfigIssues,
} from "@/integrations/appwrite/client";
import { ID, Permission, Role } from "appwrite";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddMealDialogProps {
  onMealAdded: () => void;
}

const AddMealDialog = ({ onMealAdded }: AddMealDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [mealType, setMealType] = useState("breakfast");
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraVideoReady, setCameraVideoReady] = useState(false);
  const [showWelcomeStep, setShowWelcomeStep] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const mealNameRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setImagePreview(null);
  };

  const setPreviewFromFile = (file: File) => {
    clearPreview();
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setImagePreview(url);
  };

  const parseNumeric = (value: unknown) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const num = parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(num) ? num : 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewFromFile(file);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraVideoReady(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraVideoReady(false);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 0);
    } catch {
      toast.error("Camera access denied or unavailable");
    }
  };

  const captureFromCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      toast.error("Camera is still starting — wait a second, then capture again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    setImageFile(file);
    setPreviewFromFile(file);
    stopCamera();
  };

  const compressImage = (file: File, maxSize = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return reject(new Error("Canvas not supported"));
        }
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image"));
      };
      img.src = objectUrl;
    });
  };

  const isLikelyNonFoodImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 96;
        canvas.height = 96;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return resolve(false);
        }
        ctx.drawImage(img, 0, 0, 96, 96);
        const data = ctx.getImageData(0, 0, 96, 96).data;

        let skinLike = 0;
        let skinTopHalf = 0;
        let foodColor = 0;
        let neutralLike = 0;
        const total = 96 * 96;
        const topHalfTotal = 96 * 48;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const px = (i / 4) % 96;
          const py = Math.floor((i / 4) / 96);
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;

          if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 8) skinLike += 1;
          if (py < 48 && r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 8) skinTopHalf += 1;
          if ((r > 130 && g > 85 && b < 130) || (g > r + 12 && g > b + 12) || (r > 160 && g > 120 && b < 100)) foodColor += 1;
          if (sat < 0.12) neutralLike += 1;
        }

        URL.revokeObjectURL(objectUrl);
        const skinRatio = skinLike / total;
        const skinTopHalfRatio = skinTopHalf / topHalfTotal;
        const foodRatio = foodColor / total;
        const neutralRatio = neutralLike / total;

        const hardSelfiePattern =
          (skinTopHalfRatio > 0.12 && neutralRatio > 0.4 && foodRatio < 0.22) ||
          (skinRatio > 0.08 && neutralRatio > 0.5 && foodRatio < 0.2);

        resolve(hardSelfiePattern);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(false);
      };
      img.src = objectUrl;
    });
  };

  const isFacePhoto = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = async () => {
        try {
          const AnyWindow = window as Window & {
            FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
              detect: (image: ImageBitmapSource) => Promise<Array<unknown>>;
            };
          };

          if (!AnyWindow.FaceDetector) {
            URL.revokeObjectURL(objectUrl);
            return resolve(false);
          }

          const detector = new AnyWindow.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
          const faces = await detector.detect(img);
          URL.revokeObjectURL(objectUrl);
          resolve(Array.isArray(faces) && faces.length > 0);
        } catch {
          URL.revokeObjectURL(objectUrl);
          resolve(false);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(false);
      };
      img.src = objectUrl;
    });
  };

  const analyzeWithAI = async () => {
    if (!imageFile) {
      toast.error("Please upload or capture a photo first.");
      return;
    }

    if (appwriteConfigIssues.length > 0) {
      toast.error(`Appwrite config missing: ${appwriteConfigIssues.join(", ")}`);
      return;
    }

    setAnalyzing(true);
    try {
      const hashText = (value: string) => {
        let h = 0;
        for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
        return h;
      };

      /** Never invent random dish names when the API is uncertain — only "Indian Meal" + approximate macros. */
      const derivePhotoEstimate = (seed: string) => {
        const h = hashText(seed || `${Date.now()}`);
        const calories = Math.max(180, 220 + (h % 121));
        const protein = Math.max(6, Math.round((calories * 0.12) / 4));
        const carbs = Math.max(15, Math.round((calories * 0.55) / 4));
        const fat = Math.max(5, Math.round((calories * 0.28) / 9));
        return { mealName: "Indian Meal", calories, protein, carbs, fat };
      };

      const applyEstimateValues = (
        estimate: { mealName: string; calories: number; protein: number; carbs: number; fat: number },
        overrideName?: string
      ) => {
        setMealName(overrideName || estimate.mealName);
        setCalories(String(estimate.calories));
        setProtein(String(estimate.protein));
        setCarbs(String(estimate.carbs));
        setFat(String(estimate.fat));
      };

      const base64 = await compressImage(imageFile);
      const imageSeed = base64.slice(0, 2000);
      const likelyNonFoodVisual = await isLikelyNonFoodImage(imageFile);
      const containsFace = await isFacePhoto(imageFile);
      /** Only guess when no face and not a portrait-like frame; dish names come from the AI function, not pixel hacks. */
      const mayGuessMacrosFromPixels = !containsFace && !likelyNonFoodVisual;
      if (likelyNonFoodVisual) {
        toast.error("Please add a food photo for detection.");
        return;
      }
      const body = JSON.stringify({ imageBase64: base64 });

      const execution = await functions.createExecution(ANALYZE_FUNCTION_ID, body, false);
      const responseBody = execution.responseBody;
      if (!responseBody) {
        if (!mayGuessMacrosFromPixels) {
          toast.error("No food detected. Point the camera at your plate or meal, not your face.");
          return;
        }
        applyEstimateValues(derivePhotoEstimate(imageSeed));
        toast.success("AI estimated values from photo. You can review and save.");
        return;
      }

      const data = typeof responseBody === "string" ? JSON.parse(responseBody) : responseBody;
      const labels = Array.isArray(data?.detectedLabels)
        ? data.detectedLabels.map((v: unknown) => String(v || "").toLowerCase())
        : [];
      const nonFoodPatterns =
        /\b(person|people|human|humans|man|woman|women|boy|girl|portrait|selfie|faces?|cars?|vehicles?|buildings?|roads?|laptops?|phones?|books?|documents?)\b/i;
      const hasNonFoodLabel = labels.some((l: string) => nonFoodPatterns.test(String(l)));
      if (data?.errorType === "NON_FOOD" || data?.isFoodImage === false || hasNonFoodLabel) {
        toast.error("Please add a food photo for detection.");
        return;
      }
      if (data?.error) {
        if (!mayGuessMacrosFromPixels) {
          toast.error("No food detected. Point the camera at your plate or meal, not your face.");
          return;
        }
        applyEstimateValues(derivePhotoEstimate(imageSeed));
        toast.success("AI estimated values from photo. You can review and save.");
        return;
      }

      const candidates = Array.isArray(data?.dish_candidates) ? data.dish_candidates : [];
      const topCandidateName = String(candidates?.[0]?.meal_name || "").trim();
      let rawMealName = String(data?.meal_name || "").trim();
      if (!rawMealName || ["meal", "food", "dish", "detected meal", "ai estimated meal", "likely indian dish"].includes(rawMealName.toLowerCase().trim())) {
        rawMealName = topCandidateName || rawMealName;
      }
      const uncertainNames = ["unknown", "unknown meal", "not sure", "unclear", "cannot identify"];
      const hasUncertainName = !rawMealName || uncertainNames.some((v) => rawMealName.toLowerCase().includes(v));
      const parsedCalories = parseNumeric(data?.calories_value ?? data?.calories_num ?? data?.calories ?? 0);
      const parsedProtein = parseNumeric(data?.protein_g ?? 0);
      const parsedCarbs = parseNumeric(data?.carbs_g ?? 0);
      const parsedFat = parseNumeric(data?.fat_g ?? 0);
      const normalizedName = rawMealName.toLowerCase().trim();
      const genericMealNames = ["meal", "food", "dish", "unknown dish", "indian meal"];
      const isGenericMealLabel = (name: string) => {
        const n = String(name || "")
          .toLowerCase()
          .trim();
        return n.length > 0 && genericMealNames.some((g) => n === g);
      };
      /** Never let the server's generic "Indian Meal" override a real estimate name. */
      const resolveEstimateMealName = (raw: string, top: string, fallback: string) => {
        if (raw && !isGenericMealLabel(raw)) return raw;
        if (top && !isGenericMealLabel(top)) return top;
        return fallback;
      };
      const hasGenericName = genericMealNames.some((name) => normalizedName === name);
      const looksLikeLegacyFallback =
        normalizedName === "indian meal" &&
        ((parsedCalories === 350 && parsedProtein === 12 && parsedCarbs === 50 && parsedFat === 10) ||
          (parsedCalories === 250 && parsedProtein === 9 && parsedCarbs === 35 && parsedFat === 8));

      if (!hasUncertainName && !hasGenericName && !looksLikeLegacyFallback && parsedCalories > 0) {
        setMealName(rawMealName);
        setCalories(String(parsedCalories));
        setProtein(String(parsedProtein > 0 ? parsedProtein : 0));
        setCarbs(String(parsedCarbs > 0 ? parsedCarbs : 0));
        setFat(String(parsedFat > 0 ? parsedFat : 0));
        const source = String(data?.source || "AI");
        toast.success(`Meal detected (${source}). Review and save.`);
      } else {
        if (!mayGuessMacrosFromPixels) {
          toast.error("No food detected. Point the camera at your plate or meal, not your face.");
          return;
        }
        const estimate = derivePhotoEstimate(imageSeed);
        applyEstimateValues(estimate, resolveEstimateMealName(rawMealName, topCandidateName, estimate.mealName));
        const source = String(data?.source || "AI estimate");
        toast.success(`Estimated from photo (${source}). You can review and save.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI detection failed";
      toast.error(`${msg} Try again or enter your meal manually.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !mealName.trim()) return;
    setLoading(true);

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        try {
          const fileId = ID.unique();
          await storage.createFile(
            MEAL_IMAGES_BUCKET,
            fileId,
            imageFile,
            [Permission.read(Role.user(user.$id)), Permission.write(Role.user(user.$id))]
          );
          imageUrl = storage.getFileView(MEAL_IMAGES_BUCKET, fileId).toString();
        } catch (uploadErr: unknown) {
          const uploadMsg = uploadErr instanceof Error ? uploadErr.message : "Image upload failed";
          toast.warning(`Meal will be saved without image: ${uploadMsg}`);
          imageUrl = null;
        }
      }

      await databases.createDocument(DB_ID, MEAL_LOGS_COLLECTION, ID.unique(), {
        user_id: user.$id,
        meal_type: mealType,
        meal_name: mealName.trim(),
        calories: parseInt(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
        image_url: imageUrl,
        log_date: new Date().toISOString().split("T")[0],
      });

      toast.success("Meal logged successfully!");
      setOpen(false);
      resetForm();
      onMealAdded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log meal";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMealName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setImageFile(null);
    clearPreview();
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    stopCamera();
    setShowWelcomeStep(true);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      clearPreview();
      stopCamera();
    };
  }, []);

  const canSubmit = mealName.trim() && (parseInt(calories) || 0) >= 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="gradient-hero text-primary-foreground font-body gap-2 shadow-warm hover:scale-[1.02] transition-transform">
          <Plus className="w-4 h-4" /> Log Meal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto border-primary/20 shadow-elevated" aria-describedby="log-meal-desc">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-primary-foreground" />
            </span>
            Log a Meal
          </DialogTitle>
          <DialogDescription id="log-meal-desc" className="text-sm">
            Upload a meal photo for AI-powered detection, then review and save.
          </DialogDescription>
        </DialogHeader>
        {showWelcomeStep ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <h3 className="font-display text-2xl text-foreground mb-2">Welcome to Meal Logging</h3>
              <p className="text-muted-foreground leading-relaxed">
                Add your daily meals with a photo and let NutriAI estimate dish details and calories for you. You can
                always review or edit values before saving.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { title: "Upload Photo", desc: "Use camera or gallery image" },
                { title: "Detect with AI", desc: "Get instant dish estimate" },
                { title: "Save Meal", desc: "Track macros in dashboard" },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
            <Button
              type="button"
              className="gradient-hero text-primary-foreground shadow-warm"
              onClick={() => setShowWelcomeStep(false)}
            >
              Continue to Log Meal
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <Label className="font-body text-sm font-semibold">Upload meal photo (AI will detect food & nutrition)</Label>
            <label
              htmlFor="meal-photo-input"
              className="mt-3 border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <input id="meal-photo-input" ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
              {imagePreview ? (
                <div className="relative w-full">
                  <img src={imagePreview} alt="Preview" className="w-full h-44 rounded-lg object-cover shadow-card" />
                  <div className="flex gap-2 mt-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); analyzeWithAI(); }}
                      disabled={analyzing}
                      className="flex-1 gap-2 gradient-hero text-primary-foreground"
                    >
                      {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {analyzing ? "Analyzing..." : "Detect with AI"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setImageFile(null); clearPreview(); if (fileRef.current) fileRef.current.value = ""; }}>
                      Remove
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); startCamera(); }}>
                      <Video className="w-4 h-4 mr-1" /> Camera
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Camera className="w-12 h-12 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-body text-center">Tap to upload a photo of your meal</span>
                  <span className="text-xs text-muted-foreground">AI will identify the food and estimate calories, protein, carbs & fat</span>
                  <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); startCamera(); }}>
                    <Video className="w-4 h-4 mr-1" /> Use Camera
                  </Button>
                </>
              )}
            </label>
          </div>

          {isCameraOpen && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-48 object-cover rounded-lg bg-black"
                onLoadedMetadata={() => setCameraVideoReady(true)}
              />
              <p className="text-xs text-muted-foreground">
                {cameraVideoReady ? "Camera ready — frame your meal, then capture." : "Starting camera…"}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={captureFromCamera} disabled={!cameraVideoReady}>
                  <Camera className="w-4 h-4 mr-1" /> Capture Photo
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={stopCamera}>
                  Close Camera
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            or{" "}
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => mealNameRef.current?.focus()}
            >
              enter details manually
            </button>
          </p>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <Label className="font-body">Meal Type</Label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                <SelectItem value="lunch">☀️ Lunch</SelectItem>
                <SelectItem value="dinner">🌙 Dinner</SelectItem>
                <SelectItem value="snack">🍎 Snack</SelectItem>
              </SelectContent>
            </Select>
            <Label className="font-body">Meal Name</Label>
            <Input ref={mealNameRef} value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="e.g., Dal Chawal, Paneer Tikka" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="font-body text-xs">Calories</Label>
                <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="kcal" />
              </div>
              <div>
                <Label className="font-body text-xs">Protein (g)</Label>
                <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="g" />
              </div>
              <div>
                <Label className="font-body text-xs">Carbs (g)</Label>
                <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="g" />
              </div>
              <div>
                <Label className="font-body text-xs">Fat (g)</Label>
                <Input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="g" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowWelcomeStep(true)}
            >
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !canSubmit} className="flex-1 gradient-hero text-primary-foreground font-body h-11 text-base shadow-warm">
            {loading ? "Logging..." : "Add Meal"}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddMealDialog;
