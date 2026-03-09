import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Flame,
  Heart,
  Zap,
  Activity,
  Target,
  Timer,
  TrendingDown,
  Scale,
  Home,
  Building2
} from "lucide-react";

interface ExerciseIdeasProps {
  healthGoal?: string;
  dietPlanType?: string;
  todayCalories?: number;
  calorieGoal?: number;
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  targetWeight?: number;
}

// Exercise data with categories and MET values for accurate calorie calculation
interface Exercise {
  name: string;
  duration: string;
  calories: number;
  met: number; // Metabolic Equivalent of Task
  equipment: string;
  location: "home" | "gym";
}

// Calculate BMI
const calculateBMI = (weight: number, height: number): number => {
  if (!weight || !height) return 0;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
};

// Get BMI category
const getBMICategory = (bmi: number): { category: string; color: string } => {
  if (bmi === 0) return { category: "Unknown", color: "text-muted-foreground" };
  if (bmi < 18.5) return { category: "Underweight", color: "text-blue-500" };
  if (bmi < 25) return { category: "Normal", color: "text-green-500" };
  if (bmi < 30) return { category: "Overweight", color: "text-yellow-500" };
  return { category: "Obese", color: "text-red-500" };
};

// Calculate BMR using Mifflin-St Jeor equation
const calculateBMR = (weight: number, height: number, age: number, gender: string): number => {
  if (!weight || !height || !age) return 0;
  if (gender?.toLowerCase() === "male") {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
};

// Calculate TDEE (Total Daily Energy Expenditure)
const calculateTDEE = (bmr: number, activityLevel: string = "moderate"): number => {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.55));
};

// Calculate calories to burn based on weight loss goal
const calculateCaloriesToBurn = (
  currentWeight: number,
  targetWeight: number,
  tdee: number,
  calorieIntake: number
): number => {
  const weightDiff = currentWeight - targetWeight;
  if (weightDiff <= 0) return 0; // No weight loss needed

  // To lose 1kg of fat, need ~7700 calorie deficit
  // Assuming weekly weight loss of 0.5kg (healthy rate)
  const dailyDeficit = (weightDiff * 7700) / 30; // Spread over 30 days

  // Calculate how many calories need to be burned through exercise
  const calorieSurplus = calorieIntake - tdee;
  const caloriesToBurn = dailyDeficit - calorieSurplus;

  return Math.max(0, Math.round(caloriesToBurn));
};

