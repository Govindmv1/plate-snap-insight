import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera as CameraIcon, Loader2, Upload, ArrowLeft } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const Scan = () => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [mealWeight, setMealWeight] = useState("");
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();

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
    } catch (error: any) {
      console.error("Camera error:", error);
      toast.error("Failed to capture photo");
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
    } catch (error: any) {
      console.error("Gallery error:", error);
      toast.error("Failed to select photo");
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

      // Save scan to scan_history table
      const { error: scanError } = await supabase.from("scan_history").insert({
        user_id: user.id,
        detected_food_items: data.detectedFoods,
        total_calories: data.nutritionalData?.calories || null,
        protein: data.nutritionalData?.protein || null,
        carbs: data.nutritionalData?.carbs || null,
        fat: data.nutritionalData?.fat || null,
      });

      if (scanError) {
        console.error("Failed to save scan history:", scanError);
      }

      toast.success("Analysis complete!");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error((error as Error).message || "Failed to analyze food");
      } else {
        toast.error("Failed to analyze food");
      }
      console.error("Analysis error:", error);
      toast.error((error as Error).message || "Failed to analyze food");
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
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save meal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Scan Your Meal</h1>
            <p className="text-muted-foreground">Take a photo to analyze nutrition</p>
          </div>
        </div>

        {!capturedImage ? (
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-6 rounded-full bg-gradient-to-br from-primary to-accent">
                  <CameraIcon className="w-12 h-12 text-white" />
                </div>
              </div>
              <CardTitle>Capture Your Meal</CardTitle>
              <CardDescription>Take a photo or choose from gallery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={takePicture}
                className="w-full bg-gradient-to-r from-primary to-accent"
                size="lg"
              >
                <CameraIcon className="mr-2 h-5 w-5" />
                Take Photo
              </Button>
              <Button onClick={pickFromGallery} variant="outline" className="w-full" size="lg">
                <Upload className="mr-2 h-5 w-5" />
                Choose from Gallery
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-card overflow-hidden">
              <CardContent className="p-0">
                <img
                  src={capturedImage}
                  alt="Captured meal"
                  className="w-full h-auto max-h-96 object-cover"
                />
              </CardContent>
            </Card>

            {!analysisResult ? (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Optional: Add Meal Weight</CardTitle>
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
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={analyzeFood}
                      disabled={analyzing}
                      className="flex-1 bg-gradient-to-r from-primary to-accent"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        "Analyze Meal"
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setCapturedImage(null)}>
                      Retake
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {analysisResult.allergenAlerts?.length > 0 && (
                  <Card className="shadow-card border-destructive bg-destructive/5">
                    <CardHeader>
                      <CardTitle className="text-destructive">⚠️ Allergen Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {analysisResult.allergenAlerts.map((alert: string, idx: number) => (
                          <li key={idx} className="text-destructive font-medium">
                            • {alert}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Detected Foods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysisResult.detectedFoods?.map((food: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="font-medium">{food.name}</span>
                          <span className="text-sm text-muted-foreground">{food.portion}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Nutritional Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <p className="text-3xl font-bold text-primary">
                          {analysisResult.nutritionalData?.calories || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Calories</p>
                      </div>
                      <div className="text-center p-4 bg-accent/10 rounded-lg">
                        <p className="text-3xl font-bold text-accent">
                          {analysisResult.nutritionalData?.protein || 0}g
                        </p>
                        <p className="text-sm text-muted-foreground">Protein</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{analysisResult.nutritionalData?.carbs || 0}g</p>
                        <p className="text-sm text-muted-foreground">Carbs</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{analysisResult.nutritionalData?.fat || 0}g</p>
                        <p className="text-sm text-muted-foreground">Fat</p>
                      </div>
                    </div>

                    {analysisResult.recommendations?.length > 0 && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="font-semibold mb-2">💡 Recommendations:</p>
                        <ul className="space-y-1 text-sm">
                          {analysisResult.recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Add Notes (Optional)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., Lunch, Pre-workout meal, Cheat day..."
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={saveMeal}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-primary to-accent"
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
                      <Button variant="outline" onClick={() => setAnalysisResult(null)}>
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
