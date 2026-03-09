import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, History, User, LogOut, MessageCircle, Flame, Zap, TrendingUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ExerciseIdeas from "@/components/ExerciseIdeas";

// Profile type definition
interface Profile {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  target_weight: number | null;
  allergies: string[] | null;
  dietary_preferences: string[] | null;
  health_goals: string[] | null;
  daily_calorie_goal: number | null;
  activity_level: string | null;
  preferred_exercises: string[] | null;
  diet_plan_type: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Meal type for nutritional data
interface Meal {
  nutritional_data: {
    calories?: number;
  } | null;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayCalories, setTodayCalories] = useState(0);
  const navigate = useNavigate();

  const fetchTodayCalories = useCallback(async (userId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("meals")
        .select("nutritional_data")
        .eq("user_id", userId)
        .gte("created_at", today.toISOString());

      if (error) throw error;

      const totalCalories = (data || []).reduce(
        (sum: number, meal: Meal) => sum + (meal.nutritional_data?.calories || 0),
        0
      );
      setTodayCalories(totalCalories);
    } catch (error) {
      console.error("Error fetching today's calories:", error);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!data) {
      navigate("/onboarding");
    } else {
      setProfile(data as Profile);
      fetchTodayCalories(user.id);
    }
  }, [navigate, fetchTodayCalories]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  // Determine diet plan type based on health goals
  const getDietPlanType = () => {
    const healthGoals = profile?.health_goals || [];
    if (healthGoals.some((g: string) => g.toLowerCase().includes("muscle"))) {
      return "bulk";
    } else if (healthGoals.some((g: string) => g.toLowerCase().includes("weight"))) {
      return "cut";
    }
    return "maintain";
  };

