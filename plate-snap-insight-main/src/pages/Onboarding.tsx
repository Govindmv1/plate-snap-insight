import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

const commonAllergies = ["Peanuts", "Tree Nuts", "Dairy", "Eggs", "Soy", "Wheat/Gluten", "Shellfish", "Fish"];
const dietaryPrefs = ["Vegan", "Vegetarian", "Keto", "Paleo", "Low-Carb", "Low-Sodium", "Halal", "Kosher"];
const healthGoals = ["Weight Loss", "Muscle Gain", "Balanced Diet", "Better Energy", "Improved Health"];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    allergies: [] as string[],
    dietaryPreferences: [] as string[],
    healthGoals: [] as string[],
  });

  // Check if profile already exists on mount
  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      // If profile already exists, redirect to profile page for editing
      if (data) {
        navigate("/profile");
        return;
      }
    } catch (error) {
      // No profile exists, continue with onboarding
    } finally {
      setLoading(false);
    }
  };

  const handleArrayToggle = (field: keyof typeof formData, value: string) => {
    const current = formData[field] as string[];
    if (current.includes(value)) {
      setFormData({ ...formData, [field]: current.filter(item => item !== value) });
    } else {
      setFormData({ ...formData, [field]: [...current, value] });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase.from("profiles").insert({
        user_id: user.id,
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        allergies: formData.allergies,
        dietary_preferences: formData.dietaryPreferences,
        health_goals: formData.healthGoals,
      });

      if (error) throw error;
      
      toast.success("Profile created successfully!");
      navigate("/");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to create profile");
      } else {
        toast.error("Failed to create profile");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking for existing profile
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-2xl shadow-elevated">
        <CardHeader>
          <CardTitle className="text-2xl">Setup Your Profile</CardTitle>
          <CardDescription>Step {step} of 3 - Help us personalize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    placeholder="Male/Female/Other"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    placeholder="170"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="70"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Allergies & Dietary Restrictions</Label>
                <div className="grid grid-cols-2 gap-3">
                  {commonAllergies.map((allergy) => (
                    <div key={allergy} className="flex items-center space-x-2">
                      <Checkbox
                        id={allergy}
                        checked={formData.allergies.includes(allergy)}
                        onCheckedChange={() => handleArrayToggle("allergies", allergy)}
                      />
                      <label htmlFor={allergy} className="text-sm cursor-pointer">
                        {allergy}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Dietary Preferences</Label>
                <div className="grid grid-cols-2 gap-3">
                  {dietaryPrefs.map((pref) => (
                    <div key={pref} className="flex items-center space-x-2">
                      <Checkbox
                        id={pref}
                        checked={formData.dietaryPreferences.includes(pref)}
                        onCheckedChange={() => handleArrayToggle("dietaryPreferences", pref)}
                      />
                      <label htmlFor={pref} className="text-sm cursor-pointer">
                        {pref}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Label>Health Goals</Label>
              <div className="grid grid-cols-2 gap-3">
                {healthGoals.map((goal) => (
                  <div key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal}
                      checked={formData.healthGoals.includes(goal)}
                      onCheckedChange={() => handleArrayToggle("healthGoals", goal)}
                    />
                    <label htmlFor={goal} className="text-sm cursor-pointer">
                      {goal}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !formData.name}
                className="ml-auto"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.name}
                className="ml-auto bg-gradient-to-r from-primary to-accent"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  <>Complete Setup</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
