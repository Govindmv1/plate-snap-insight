import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, History, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import heroImage from "@/assets/hero-food-scan.jpg";

const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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
      setProfile(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="relative h-64 overflow-hidden">
        <img src={heroImage} alt="FoodScan AI" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back, {profile?.name}!</h1>
          <p className="text-white/90">Track your nutrition journey</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => navigate("/scan")}>
            <CardHeader>
              <div className="p-3 rounded-full bg-gradient-to-br from-primary to-accent w-fit">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <CardTitle>Scan Meal</CardTitle>
              <CardDescription>Take a photo to analyze nutrition</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => navigate("/history")}>
            <CardHeader>
              <div className="p-3 rounded-full bg-gradient-to-br from-accent to-primary w-fit">
                <History className="w-8 h-8 text-white" />
              </div>
              <CardTitle>Meal History</CardTitle>
              <CardDescription>View your past meals and trends</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile?.allergies?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Allergies:</p>
                <p>{profile.allergies.join(", ")}</p>
              </div>
            )}
            {profile?.dietary_preferences?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Diet:</p>
                <p>{profile.dietary_preferences.join(", ")}</p>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
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
