import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera as CameraIcon, Loader2, Upload, ArrowLeft, Sparkles, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const Scan = () => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    detectedFoods?: Array<{ name: string; portion: string }>;
    nutritionalData?: { calories: number; protein: number; carbs: number; fat: number };
    allergenAlerts?: string[];
    recommendations?: string[];
  } | null>(null);
  const [mealWeight, setMealWeight] = useState("");
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();

  // Refs
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop the camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowLiveCamera(false);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start live camera using browser getUserMedia
  const startLiveCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setShowLiveCamera(true);
      // Wait for video element to appear, then attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("Browser camera error:", err);
      toast.error("Camera access denied or not available");
    }
  };

  // Capture a frame from the live camera
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);
    setAnalysisResult(null);
    stopCamera();
  };

  // Handle gallery file input change
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
      setAnalysisResult(null);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const takePicture = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (image.base64String) {
        const imageData = `data:image/${image.format};base64,${image.base64String}`;
        setCapturedImage(imageData);
        setAnalysisResult(null);
      }
    } catch (error) {
      console.error("Capacitor camera not available, using browser camera");
      // Browser fallback: open live camera
      startLiveCamera();
    }
  };

  const pickFromGallery = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });

      if (image.base64String) {
        const imageData = `data:image/${image.format};base64,${image.base64String}`;
        setCapturedImage(imageData);
        setAnalysisResult(null);
      }
    } catch (error) {
      console.error("Capacitor gallery not available, using browser fallback");
      galleryInputRef.current?.click();
    }
  };

  const analyzeFood = async () => {
    if (!capturedImage) return;

    setAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("allergies, dietary_preferences")
        .eq("user_id", user.id)
        .single();

      const { data, error } = await supabase.functions.invoke("analyze-food", {
        body: {
          imageBase64: capturedImage,
          userAllergies: profile?.allergies || [],
          dietaryPreferences: profile?.dietary_preferences || [],
          mealWeight: mealWeight ? parseFloat(mealWeight) : null,
        },
      });

      if (error) throw error;

      setAnalysisResult(data);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analysis error:", error);
      const err = error as Error;
      toast.error(err.message || "Failed to analyze food");
    } finally {
      setAnalyzing(false);
    }
  };

  const saveMeal = async () => {
    if (!analysisResult || !capturedImage) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("meals").insert({
        user_id: user.id,
        image_url: capturedImage,
        detected_foods: analysisResult.detectedFoods,
        nutritional_data: analysisResult.nutritionalData,
        meal_weight: mealWeight ? parseFloat(mealWeight) : null,
        allergen_alerts: analysisResult.allergenAlerts || [],
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Meal saved successfully!");
      navigate("/history");
    } catch (error) {
      console.error("Save error:", error);
      const err = error as Error;
      toast.error(err.message || "Failed to save meal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden file input for gallery fallback */}
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Live Camera Overlay */}
      {showLiveCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-white font-semibold text-lg">Take Photo</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={stopCamera}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 flex justify-center">
            <button
              onClick={captureFrame}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-all active:scale-90 flex items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
          </div>
        </div>
      )}

      {/* Mini Hero */}
      <div className="relative h-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-accent"></div>
        <div className="absolute top-5 left-[15%] w-20 h-20 bg-white/10 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-5 right-[15%] w-28 h-28 bg-accent/20 rounded-full blur-2xl animate-float delay-200"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-4 z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white animate-slide-up">Scan Your Meal</h1>
            <p className="text-white/70 text-sm animate-slide-up delay-100">Take a photo to analyze nutrition</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-4 relative z-10 space-y-6 pb-8">
        {!capturedImage ? (
          <Card className="glass-panel hover-lift animate-slide-up">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-2xl blur-lg opacity-60 animate-pulse"></div>
                  <div className="relative p-8 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
                    <CameraIcon className="w-14 h-14 text-white" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-xl">Capture Your Meal</CardTitle>
              <CardDescription>Take a photo or choose from gallery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={takePicture}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/20 rounded-xl h-12"
                size="lg"
              >
                <CameraIcon className="mr-2 h-5 w-5" />
                Take Photo
              </Button>
              <Button onClick={pickFromGallery} variant="outline" className="w-full hover:bg-primary/10 rounded-xl h-12" size="lg">
                <Upload className="mr-2 h-5 w-5" />
                Choose from Gallery
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Captured Image */}
            <Card className="glass-panel overflow-hidden hover-lift animate-scale-in">
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured meal"
                  className="w-full h-auto max-h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </div>
            </Card>

            {!analysisResult ? (
              <Card className="glass-panel hover-lift animate-slide-up delay-100">
                <CardHeader>
                  <CardTitle>Add Meal Weight (Optional)</CardTitle>
                  <CardDescription>For more accurate nutritional estimates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Meal Weight (grams)</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={mealWeight}
                      onChange={(e) => setMealWeight(e.target.value)}
                      placeholder="e.g., 300"
                      className="transition-all focus:ring-2 focus:ring-primary/20 rounded-xl"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={analyzeFood}
                      disabled={analyzing}
                      className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 rounded-xl shadow-lg shadow-primary/20"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Analyze Meal
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setCapturedImage(null)} className="hover:bg-primary/10 rounded-xl">
                      Retake
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Allergen Alerts */}
                {analysisResult.allergenAlerts?.length > 0 && (
                  <Card className="glass-panel border-destructive/30 bg-destructive/5 animate-slide-up">
                    <CardHeader>
                      <CardTitle className="text-destructive flex items-center gap-2">
                        <span className="text-xl">⚠️</span> Allergen Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.allergenAlerts.map((alert: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-destructive/20 text-destructive font-medium rounded-full text-sm animate-scale-in">
                            {alert}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detected Foods */}
                <Card className="glass-panel hover-lift animate-slide-up delay-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">🍽️</span> Detected Foods
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysisResult.detectedFoods?.map((food, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-muted/50 rounded-xl border hover:bg-muted transition-colors">
                          <span className="font-medium">{food.name}</span>
                          <span className="text-sm text-muted-foreground bg-background px-2 py-1 rounded-lg">{food.portion}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Nutritional Information */}
                <Card className="glass-panel hover-lift animate-slide-up delay-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">📊</span> Nutritional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 animate-scale-in">
                        <p className="text-4xl font-bold text-amber-600">
                          {analysisResult.nutritionalData?.calories || 0}
                        </p>
                        <p className="text-sm text-muted-foreground font-medium">Calories</p>
                      </div>
                      <div className="text-center p-5 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/20 animate-scale-in delay-100">
                        <p className="text-4xl font-bold text-rose-600">
                          {analysisResult.nutritionalData?.protein || 0}g
                        </p>
                        <p className="text-sm text-muted-foreground font-medium">Protein</p>
                      </div>
                      <div className="text-center p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 animate-scale-in delay-200">
                        <p className="text-3xl font-bold text-blue-600">{analysisResult.nutritionalData?.carbs || 0}g</p>
                        <p className="text-sm text-muted-foreground font-medium">Carbs</p>
                      </div>
                      <div className="text-center p-5 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 animate-scale-in delay-300">
                        <p className="text-3xl font-bold text-violet-600">{analysisResult.nutritionalData?.fat || 0}g</p>
                        <p className="text-sm text-muted-foreground font-medium">Fat</p>
                      </div>
                    </div>

                    {analysisResult.recommendations?.length > 0 && (
                      <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <p className="font-semibold mb-2 flex items-center gap-2">
                          <span>💡</span> Recommendations
                        </p>
                        <ul className="space-y-1 text-sm">
                          {analysisResult.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary">•</span> {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes Section */}
                <Card className="glass-panel hover-lift animate-slide-up delay-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">📝</span> Add Notes (Optional)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., Lunch, Pre-workout meal, Cheat day..."
                      rows={3}
                      className="transition-all focus:ring-2 focus:ring-primary/20 rounded-xl"
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={saveMeal}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 rounded-xl shadow-lg shadow-primary/20"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Meal"
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setAnalysisResult(null)} className="hover:bg-primary/10 rounded-xl">
                        Re-analyze
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scan;
