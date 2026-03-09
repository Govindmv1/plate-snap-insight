import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Calendar, Loader2, TrendingUp, Flame } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Meal {
  id: string;
  image_url: string | null;
  detected_foods: unknown;
  nutritional_data: unknown;
  meal_weight: number | null;
  allergen_alerts: string[];
  notes: string | null;
  created_at: string;
}

const History = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMeals(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load meal history");
    } finally {
      setLoading(false);
    }
  };

  const filteredMeals = meals.filter((meal) => {
    const searchLower = searchTerm.toLowerCase();
    const foodNames = meal.detected_foods?.map((f) => f.name?.toLowerCase()).join(" ") || "";
    const notes = meal.notes?.toLowerCase() || "";
    return foodNames.includes(searchLower) || notes.includes(searchLower);
  });

  const totalCalories = meals.reduce((sum, meal) => sum + (meal.nutritional_data?.calories || 0), 0);
  const avgCaloriesPerMeal = meals.length > 0 ? Math.round(totalCalories / meals.length) : 0;

  return (
    <div className="min-h-screen bg-background">
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white animate-slide-up">Meal History</h1>
            <p className="text-white/70 text-sm animate-slide-up delay-100">Your nutrition journey</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-4 relative z-10 space-y-6 pb-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-panel hover-lift animate-slide-up">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-2">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <p className="text-4xl font-bold text-primary animate-count-up">{meals.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Meals Scanned</p>
            </CardContent>
          </Card>
          <Card className="glass-panel hover-lift animate-slide-up delay-100">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-xl bg-accent/10 w-fit mx-auto mb-2">
                <Flame className="w-6 h-6 text-accent" />
              </div>
              <p className="text-4xl font-bold text-accent animate-count-up">{avgCaloriesPerMeal}</p>
              <p className="text-sm text-muted-foreground mt-1">Avg Calories/Meal</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative animate-slide-up delay-200">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search meals..."
            className="pl-10 transition-all focus:ring-2 focus:ring-primary/20 rounded-xl"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredMeals.length === 0 ? (
          <Card className="glass-panel animate-slide-up">
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-4">🍽️</div>
              <p className="text-lg font-medium text-muted-foreground mb-2">No meals found</p>
              <p className="text-sm text-muted-foreground mb-4">Start tracking your nutrition journey today!</p>
              <Button onClick={() => navigate("/scan")} className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 rounded-xl shadow-lg shadow-primary/20">
                Scan Your First Meal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMeals.map((meal, index) => (
              <Card
                key={meal.id}
                className="glass-panel overflow-hidden hover-lift animate-slide-up"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 h-48 flex-shrink-0 relative">
                    <img
                      src={meal.image_url}
                      alt="Meal"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent sm:from-transparent sm:to-black/10" />
                  </div>
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-xl">🍴</span>
                          {meal.detected_foods?.map((f) => f.name).join(", ") || "Meal"}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(meal.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                      <div className="text-right bg-gradient-to-br from-primary/10 to-accent/10 px-3 py-2 rounded-xl border border-primary/20">
                        <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {meal.nutritional_data?.calories || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">calories</p>
                      </div>
                    </div>

                    {/* Nutrient Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-3 bg-gradient-to-br from-rose-500/10 to-pink-500/10 rounded-xl border border-rose-500/20">
                        <p className="font-bold text-rose-600">{meal.nutritional_data?.protein || 0}g</p>
                        <p className="text-xs text-muted-foreground">Protein</p>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20">
                        <p className="font-bold text-blue-600">{meal.nutritional_data?.carbs || 0}g</p>
                        <p className="text-xs text-muted-foreground">Carbs</p>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/20">
                        <p className="font-bold text-violet-600">{meal.nutritional_data?.fat || 0}g</p>
                        <p className="text-xs text-muted-foreground">Fat</p>
                      </div>
                    </div>

                    {meal.allergen_alerts?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {meal.allergen_alerts.map((alert: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-destructive/10 border border-destructive/20 rounded-full text-xs text-destructive font-medium">
                            ⚠️ {alert}
                          </span>
                        ))}
                      </div>
                    )}

                    {meal.notes && (
                      <p className="text-sm text-muted-foreground italic bg-muted/50 p-2 rounded-xl">"{meal.notes}"</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
