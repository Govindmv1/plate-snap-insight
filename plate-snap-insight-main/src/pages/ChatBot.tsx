import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowLeft, Send, Bot, User, Sparkles, Utensils, Scale, Zap } from "lucide-react";

interface Message {
  id: number;
  role: "user" | "bot";
  content: string;
}

interface Profile {
  diet_plan_type: string;
  health_goals: string[];
  daily_calorie_goal: number;
}

// Food database with diet compatibility
const foodDatabase: Record<string, {
  name: string;
  category: string;
  bulk: "great" | "good" | "avoid";
  cut: "great" | "good" | "avoid";
  maintain: "great" | "good" | "avoid";
  reason: string;
}> = {
  chicken: {
    name: "Chicken Breast",
    category: "Protein",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "High protein, low fat - excellent for muscle building and fat loss."
  },
  rice: {
    name: "Rice (White/Brown)",
    category: "Carbs",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Great carb source for energy and muscle building."
  },
  broccoli: {
    name: "Broccoli",
    category: "Vegetable",
    bulk: "good",
    cut: "great",
    maintain: "great",
    reason: "Low calorie, high fiber, packed with nutrients."
  },
  egg: {
    name: "Eggs",
    category: "Protein",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Complete protein with essential amino acids."
  },
  oats: {
    name: "Oats",
    category: "Carbs",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Complex carbs for sustained energy and fiber."
  },
  salmon: {
    name: "Salmon",
    category: "Protein",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "High protein with healthy omega-3 fats."
  },
  banana: {
    name: "Banana",
    category: "Fruit",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Quick energy and potassium for workout recovery."
  },
  sweet_potato: {
    name: "Sweet Potato",
    category: "Carbs",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Complex carbs with vitamins and fiber."
  },
  avocado: {
    name: "Avocado",
    category: "Fat",
    bulk: "good",
    cut: "avoid",
    maintain: "good",
    reason: "High in healthy fats - limit on cut, good for bulk."
  },
  pizza: {
    name: "Pizza",
    category: "Junk Food",
    bulk: "good",
    cut: "avoid",
    maintain: "avoid",
    reason: "High calories and processed - enjoy in moderation."
  },
  burger: {
    name: "Burger",
    category: "Junk Food",
    bulk: "good",
    cut: "avoid",
    maintain: "avoid",
    reason: "High fat and calories - occasional treat only."
  },
  soda: {
    name: "Soda",
    category: "Beverage",
    bulk: "avoid",
    cut: "avoid",
    maintain: "avoid",
    reason: "Empty calories with no nutritional value."
  },
  ice_cream: {
    name: "Ice Cream",
    category: "Dessert",
    bulk: "good",
    cut: "avoid",
    maintain: "avoid",
    reason: "High sugar and fat - occasional treat only."
  },
  almonds: {
    name: "Almonds",
    category: "Nuts",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Healthy fats and protein - portion control needed."
  },
  spinach: {
    name: "Spinach",
    category: "Vegetable",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Nutrient-dense, low calorie, versatile."
  },
  beef: {
    name: "Beef",
    category: "Protein",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "High protein and iron - choose lean cuts."
  },
  yogurt: {
    name: "Greek Yogurt",
    category: "Dairy",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "High protein and probiotics for gut health."
  },
  bread: {
    name: "Bread",
    category: "Carbs",
    bulk: "great",
    cut: "avoid",
    maintain: "good",
    reason: "Simple carbs - limit on cut, fine for bulk."
  },
  pasta: {
    name: "Pasta",
    category: "Carbs",
    bulk: "great",
    cut: "avoid",
    maintain: "good",
    reason: "High carb - great for bulking, avoid on cut."
  },
  cheese: {
    name: "Cheese",
    category: "Dairy",
    bulk: "good",
    cut: "avoid",
    maintain: "good",
    reason: "High fat and calories - use sparingly."
  },
  apple: {
    name: "Apple",
    category: "Fruit",
    bulk: "good",
    cut: "great",
    maintain: "great",
    reason: "Fiber-rich, low calorie, satisfying snack."
  },
  tuna: {
    name: "Tuna",
    category: "Protein",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Low calorie, high protein, lean fish."
  },
  quinoa: {
    name: "Quinoa",
    category: "Carbs",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Complete protein grain with fiber."
  },
  peanut_butter: {
    name: "Peanut Butter",
    category: "Fat",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "High calorie but nutritious - portion control."
  },
  white_sugar: {
    name: "Sugar",
    category: "Sweetener",
    bulk: "avoid",
    cut: "avoid",
    maintain: "avoid",
    reason: "Empty calories causing fat gain."
  },
  alcohol: {
    name: "Alcohol",
    category: "Beverage",
    bulk: "avoid",
    cut: "avoid",
    maintain: "avoid",
    reason: "High calories, slows metabolism, bad for goals."
  },
  milk: {
    name: "Milk",
    category: "Dairy",
    bulk: "good",
    cut: "good",
    maintain: "good",
    reason: "Good protein and calcium source. Choose low-fat for cutting."
  },
  whey: {
    name: "Whey Protein",
    category: "Supplement",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Convenient protein source for muscle building and recovery."
  },
  coffee: {
    name: "Coffee",
    category: "Beverage",
    bulk: "good",
    cut: "good",
    maintain: "good",
    reason: "Can boost metabolism. Avoid excess sugar/cream."
  },
  ricecakes: {
    name: "Rice Cakes",
    category: "Snack",
    bulk: "good",
    cut: "good",
    maintain: "good",
    reason: "Low calorie snack but limited nutrition."
  },
  honey: {
    name: "Honey",
    category: "Sweetener",
    bulk: "good",
    cut: "avoid",
    maintain: "good",
    reason: "Natural sweetener, better than sugar but still high in calories."
  },
  olive_oil: {
    name: "Olive Oil",
    category: "Fat",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Healthy fats for cooking and dressings."
  },
  butter: {
    name: "Butter",
    category: "Fat",
    bulk: "good",
    cut: "avoid",
    maintain: "good",
    reason: "High in saturated fat - use sparingly on cut."
  },
  chips: {
    name: "Chips",
    category: "Snack",
    bulk: "good",
    cut: "avoid",
    maintain: "avoid",
    reason: "High calories, processed - occasional treat only."
  },
  chocolate: {
    name: "Chocolate",
    category: "Dessert",
    bulk: "good",
    cut: "avoid",
    maintain: "avoid",
    reason: "High sugar and fat - dark chocolate is better option."
  },
  orange: {
    name: "Orange",
    category: "Fruit",
    bulk: "good",
    cut: "great",
    maintain: "great",
    reason: "High in vitamin C, good fiber content."
  },
  watermelon: {
    name: "Watermelon",
    category: "Fruit",
    bulk: "good",
    cut: "great",
    maintain: "great",
    reason: "Low calorie, hydrating, satisfying sweet craving."
  },
  strawberry: {
    name: "Strawberries",
    category: "Fruit",
    bulk: "good",
    cut: "great",
    maintain: "great",
    reason: "Low calorie, high in antioxidants."
  },
  mango: {
    name: "Mango",
    category: "Fruit",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "High in vitamins but watch portions for cutting."
  },
  prawns: {
    name: "Prawns/Shrimp",
    category: "Protein",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Low fat, high protein seafood option."
  },
  tofu: {
    name: "Tofu",
    category: "Protein",
    bulk: "good",
    cut: "great",
    maintain: "great",
    reason: "Plant protein, good for vegetarians."
  },
  lentils: {
    name: "Lentils",
    category: "Protein",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "High protein and fiber legume."
  },
  beans: {
    name: "Black Beans",
    category: "Protein",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Good plant protein and fiber."
  },
  cucumber: {
    name: "Cucumber",
    category: "Vegetable",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Zero calories, hydrating, great for snacking."
  },
  carrot: {
    name: "Carrots",
    category: "Vegetable",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "High in vitamin A, good for cutting."
  },
  corn: {
    name: "Corn",
    category: "Vegetable",
    bulk: "good",
    cut: "good",
    maintain: "good",
    reason: "Higher in carbs, portion control needed."
  },
  lettuce: {
    name: "Lettuce",
    category: "Vegetable",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Very low calorie, good for volume eating."
  },
  tomato: {
    name: "Tomato",
    category: "Vegetable",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Low calorie, high in lycopene."
  },
  mushroom: {
    name: "Mushrooms",
    category: "Vegetable",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Low calorie, high in nutrients."
  },
  cauliflower: {
    name: "Cauliflower",
    category: "Vegetable",
    bulk: "good",
    cut: "great",
    maintain: "great",
    reason: "Great low-carb alternative to rice/potato."
  },
  biriyani: {
    name: "Biriyani",
    category: "Indian",
    bulk: "great",
    cut: "avoid",
    maintain: "good",
    reason: "High calorie rice dish with spices and meat. Great for bulking, avoid on cut."
  },
  dosa: {
    name: "Dosa",
    category: "Indian",
    bulk: "good",
    cut: "avoid",
    maintain: "good",
    reason: "Fermented rice pancake - high carbs, best limited on cut."
  },
  idli: {
    name: "Idli",
    category: "Indian",
    bulk: "good",
    cut: "good",
    maintain: "great",
    reason: "Steamed rice cakes - lighter than dosa, decent protein."
  },
  sambar: {
    name: "Sambar",
    category: "Indian",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Lentil-based vegetable curry - high protein, healthy choice."
  },
  chapati: {
    name: "Chapati/Roti",
    category: "Indian",
    bulk: "good",
    cut: "good",
    maintain: "good",
    reason: "Whole wheat flatbread - better than refined flour options."
  },
  dal: {
    name: "Dal/Lentils",
    category: "Indian",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Excellent plant protein, fiber-rich, great for all diets."
  },
  paneer: {
    name: "Paneer",
    category: "Indian",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Indian cottage cheese - high protein, good for muscle building."
  },
  butter_chicken: {
    name: "Butter Chicken",
    category: "Indian",
    bulk: "good",
    cut: "avoid",
    maintain: "good",
    reason: "Creamy tomato curry - high in calories and fat, occasional treat."
  },
  naan: {
    name: "Naan Bread",
    category: "Indian",
    bulk: "good",
    cut: "avoid",
    maintain: "good",
    reason: "Tandoor-baked bread - high carbs from refined flour."
  },
  samosa: {
    name: "Samosa",
    category: "Indian",
    bulk: "good",
    cut: "avoid",
    maintain: "avoid",
    reason: "Fried pastry with potato filling - high calories, occasional treat."
  },
  dahi: {
    name: "Dahi/Curd",
    category: "Indian",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Probiotic-rich, good protein, great for gut health."
  },
  fried_rice: {
    name: "Fried Rice",
    category: "Chinese",
    bulk: "good",
    cut: "avoid",
    maintain: "good",
    reason: "High carb and calories from frying, occasional meal."
  },
  noodles: {
    name: "Noodles",
    category: "Chinese",
    bulk: "good",
    cut: "avoid",
    maintain: "good",
    reason: "Refined carbs, limited nutrition - watch portions."
  },
  sushi: {
    name: "Sushi",
    category: "Japanese",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Good protein from fish, moderate carbs from rice."
  },
  shawarma: {
    name: "Shawarma",
    category: "Middle Eastern",
    bulk: "great",
    cut: "good",
    maintain: "good",
    reason: "High protein from meat, watch bread and sauce portions."
  },
  hummus: {
    name: "Hummus",
    category: "Middle Eastern",
    bulk: "great",
    cut: "good",
    maintain: "great",
    reason: "Chickpea-based dip - good protein and healthy fats."
  },
  french_fries: {
    name: "French Fries",
    category: "Fast Food",
    bulk: "good",
    cut: "avoid",
    maintain: "avoid",
    reason: "High calories from deep frying, limited nutrition."
  },
  popcorn: {
    name: "Popcorn",
    category: "Snack",
    bulk: "good",
    cut: "great",
    maintain: "great",
    reason: "Low calorie snack, avoid excessive butter and salt."
  },
  protein_bar: {
    name: "Protein Bar",
    category: "Supplement",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Convenient protein source, choose low sugar options."
  },
  green_tea: {
    name: "Green Tea",
    category: "Beverage",
    bulk: "great",
    cut: "great",
    maintain: "great",
    reason: "Metabolism boosting, antioxidants, great for all diets."
  },
  pineapple: {
    name: "Pineapple",
    category: "Fruit",
    bulk: "good",
    cut: "great",
    maintain: "great",
    reason: "High in vitamin C and bromelain, good for digestion."
  },
};