// Exercise data with categories and location (home/gym)
const exercises: { strength: Exercise[]; cardio: Exercise[]; flexibility: Exercise[]; hiit: Exercise[] } = {
  strength: [
    { name: "Push-ups", duration: "3 sets x 12 reps", calories: 150, met: 8.0, equipment: "None", location: "home" },
    { name: "Squats", duration: "4 sets x 15 reps", calories: 200, met: 5.0, equipment: "None", location: "home" },
    { name: "Plank", duration: "3 sets x 60 seconds", calories: 100, met: 4.0, equipment: "None", location: "home" },
    { name: "Lunges", duration: "3 sets x 12 each leg", calories: 180, met: 4.0, equipment: "None", location: "home" },
    { name: "Diamond Push-ups", duration: "3 sets x 10 reps", calories: 140, met: 8.0, equipment: "None", location: "home" },
    { name: "Wall Sit", duration: "3 sets x 45 seconds", calories: 80, met: 3.5, equipment: "None", location: "home" },
    { name: "Deadlifts", duration: "4 sets x 8 reps", calories: 250, met: 6.0, equipment: "Barbell", location: "gym" },
    { name: "Bench Press", duration: "4 sets x 10 reps", calories: 220, met: 6.0, equipment: "Barbell", location: "gym" },
    { name: "Pull-ups", duration: "3 sets x 8 reps", calories: 200, met: 8.0, equipment: "Pull-up Bar", location: "gym" },
    { name: "Barbell Rows", duration: "4 sets x 10 reps", calories: 180, met: 5.0, equipment: "Barbell", location: "gym" },
    { name: "Lat Pulldown", duration: "4 sets x 12 reps", calories: 170, met: 5.0, equipment: "Cable Machine", location: "gym" },
    { name: "Leg Press", duration: "4 sets x 12 reps", calories: 200, met: 5.5, equipment: "Leg Press Machine", location: "gym" },
  ],
  cardio: [
    { name: "Running", duration: "30 minutes", calories: 300, met: 9.8, equipment: "None", location: "home" },
    { name: "Jump Rope", duration: "20 minutes", calories: 250, met: 12.0, equipment: "Jump Rope", location: "home" },
    { name: "HIIT", duration: "20 minutes", calories: 300, met: 12.0, equipment: "None", location: "home" },
    { name: "Walking", duration: "45 minutes", calories: 150, met: 3.5, equipment: "None", location: "home" },
    { name: "Jogging", duration: "30 minutes", calories: 250, met: 7.0, equipment: "None", location: "home" },
    { name: "High Knees", duration: "15 minutes", calories: 180, met: 8.0, equipment: "None", location: "home" },
    { name: "Cycling", duration: "45 minutes", calories: 350, met: 7.5, equipment: "Stationary Bike", location: "gym" },
    { name: "Swimming", duration: "30 minutes", calories: 280, met: 8.0, equipment: "Pool", location: "gym" },
    { name: "Stair Climber", duration: "20 minutes", calories: 220, met: 9.0, equipment: "Stair Machine", location: "gym" },
    { name: "Rowing Machine", duration: "25 minutes", calories: 260, met: 7.0, equipment: "Rowing Machine", location: "gym" },
    { name: "Elliptical", duration: "30 minutes", calories: 270, met: 6.5, equipment: "Elliptical Machine", location: "gym" },
  ],
  flexibility: [
    { name: "Yoga", duration: "30 minutes", calories: 120, met: 3.0, equipment: "Mat", location: "home" },
    { name: "Stretching", duration: "15 minutes", calories: 50, met: 2.5, equipment: "None", location: "home" },
    { name: "Pilates", duration: "45 minutes", calories: 180, met: 3.0, equipment: "Mat", location: "home" },
    { name: "Foam Rolling", duration: "15 minutes", calories: 40, met: 2.0, equipment: "Foam Roller", location: "home" },
    { name: "Tai Chi", duration: "30 minutes", calories: 150, met: 4.0, equipment: "None", location: "home" },
  ],
  hiit: [
    { name: "Burpees", duration: "4 sets x 15 reps", calories: 200, met: 10.0, equipment: "None", location: "home" },
    { name: "Mountain Climbers", duration: "3 sets x 30 seconds", calories: 180, met: 8.0, equipment: "None", location: "home" },
    { name: "Sprint Intervals", duration: "10 x 30 sec", calories: 250, met: 12.0, equipment: "None", location: "home" },
    { name: "Jump Squats", duration: "4 sets x 15 reps", calories: 190, met: 9.0, equipment: "None", location: "home" },
    { name: "Box Jumps", duration: "4 sets x 12 reps", calories: 220, met: 8.0, equipment: "Box", location: "gym" },
    { name: "Kettlebell Swings", duration: "4 sets x 20 reps", calories: 200, met: 9.0, equipment: "Kettlebell", location: "gym" },
    { name: "Battle Ropes", duration: "3 sets x 30 seconds", calories: 180, met: 10.0, equipment: "Battle Ropes", location: "gym" },
    { name: "Sled Push", duration: "4 sets x 20m", calories: 230, met: 10.0, equipment: "Sled", location: "gym" },
  ],
};

