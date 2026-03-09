import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Target } from "lucide-react";

const activityLevels = ["sedentary", "light", "moderate", "active", "very_active"];
const dietPlanTypes = ["cut", "bulk", "maintain"];
const exerciseTypes = ["Strength Training", "Cardio", "HIIT", "Yoga", "Swimming", "Cycling", "Running", "Walking"];

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    target_weight: "",
    allergies: [] as string[],
    dietary_preferences: [] as string[],
    health_goals: [] as string[],
    daily_calorie_goal: 2000,
    activity_level: "moderate",
    diet_plan_type: "maintain",
    preferred_exercises: [] as string[],
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // If no profile exists, redirect to onboarding
      if (!data || error?.code === 'PGRST116') {
        navigate("/onboarding");
        return;
      }

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.name || "",
          age: data.age?.toString() || "",
          gender: data.gender || "",
          height: data.height?.toString() || "",
          weight: data.weight?.toString() || "",
          target_weight: data.target_weight?.toString() || "",
          allergies: data.allergies || [],
          dietary_preferences: data.dietary_preferences || [],
          health_goals: data.health_goals || [],
          daily_calorie_goal: data.daily_calorie_goal || 2000,
          activity_level: data.activity_level || "moderate",
          diet_plan_type: data.diet_plan_type || "maintain",
          preferred_exercises: data.preferred_exercises || [],
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      console.log("Saving profile for user:", user.id);

      // First, try to update with all fields
      // If that fails due to schema cache issue, we'll fall back to basic fields only
      const profileData = {
        user_id: user.id,
        name: profile.name,
        age: profile.age ? parseInt(profile.age) : null,
        gender: profile.gender || null,
        height: profile.height ? parseFloat(profile.height) : null,
        weight: profile.weight ? parseFloat(profile.weight) : null,
        allergies: profile.allergies,
        dietary_preferences: profile.dietary_preferences,
        health_goals: profile.health_goals,
      };

      // Try upsert first
      let { error } = await supabase
        .from("profiles")
        .upsert(profileData, {
          onConflict: 'user_id',
        });

      // If error is about missing columns, try without new fields
      if (error && error.code === 'PGRST204') {
        console.log("Schema cache issue detected, using basic fields only");

        // Try again with basic fields only
        const { error: basicError } = await supabase
          .from("profiles")
          .upsert({
            user_id: user.id,
            name: profile.name,
            age: profile.age ? parseInt(profile.age) : null,
            gender: profile.gender || null,
            height: profile.height ? parseFloat(profile.height) : null,
            weight: profile.weight ? parseFloat(profile.weight) : null,
            allergies: profile.allergies,
            dietary_preferences: profile.dietary_preferences,
            health_goals: profile.health_goals,
          }, {
            onConflict: 'user_id',
          });

        error = basicError;
      }

      if (error) {
        console.error("Supabase upsert error:", error);
        throw error;
      }

      toast.success("Profile saved successfully");
      navigate("/");
    } catch (error) {
      console.error("Error saving profile:", error);
      if (error instanceof Error) {
        toast.error(`Failed to save profile: ${error.message}`);
      } else {
        toast.error("Failed to save profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExerciseToggle = (exercise: string) => {
    const current = profile.preferred_exercises;
    if (current.includes(exercise)) {
      setProfile({ ...profile, preferred_exercises: current.filter(e => e !== exercise) });
    } else {
      setProfile({ ...profile, preferred_exercises: [...current, exercise] });
    }
  };

  // Calculate BMI
  const calculateBMI = () => {
    const weight = parseFloat(profile.weight);
    const height = parseFloat(profile.height);
    if (!weight || !height) return 0;
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  // Get BMI Category
  const getBMICategory = (bmi: number): { label: string; color: string; recommendation: string } => {
    const heightInMeters = parseFloat(profile.height) / 100;
    const minWeight = 18.5 * heightInMeters * heightInMeters;
    const maxWeight = 24.9 * heightInMeters * heightInMeters;
    const targetWeight = (minWeight + maxWeight) / 2; // Average of healthy range
    const currentWeight = parseFloat(profile.weight);

    if (bmi < 18.5) {
      // Underweight - need to gain to reach average target
      const weightToGain = targetWeight - currentWeight;
      return {
        label: "Underweight",
        color: "text-blue-500",
        recommendation: `You need to gain ${weightToGain.toFixed(1)} kg to reach ideal weight (${targetWeight.toFixed(1)} kg)`
      };
    } else if (bmi >= 18.5 && bmi <= 24.9) {
      return {
        label: "Normal Weight",
        color: "text-green-500",
        recommendation: `Great! You're in the healthy weight range. Ideal target: ${targetWeight.toFixed(1)} kg`
      };
    } else if (bmi >= 25 && bmi <= 29.9) {
      // Overweight - need to lose to reach average target
      const weightToLose = currentWeight - targetWeight;
      return {
        label: "Overweight",
        color: "text-yellow-600",
        recommendation: `You need to lose ${weightToLose.toFixed(1)} kg to reach ideal weight (${targetWeight.toFixed(1)} kg)`
      };
    } else {
      // Obese - need to lose to reach average target
      const weightToLose = currentWeight - targetWeight;
      return {
        label: "Obese",
        color: "text-red-500",
        recommendation: `You need to lose ${weightToLose.toFixed(1)} kg to reach ideal weight (${targetWeight.toFixed(1)} kg)`
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 animate-slide-up">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="shadow-card card-hover animate-slide-up delay-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">👤</span> Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Enter your name"
                  className="mt-1 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age" className="text-sm font-medium">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                    placeholder="25"
                    className="mt-1 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
                  <Input
                    id="gender"
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    placeholder="Male/Female/Other"
                    className="mt-1 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height" className="text-sm font-medium">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={profile.height}
                    onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                    placeholder="170"
                    className="mt-1 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <Label htmlFor="weight" className="text-sm font-medium">Current Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={profile.weight}
                    onChange={(e) => setProfile({ ...profile, weight: e.target.value })}
                    placeholder="70"
                    className="mt-1 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {/* BMI Gauge */}
            {parseFloat(profile.weight) > 0 && parseFloat(profile.height) > 0 && (
              <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Body Mass Index</span>
                  <span className="text-2xl font-bold text-primary">{calculateBMI()}</span>
                </div>
                {/* BMI Bar */}
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 via-green-400 to-yellow-400 to-red-400 transition-all duration-1000"
                    style={{ width: `${Math.min(100, (parseFloat(String(calculateBMI())) / 40) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>Underweight</span>
                  <span>Normal</span>
                  <span>Overweight</span>
                  <span>Obese</span>
                </div>
                {/* BMI Category & Recommendation */}
                {(() => {
                  const bmiVal = parseFloat(String(calculateBMI()));
                  if (!bmiVal) return null;
                  const category = getBMICategory(bmiVal);
                  return (
                    <div className={`mt-3 p-3 rounded-lg border ${bmiVal < 18.5 ? 'bg-blue-500/10 border-blue-500/20' :
                      bmiVal <= 24.9 ? 'bg-green-500/10 border-green-500/20' :
                        bmiVal <= 29.9 ? 'bg-yellow-500/10 border-yellow-500/20' :
                          'bg-red-500/10 border-red-500/20'
                      }`}>
                      <p className={`text-sm font-semibold ${category.color}`}>
                        {category.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {category.recommendation}
                      </p>
                    </div>
                  );
                })()}
                {/* Ideal Target Weight */}
                {(() => {
                  const heightM = parseFloat(profile.height) / 100;
                  const minWeight = 18.5 * heightM * heightM;
                  const maxWeight = 24.9 * heightM * heightM;
                  const idealWeight = (minWeight + maxWeight) / 2;
                  const currentWeight = parseFloat(profile.weight);
                  const diff = Math.abs(currentWeight - idealWeight);
                  const isAtIdeal = diff < 1; // Within 1kg of ideal
                  return (
                    <div className="mt-3 p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">🎯</span>
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Ideal Target Weight</span>
                      </div>
                      <div className="flex items-center justify-center text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                        {idealWeight.toFixed(1)} kg
                      </div>
                      <p className={`text-xs mt-1 font-medium text-center ${isAtIdeal ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {isAtIdeal
                          ? `✅ Your weight (${currentWeight} kg) is at the ideal target!`
                          : currentWeight < idealWeight
                            ? `⬆️ You need to gain ${(idealWeight - currentWeight).toFixed(1)} kg to reach the ideal weight`
                            : `⬇️ You need to lose ${(currentWeight - idealWeight).toFixed(1)} kg to reach the ideal weight`
                        }
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Target Weight Section */}
            <div className="p-5 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Target Weight</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target_weight" className="text-sm">Target Weight (kg)</Label>
                  <Input
                    id="target_weight"
                    type="number"
                    placeholder="e.g., 65"
                    value={profile.target_weight}
                    onChange={(e) => setProfile({ ...profile, target_weight: e.target.value })}
                    className="mt-1 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex items-center">
                  {parseFloat(profile.weight) > 0 && parseFloat(profile.target_weight) > 0 && (
                    <div className="p-3 bg-primary/10 rounded-lg w-full">
                      <p className="text-xs text-muted-foreground">Weight to change:</p>
                      <p className="font-bold text-primary">
                        {(parseFloat(profile.weight) - parseFloat(profile.target_weight)).toFixed(1)} kg
                        <span className="text-xs font-normal ml-1">
                          {parseFloat(profile.weight) > parseFloat(profile.target_weight) ? " (loss)" : " (gain)"}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tags/Chips for Allergies */}
            <div>
              <Label className="text-sm font-medium">Allergies</Label>
              <Input
                id="allergies"
                value={profile.allergies.join(", ")}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    allergies: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Peanuts, Dairy, Eggs..."
                className="mt-1 transition-all focus:ring-2 focus:ring-primary/20"
              />
              {profile.allergies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.allergies.map((allergy, idx) => (
                    <span key={idx} className="px-3 py-1 bg-destructive/10 border border-destructive/20 rounded-full text-xs text-destructive font-medium">
                      {allergy}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tags/Chips for Dietary Preferences */}
            <div>
              <Label className="text-sm font-medium">Dietary Preferences</Label>
              <Input
                id="dietary"
                value={profile.dietary_preferences.join(", ")}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    dietary_preferences: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Vegan, Vegetarian, Keto..."
                className="mt-1 transition-all focus:ring-2 focus:ring-primary/20"
              />
              {profile.dietary_preferences.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.dietary_preferences.map((pref, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
                      {pref}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tags/Chips for Health Goals */}
            <div>
              <Label className="text-sm font-medium">Health Goals</Label>
              <Input
                id="goals"
                value={profile.health_goals.join(", ")}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    health_goals: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Weight Loss, Muscle Gain..."
                className="mt-1 transition-all focus:ring-2 focus:ring-primary/20"
              />
              {profile.health_goals.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.health_goals.map((goal, idx) => (
                    <span key={idx} className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-xs text-accent-foreground font-medium">
                      {goal}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Exercise Settings */}
            <div className="pt-4 border-t space-y-5">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span>🏋️</span> Exercise & Diet Plan
              </h3>

              <div>
                <Label htmlFor="calories" className="text-sm font-medium">Daily Calorie Goal</Label>
                <Input
                  id="calories"
                  type="number"
                  value={profile.daily_calorie_goal}
                  onChange={(e) => setProfile({ ...profile, daily_calorie_goal: parseInt(e.target.value) || 2000 })}
                  className="mt-1 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Diet Plan Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {dietPlanTypes.map((type) => (
                    <div
                      key={type}
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${profile.diet_plan_type === type
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                        }`}
                      onClick={() => setProfile({ ...profile, diet_plan_type: type })}
                    >
                      <Checkbox
                        id={type}
                        checked={profile.diet_plan_type === type}
                        onCheckedChange={() => setProfile({ ...profile, diet_plan_type: type })}
                      />
                      <label htmlFor={type} className="text-sm cursor-pointer capitalize font-medium">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Activity Level</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {activityLevels.map((level) => (
                    <div
                      key={level}
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${profile.activity_level === level
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                        }`}
                      onClick={() => setProfile({ ...profile, activity_level: level })}
                    >
                      <Checkbox
                        id={level}
                        checked={profile.activity_level === level}
                        onCheckedChange={() => setProfile({ ...profile, activity_level: level })}
                      />
                      <label htmlFor={level} className="text-sm cursor-pointer capitalize">
                        {level.replace("_", " ")}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Preferred Exercises</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {exerciseTypes.map((exercise) => (
                    <div
                      key={exercise}
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${profile.preferred_exercises.includes(exercise)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                        }`}
                      onClick={() => handleExerciseToggle(exercise)}
                    >
                      <Checkbox
                        id={exercise}
                        checked={profile.preferred_exercises.includes(exercise)}
                        onCheckedChange={() => handleExerciseToggle(exercise)}
                      />
                      <label htmlFor={exercise} className="text-sm cursor-pointer">
                        {exercise}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full btn-gradient mt-4">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
