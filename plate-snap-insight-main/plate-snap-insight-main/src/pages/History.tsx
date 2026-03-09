import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Meal {
  id: string;
  image_url: string | null;
  detected_foods: any;
  nutritional_data: any;
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
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error("Failed to load meal history");
    } finally {
      setLoading(false);
    }
  };

  const filteredMeals = meals.filter((meal) => {
    const searchLower = searchTerm.toLowerCase();
    const foodNames = meal.detected_foods?.map((f: any) => f.name?.toLowerCase()).join(" ") || "";
    const notes = meal.notes?.toLowerCase() || "";
    return foodNames.includes(searchLower) || notes.includes(searchLower);
  });

  const totalCalories = meals.reduce((sum, meal) => sum + (meal.nutritional_data?.calories || 0), 0);
  const avgCaloriesPerMeal = meals.length > 0 ? Math.round(totalCalories / meals.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Meal History</h1>
            <p className="text-muted-foreground">Your nutrition journey</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-primary">{meals.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Meals Scanned</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-accent">{avgCaloriesPerMeal}</p>
              <p className="text-sm text-muted-foreground mt-1">Avg Calories/Meal</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search meals..."
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredMeals.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No meals found</p>
              <Button onClick={() => navigate("/scan")} className="mt-4">
                Scan Your First Meal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMeals.map((meal) => (
              <Card key={meal.id} className="shadow-card overflow-hidden hover:shadow-elevated transition-shadow">
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 h-48 flex-shrink-0">
                    <img
                      src={meal.image_url}
                      alt="Meal"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {meal.detected_foods?.map((f: any) => f.name).join(", ") || "Meal"}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(meal.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {meal.nutritional_data?.calories || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">calories</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-semibold">{meal.nutritional_data?.protein || 0}g</p>
                        <p className="text-xs text-muted-foreground">Protein</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-semibold">{meal.nutritional_data?.carbs || 0}g</p>
                        <p className="text-xs text-muted-foreground">Carbs</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-semibold">{meal.nutritional_data?.fat || 0}g</p>
                        <p className="text-xs text-muted-foreground">Fat</p>
                      </div>
                    </div>

                    {meal.allergen_alerts?.length > 0 && (
                      <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive mb-2">
                        ⚠️ {meal.allergen_alerts.join(", ")}
                      </div>
                    )}

                    {meal.notes && (
                      <p className="text-sm text-muted-foreground italic">"{meal.notes}"</p>
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