// Calculate calories burned for an exercise based on weight
const calculateCaloriesForWeight = (exercise: Exercise, weight: number): number => {
  // Calories = MET × weight(kg) × duration(hours)
  // Duration is in format "X minutes" or "X sets x Y reps"
  let durationMinutes = 30; // default

  // Parse duration
  const minMatch = exercise.duration.match(/(\d+)\s*minutes?/);
  if (minMatch) {
    durationMinutes = parseInt(minMatch[1]);
  } else {
    // For sets x reps, estimate 3 minutes per set
    const setMatch = exercise.duration.match(/(\d+)\s*sets?/);
    if (setMatch) {
      durationMinutes = parseInt(setMatch[1]) * 3;
    }
  }

  const durationHours = durationMinutes / 60;
  return Math.round(exercise.met * weight * durationHours);
};

// Get exercises based on goal
const getExercisesForGoal = (goal: string, dietType: string) => {
  const goalLower = goal?.toLowerCase() || "";

  if (goalLower.includes("muscle") || dietType === "bulk") {
    return {
      primary: exercises.strength,
      secondary: exercises.hiit,
      focus: "Muscle Building",
      icon: <Dumbbell className="w-6 h-6" />,
    };
  } else if (goalLower.includes("weight") || dietType === "cut") {
    return {
      primary: exercises.cardio,
      secondary: exercises.hiit,
      focus: "Weight Loss",
      icon: <Flame className="w-6 h-6" />,
    };
  } else if (goalLower.includes("energy")) {
    return {
      primary: exercises.cardio,
      secondary: exercises.flexibility,
      focus: "Energy & Endurance",
      icon: <Zap className="w-6 h-6" />,
    };
  } else if (goalLower.includes("health")) {
    return {
      primary: exercises.flexibility,
      secondary: exercises.cardio,
      focus: "Overall Health",
      icon: <Heart className="w-6 h-6" />,
    };
  }

  // Default: Balanced
  return {
    primary: exercises.cardio,
    secondary: exercises.strength,
    focus: "Balanced Fitness",
    icon: <Activity className="w-6 h-6" />,
  };
};

// Get diet plan info
const getDietPlanInfo = (goal: string, todayCalories: number, calorieGoal: number) => {
  const goalLower = goal?.toLowerCase() || "";
  let planType = "maintain";
  let planName = "Maintenance";
  let planDescription = "Balance your calorie intake with exercise";

  if (goalLower.includes("muscle")) {
    planType = "bulk";
    planName = "Bulk Plan";
    planDescription = "Surplus calories for muscle growth";
  } else if (goalLower.includes("weight")) {
    planType = "cut";
    planName = "Cut Plan";
    planDescription = "Deficit calories for weight loss";
  }

  // Adjust based on calorie intake
  const calorieDiff = todayCalories - (calorieGoal || 2000);

  return {
    type: planType,
    name: planName,
    description: planDescription,
    calorieDiff,
    progress: calorieGoal ? Math.min(100, Math.round((todayCalories / calorieGoal) * 100)) : 0,
  };
};