// Get emoji for rating
const getRatingEmoji = (rating: "great" | "good" | "avoid"): string => {
  switch (rating) {
    case "great": return "✅";
    case "good": return "⚠️";
    case "avoid": return "❌";
  }
};

// Get rating text
const getRatingText = (rating: "great" | "good" | "avoid"): string => {
  switch (rating) {
    case "great": return "Great Choice";
    case "good": return "Moderate";
    case "avoid": return "Avoid";
  }
};

const ChatBot = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "bot",
      content: "Hi! I'm your nutrition assistant. I know you're following a diet plan. Ask me about any food - like 'Can I eat pizza on my diet?' or 'What foods are good for bulking?'"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("diet_plan_type, health_goals, daily_calorie_goal")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const getDietPlanName = (): string => {
    if (!profile) return "maintain";
    return profile.diet_plan_type || "maintain";
  };

  const analyzeFood = (foodName: string): string => {
    const searchKey = foodName.toLowerCase().replace(/\s+/g, "_");
    
    // Find matching food
    let food = foodDatabase[searchKey];
    
    // Try partial match
    if (!food) {
      const keys = Object.keys(foodDatabase);
      const match = keys.find(k => k.includes(searchKey) || foodDatabase[k].name.toLowerCase().includes(foodName.toLowerCase()));
      if (match) food = foodDatabase[match];
    }

    if (!food) {
      return `I don't have information about "${foodName}" in my database. Try asking about common foods like chicken, rice, broccoli, eggs, salmon, etc.`;
    }

    const dietPlan = getDietPlanName();
    const rating = food[dietPlan as keyof typeof food] as "great" | "good" | "avoid";
    
    return `${getRatingEmoji(rating)} **${food.name}** - ${getRatingText(rating)} for ${dietPlan}!\n\n${food.reason}\n\n📊 Ratings:\n- Bulk: ${getRatingEmoji(food.bulk)} ${food.bulk}\n- Cut: ${getRatingEmoji(food.cut)} ${food.cut}\n- Maintain: ${getRatingEmoji(food.maintain)} ${food.maintain}`;
  };

  const getDietRecommendations = (): string => {
    const dietPlan = getDietPlanName();
    const goals = profile?.health_goals?.join(", ") || "general health";
    
    let recommendation = `📋 **Your Current Plan: ${dietPlan.toUpperCase()}**\n`;
    recommendation += `🎯 Goals: ${goals}\n`;
    recommendation += `🔥 Daily Calories: ${profile?.daily_calorie_goal || 2000} kcal\n\n`;
    
    if (dietPlan === "bulk") {
      recommendation += `**For Muscle Building (Bulking):**\n`;
      recommendation += `✅ **Great Foods:** Chicken, Beef, Salmon, Eggs, Rice, Oats, Sweet Potato, Quinoa, Banana, Peanuts, Greek Yogurt\n`;
      recommendation += `⚠️ **Eat in Moderation:** Cheese, Avocado, Bread, Ice Cream\n`;
      recommendation += `❌ **Avoid:** Sugar, Soda, Alcohol, Fried foods\n`;
      recommendation += `\n💡 Focus on calorie surplus with protein-rich foods.`;
    } else if (dietPlan === "cut") {
      recommendation += `**For Fat Loss (Cutting):**\n`;
      recommendation += `✅ **Great Foods:** Chicken Breast, Salmon, Tuna, Eggs, Broccoli, Spinach, Greek Yogurt, Apple, Banana\n`;
      recommendation += `⚠️ **Eat in Moderation:** Rice, Oats, Sweet Potato, Almonds, Peanut Butter\n`;
      recommendation += `❌ **Avoid:** Pizza, Burger, Bread, Pasta, Cheese, Ice Cream, Sugar, Soda, Alcohol\n`;
      recommendation += `\n💡 Focus on protein-rich, low-calorie foods.`;
    } else {
      recommendation += `**For Maintenance:**\n`;
      recommendation += `✅ **Great Foods:** Chicken, Salmon, Eggs, Rice, Oats, Vegetables, Fruits, Greek Yogurt\n`;
      recommendation += `⚠️ **Eat in Moderation:** Bread, Pasta, Cheese, Avocado\n`;
      recommendation += `❌ **Limit:** Junk food, Sugar, Soda, Alcohol\n`;
      recommendation += `\n💡 Balance protein, carbs, and healthy fats.`;
    }
    
    return recommendation;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Simulate typing delay
    setTimeout(() => {
      let response: string;
      const userInput = input.toLowerCase();
      
      // Check for diet plan questions
      if (userInput.includes("what") && (userInput.includes("eat") || userInput.includes("food") || userInput.includes("diet"))) {
        response = getDietRecommendations();
      }
      // Check for specific food questions
      else if (userInput.includes("can i eat") || userInput.includes("can i have") || userInput.includes("is") || userInput.includes("eating")) {
        // Extract food name
        const foodPatterns = [
          /can i (eat|have)\s+(.+?)(?:\?|$)/i,
          /is\s+(.+?)\s+(good|okay|allowed)(?:\?|$)/i,
          /eating\s+(.+?)(?:\?|$)/i
        ];
        
        let foodName = "";
        for (const pattern of foodPatterns) {
          const match = userInput.match(pattern);
          if (match && match[2]) {
            foodName = match[2].trim();
            break;
          }
        }
        
        if (foodName) {
          response = analyzeFood(foodName);
        } else {
          response = getDietRecommendations();
        }
      }
      // Check for bulk/cut questions
      else if (userInput.includes("bulk")) {
        response = "For **Bulking**, focus on:\n✅ High protein: Chicken, Beef, Salmon, Eggs\n✅ Complex carbs: Rice, Oats, Sweet Potato, Quinoa\n✅ Healthy fats: Peanuts, Avocado\n\nEat in calorie surplus with strength training!";
      }
      else if (userInput.includes("cut") || userInput.includes("lose weight") || userInput.includes("fat loss")) {
        response = "For **Cutting/Fat Loss**, focus on:\n✅ Lean protein: Chicken Breast, Salmon, Tuna, Eggs\n✅ High fiber: Broccoli, Spinach, Apple\n✅ Low calorie density foods\n\nCreate calorie deficit with cardio!";
      }
      // Check for recommendations
      else if (userInput.includes("recommend") || userInput.includes("suggest") || userInput.includes("good")) {
        response = getDietRecommendations();
      }
      // Default response
      else {
        response = "I can help you with food choices for your diet! Try asking:\n- 'Can I eat pizza?'\n- 'What foods are good for bulking?'\n- 'What should I eat on my cut?'\n- 'Give me diet recommendations'";
      }
      
      const botMessage: Message = {
        id: messages.length + 2,
        role: "bot",
        content: response
      };
      
      setMessages(prev => [...prev, botMessage]);
      setLoading(false);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" />
              Nutrition Assistant
            </h1>
            <p className="text-muted-foreground text-sm">
              Your diet plan: {profile?.diet_plan_type || "maintain"} | {profile?.daily_calorie_goal || 2000} kcal/day
            </p>
          </div>
        </div>

        <Card className="shadow-card h-[600px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-accent" />
              Ask about any food
            </CardTitle>
            <CardDescription>
              I'll tell you if it's good for your {profile?.diet_plan_type || "maintain"} diet
            </CardDescription>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-2 max-w-[80%] ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === "user" ? "bg-primary" : "bg-accent"
                    }`}>
                      {message.role === "user" ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-primary text-white"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Thinking...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask: Can I eat pizza on my diet?"
                disabled={loading}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            className="text-xs"
            onClick={() => {
              setInput("What foods are good for bulking?");
              handleSend();
            }}
          >
            <Scale className="w-3 h-3 mr-1" />
            Bulk Foods
          </Button>
          <Button 
            variant="outline" 
            className="text-xs"
            onClick={() => {
              setInput("What foods are good for cutting?");
              handleSend();
            }}
          >
            <Zap className="w-3 h-3 mr-1" />
            Cut Foods
          </Button>
          <Button 
            variant="outline" 
            className="text-xs"
            onClick={() => {
              setInput("Give me diet recommendations");
              handleSend();
            }}
          >
            <Utensils className="w-3 h-3 mr-1" />
            Recommendations
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
