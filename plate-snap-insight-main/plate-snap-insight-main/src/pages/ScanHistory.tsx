import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Loader2, Calendar, Flame, Beef, Wheat, Droplets } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ScanHistory {
  id: string;
  user_id: string;
  detected_food_items: any[];
  total_calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  created_at: string | null;
}

const ScanHistory = () => {
  const [scans, setScans] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchScanHistory();
  }, []);

  const fetchScanHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("scan_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScans(data || []);
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error("Failed to load scan history");
    } finally {
      setLoading(false);
    }
  };

  const filteredScans = scans.filter((scan) => {
    const searchLower = searchTerm.toLowerCase();
    const foodNames = scan.detected_food_items?.map((f: any) => f.name?.toLowerCase()).join(" ") || "";
    return foodNames.includes(searchLower);
  });

  const totalCalories = scans.reduce((sum, scan) => sum + (scan.total_calories || 0), 0);
  const avgCalories = scans.length > 0 ? Math.round(totalCalories / scans.length) : 0;
  const totalProtein = scans.reduce((sum, scan) => sum + (scan.protein || 0), 0);
  const totalCarbs = scans.reduce((sum, scan) => sum + (scan.carbs || 0), 0);
  const totalFat = scans.reduce((sum, scan) => sum + (scan.fat || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Scan History</h1>
            <p className="text-muted-foreground">Your nutrition scan history</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-primary">{scans.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Scans</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-orange-500">{avgCalories}</p>
              <p className="text-sm text-muted-foreground mt-1">Avg Calories</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-blue-500">{totalProtein}g</p>
              <p className="text-sm text-muted-foreground mt-1">Total Protein</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-green-500">{totalCarbs}g</p>
              <p className="text-sm text-muted-foreground mt-1">Total Carbs</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-yellow-500">{totalFat}g</p>
              <p className="text-sm text-muted-foreground mt-1">Total Fat</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scans by food name..."
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredScans.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No scans found</p>
              <Button onClick={() => navigate("/scan")} className="mt-4">
                Scan Your First Meal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Detected Foods</TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Flame className="h-4 w-4" />
                      Calories
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Beef className="h-4 w-4" />
                      Protein
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Wheat className="h-4 w-4" />
                      Carbs
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Droplets className="h-4 w-4" />
                      Fat
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScans.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {scan.created_at ? format(new Date(scan.created_at), "MMM d, yyyy") : "N/A"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {scan.created_at ? format(new Date(scan.created_at), "h:mm a") : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {scan.detected_food_items?.map((food: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                          >
                            {food.name}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-orange-500">
                      {scan.total_calories || 0}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-500">
                      {scan.protein || 0}g
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-500">
                      {scan.carbs || 0}g
                    </TableCell>
                    <TableCell className="text-right font-bold text-yellow-500">
                      {scan.fat || 0}g
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ScanHistory;