  // Calculate recommended calories based on profile
  const getCalorieGoal = () => {
    if (profile?.daily_calorie_goal) {
      return profile.daily_calorie_goal;
    }
    const weight = profile?.weight || 70;
    const height = profile?.height || 170;
    const age = profile?.age || 25;
    const gender = profile?.gender || "male";

    let bmr;
    if (gender.toLowerCase() === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    const activityMultiplier = 1.55;
    return Math.round(bmr * activityMultiplier);
  };

  const healthGoal = profile?.health_goals?.[0] || "Balanced Diet";
  const dietPlanType = profile?.diet_plan_type || getDietPlanType();
  const calorieGoal = getCalorieGoal();

  const calorieProgress = Math.min(100, (todayCalories / calorieGoal) * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (calorieProgress / 100) * circumference;

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Dynamic Animated Hero Section */}
      <div className="relative h-80 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-accent"></div>

        {/* Animated floating orbs */}
        <div className="absolute top-10 left-[10%] w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-10 right-[10%] w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-float delay-200"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-[30%] w-20 h-20 bg-white/15 rounded-full blur-xl animate-float delay-300"></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {/* Bottom gradient fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>

        {/* Hero content */}
        <div className="absolute bottom-8 left-6 right-6 z-10">
          <p className="text-white/70 text-sm font-medium mb-1 animate-slide-up">{getGreeting()}</p>
          <h1 className="text-4xl font-bold text-white mb-2 animate-slide-up">
            {profile?.name || "User"} 👋
          </h1>
          <p className="text-white/80 animate-slide-up delay-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Track your nutrition journey today
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-10 relative z-10 space-y-6 pb-8">
        {/* Calorie Progress Ring Card */}
        <Card className="glass-panel hover-lift overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-accent" />
                  Today's Progress
                </h3>
                <p className="text-sm text-muted-foreground">
                  {todayCalories} of {calorieGoal} calories
                </p>
                <div className="flex gap-3 mt-3">
                  <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="text-sm font-bold text-primary">{Math.max(0, calorieGoal - todayCalories)} cal</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-xs text-muted-foreground">Goal</p>
                    <p className="text-sm font-bold text-accent">{calorieGoal} cal</p>
                  </div>
                </div>
              </div>

              {/* Circular Progress */}
              <div className="relative w-28 h-28">
                <svg className="circular-progress w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={calorieProgress > 100 ? "hsl(var(--destructive))" : "url(#progressGradient)"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{Math.round(calorieProgress)}%</span>
                  <span className="text-xs text-muted-foreground">consumed</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-out rounded-full ${calorieProgress > 100 ? "bg-destructive" : "bg-gradient-to-r from-primary to-accent"
                  }`}
                style={{ width: `${Math.min(100, calorieProgress)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass-panel hover-lift text-center animate-slide-up">
            <CardContent className="pt-5 pb-4">
              <div className="p-2 rounded-xl bg-primary/10 w-fit mx-auto mb-2">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{todayCalories}</p>
              <p className="text-xs text-muted-foreground">Consumed</p>
            </CardContent>
          </Card>
          <Card className="glass-panel hover-lift text-center animate-slide-up delay-100">
            <CardContent className="pt-5 pb-4">
              <div className="p-2 rounded-xl bg-accent/10 w-fit mx-auto mb-2">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <p className="text-2xl font-bold">{Math.max(0, calorieGoal - todayCalories)}</p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </CardContent>
          </Card>
          <Card className="glass-panel hover-lift text-center animate-slide-up delay-200">
            <CardContent className="pt-5 pb-4">
              <div className="p-2 rounded-xl bg-green-500/10 w-fit mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold capitalize">{dietPlanType}</p>
              <p className="text-xs text-muted-foreground">Diet Plan</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className="glass-panel hover-lift cursor-pointer group animate-slide-up"
            onClick={() => navigate("/scan")}
          >
            <CardHeader className="text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-accent w-fit mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/20">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg">Scan Meal</CardTitle>
              <CardDescription className="text-sm">Take a photo to analyze nutrition</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="glass-panel hover-lift cursor-pointer group animate-slide-up delay-100"
            onClick={() => navigate("/history")}
          >
            <CardHeader className="text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-accent to-primary w-fit mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-accent/20">
                <History className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg">Meal History</CardTitle>
              <CardDescription className="text-sm">View your past meals and trends</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="glass-panel hover-lift cursor-pointer group animate-slide-up delay-200"
            onClick={() => navigate("/chat")}
          >
            <CardHeader className="text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 w-fit mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-violet-500/20">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg">Diet Chatbot</CardTitle>
              <CardDescription className="text-sm">Ask about foods for your diet</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Exercise Ideas Component */}
        <div className="animate-slide-up delay-300">
          <ExerciseIdeas
            healthGoal={healthGoal}
            dietPlanType={dietPlanType}
            todayCalories={todayCalories}
            calorieGoal={calorieGoal}
            weight={profile?.weight ?? 70}
            height={profile?.height ?? 170}
            age={profile?.age ?? 25}
            gender={profile?.gender ?? "male"}
            targetWeight={profile?.target_weight ?? undefined}
          />
        </div>

        {/* Profile Card */}
        <Card className="glass-panel hover-lift animate-slide-up delay-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <User className="w-4 h-4 text-primary" />
              </div>
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {profile?.allergies?.length > 0 && (
                <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 hover-lift">
                  <p className="text-xs font-semibold text-destructive mb-1">⚠️ Allergies</p>
                  <p className="text-sm">{profile.allergies.join(", ")}</p>
                </div>
              )}
              {profile?.dietary_preferences?.length > 0 && (
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 hover-lift">
                  <p className="text-xs font-semibold text-primary mb-1">🥗 Diet</p>
                  <p className="text-sm">{profile.dietary_preferences.join(", ")}</p>
                </div>
              )}
              {profile?.health_goals?.length > 0 && (
                <div className="p-3 bg-accent/10 rounded-xl border border-accent/20 hover-lift">
                  <p className="text-xs font-semibold text-accent mb-1">🎯 Goals</p>
                  <p className="text-sm">{profile.health_goals.join(", ")}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/profile")} className="hover:bg-primary/10 rounded-xl">
                <User className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive rounded-xl">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