const ExerciseIdeas = ({
  healthGoal = "Balanced Diet",
  dietPlanType = "maintain",
  todayCalories = 0,
  calorieGoal = 2000,
  weight = 70,
  height = 170,
  age = 25,
  gender = "male",
  targetWeight
}: ExerciseIdeasProps) => {
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [exerciseTab, setExerciseTab] = useState<"home" | "gym">("home");

  const exerciseData = getExercisesForGoal(healthGoal, dietPlanType);
  const dietInfo = getDietPlanInfo(healthGoal, todayCalories, calorieGoal);

  // Calculate BMI and related metrics
  const bmi = calculateBMI(weight, height);
  const bmiCategory = getBMICategory(bmi);
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr);

  // Calculate ideal target weight (average of healthy BMI range)
  const heightInM = height / 100;
  const idealWeight = ((18.5 * heightInM * heightInM) + (24.9 * heightInM * heightInM)) / 2;
  const target = targetWeight || idealWeight;
  const weightDiff = Math.abs(weight - target);
  const needsToGain = weight < target;

  // Calculate calories needed to burn through exercise
  const caloriesToBurn = calculateCaloriesToBurn(weight, target, tdee, todayCalories);

  // Calculate recommended exercises to meet calorie goal
  const getRecommendedExercises = () => {
    const allExercises = [...exerciseData.primary, ...exerciseData.secondary];
    const recommended: Array<Exercise & { adjustedCalories: number }> = [];

    let totalCalories = 0;
    const targetCalories = Math.max(caloriesToBurn, 150); // Minimum 150 calories

    for (const exercise of allExercises) {
      if (totalCalories >= targetCalories) break;

      const adjustedCalories = calculateCaloriesForWeight(exercise, weight);
      recommended.push({ ...exercise, adjustedCalories });
      totalCalories += adjustedCalories;
    }

    return recommended;
  };

  const recommendedExercises = getRecommendedExercises();

  const primaryExercises = showAllExercises
    ? recommendedExercises
    : recommendedExercises.slice(0, 3);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              {exerciseData.icon}
            </div>
            <div>
              <CardTitle className="text-lg">Exercise Ideas</CardTitle>
              <p className="text-xs text-muted-foreground">{exerciseData.focus}</p>
            </div>
          </div>
          <Badge variant={dietInfo.type === "bulk" ? "default" : dietInfo.type === "cut" ? "destructive" : "secondary"}>
            {dietInfo.name}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* BMI & Weight Info */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Your BMI: {bmi.toFixed(1)}</span>
            </div>
            <span className={`text-xs font-medium ${bmiCategory.color}`}>
              {bmiCategory.category}
            </span>
          </div>

          {weightDiff > 0.5 && (
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="text-sm">
                Target: {needsToGain ? 'Gain' : 'Lose'} <span className="font-bold">{weightDiff.toFixed(1)} kg</span>
              </span>
            </div>
          )}

          {/* Underweight: Weight to gain message */}
          {bmi > 0 && bmi < 18.5 && (() => {
            const heightInMeters = height / 100;
            const minWeight = 18.5 * (heightInMeters * heightInMeters);
            const maxWeight = 24.9 * (heightInMeters * heightInMeters);
            const idealWeight = (minWeight + maxWeight) / 2;
            const weightToGain = idealWeight - weight;
            return (
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-base">📈</span>
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Gain <span className="font-bold">{weightToGain.toFixed(1)} kg</span> to reach ideal weight
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ideal target weight: {idealWeight.toFixed(1)} kg
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Overweight: Weight to lose message */}
          {bmi >= 25 && bmi < 30 && (() => {
            const heightInMeters = height / 100;
            const minWeight = 18.5 * (heightInMeters * heightInMeters);
            const maxWeight = 24.9 * (heightInMeters * heightInMeters);
            const idealWeight = (minWeight + maxWeight) / 2;
            const weightToLose = weight - idealWeight;
            return (
              <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-base">📉</span>
                  <div>
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      Lose <span className="font-bold">{weightToLose.toFixed(1)} kg</span> to reach ideal weight
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ideal target weight: {idealWeight.toFixed(1)} kg
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Obese: Weight to lose message */}
          {bmi >= 30 && (() => {
            const heightInMeters = height / 100;
            const minWeight = 18.5 * (heightInMeters * heightInMeters);
            const maxWeight = 24.9 * (heightInMeters * heightInMeters);
            const idealWeight = (minWeight + maxWeight) / 2;
            const weightToLose = weight - idealWeight;
            return (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      Lose <span className="font-bold">{weightToLose.toFixed(1)} kg</span> to reach ideal weight
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ideal target weight: {idealWeight.toFixed(1)} kg
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Ideal Target Weight */}
          {bmi > 0 && (() => {
            const heightInMeters = height / 100;
            const minWeight = 18.5 * (heightInMeters * heightInMeters);
            const maxWeight = 24.9 * (heightInMeters * heightInMeters);
            const idealWeight = (minWeight + maxWeight) / 2;
            const diff = Math.abs(weight - idealWeight);
            const isAtIdeal = diff < 1;
            return (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">🎯</span>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Ideal Target Weight</span>
                </div>
                <div className="flex items-center justify-center text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {idealWeight.toFixed(1)} kg
                </div>
                <p className={`text-xs mt-1 text-center ${isAtIdeal ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {isAtIdeal
                    ? `✅ You're at the ideal weight!`
                    : weight < idealWeight
                      ? `⬆️ Gain ${(idealWeight - weight).toFixed(1)} kg to reach ideal weight`
                      : `⬇️ Lose ${(weight - idealWeight).toFixed(1)} kg to reach ideal weight`
                  }
                </p>
              </div>
            );
          })()}

          <div className="text-xs text-muted-foreground">
            <p>BMR: {bmr} kcal | TDEE: {tdee} kcal</p>
          </div>
        </div>

        {/* Calorie Progress */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Today's Calories</span>
            <span className="text-sm text-muted-foreground">
              {todayCalories} / {calorieGoal} kcal
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${dietInfo.progress > 100 ? "bg-destructive" : "bg-primary"
                }`}
              style={{ width: `${Math.min(100, dietInfo.progress)}%` }}
            />
          </div>
          {dietInfo.calorieDiff !== 0 && (
            <p className="text-xs mt-2 text-muted-foreground">
              {dietInfo.calorieDiff > 0
                ? `${dietInfo.calorieDiff} kcal over goal`
                : `${Math.abs(dietInfo.calorieDiff)} kcal under goal`
              }
            </p>
          )}
        </div>

        {/* Exercise Calories to Burn */}
        {caloriesToBurn > 0 && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-destructive">
                Burn Today:
              </span>
              <span className="text-sm font-bold text-destructive">
                ~{caloriesToBurn} kcal
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              To reach your target weight of {target.toFixed(1)} kg
            </p>
          </div>
        )}

        {/* Exercise Suggestions with Home/Gym Tabs */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Recommended Exercises</span>
          </div>

          {/* Home / Gym Toggle */}
          <div className="flex rounded-xl bg-muted p-1 gap-1">
            <button
              onClick={() => setExerciseTab("home")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${exerciseTab === "home"
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => setExerciseTab("gym")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${exerciseTab === "gym"
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Building2 className="w-4 h-4" />
              Gym
            </button>
          </div>

          {/* Filtered Exercise List */}
          {(() => {
            const filteredExercises = recommendedExercises.filter(e => e.location === exerciseTab);
            const displayExercises = showAllExercises ? filteredExercises : filteredExercises.slice(0, 4);
            return (
              <>
                <div className="space-y-2">
                  {displayExercises.length > 0 ? displayExercises.map((exercise, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{exercise.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {exercise.duration}
                          </p>
                          {exercise.equipment !== "None" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {exercise.equipment}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">~{exercise.adjustedCalories}</p>
                        <p className="text-xs text-muted-foreground">kcal</p>
                      </div>
                    </div>
                  )) : (
                    <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-lg">
                      No {exerciseTab === "home" ? "home" : "gym"} exercises for this goal. Try the other tab!
                    </div>
                  )}
                </div>

                {filteredExercises.length > 4 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAllExercises(!showAllExercises)}
                  >
                    {showAllExercises ? "Show Less" : `View All ${filteredExercises.length} Exercises`}
                  </Button>
                )}
              </>
            );
          })()}
        </div>

        {/* Quick Tips */}
        <div className="pt-3 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Quick Tips</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-primary/5 rounded text-xs">
              <p className="font-medium">Stay Hydrated</p>
              <p className="text-muted-foreground">Drink 8+ glasses daily</p>
            </div>
            <div className="p-2 bg-accent/5 rounded text-xs">
              <p className="font-medium">Rest & Recover</p>
              <p className="text-muted-foreground">Sleep 7-9 hours</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExerciseIdeas;
