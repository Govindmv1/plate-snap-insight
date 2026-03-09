import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ImageFeatures = {
  r: number;
  g: number;
  b: number;
  brightness: number;
};

type TrainSample = {
  label: string;
  features: [number, number, number, number];
};

type FoodProfile = {
  food_name: string;
  portion_label: string;
  portion_grams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sodium_mg_per_100g: number;
  is_vegan: boolean;
  is_vegetarian: boolean;
  is_gluten_free: boolean;
  allergens: string[];
};

type ModelArtifact = {
  meta: {
    trained_at_utc: string;
    random_seed: number;
    train_ratio: number;
    k_neighbors: number;
    feature_names: string[];
    label_name: string;
    dataset_rows: number;
    food_classes: number;
  };
  metrics: {
    centroid_accuracy: number;
    knn_accuracy: number;
    test_samples: number;
    train_samples: number;
  };
  selected_model: "centroid" | "knn";
  centroids: Record<string, [number, number, number, number]>;
  train_samples: TrainSample[];
  food_profiles: Record<string, FoodProfile>;
};

let cachedModel: ModelArtifact | null = null;

const loadModel = async (): Promise<ModelArtifact> => {
  if (cachedModel) return cachedModel;

  const modelUrl = new URL("./model/model_artifact.json", import.meta.url);
  const text = await Deno.readTextFile(modelUrl);
  cachedModel = JSON.parse(text) as ModelArtifact;
  return cachedModel;
};

const stripBase64Prefix = (value: string): string => {
  const idx = value.indexOf(",");
  return idx >= 0 ? value.slice(idx + 1) : value;
};

const extractImageFeatures = (imageBase64: string): ImageFeatures => {
  const payload = stripBase64Prefix(imageBase64);
  const binary = atob(payload);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));

  if (!bytes.length) {
    return { r: 127, g: 127, b: 127, brightness: 127 };
  }

  const third = Math.max(1, Math.floor(bytes.length / 3));

  const avg = (start: number, end: number): number => {
    let total = 0;
    let count = 0;
    for (let i = start; i < end && i < bytes.length; i++) {
      total += bytes[i];
      count += 1;
    }
    return count ? total / count : 127;
  };

  const r = avg(0, third);
  const g = avg(third, third * 2);
  const b = avg(third * 2, bytes.length);

  return {
    r,
    g,
    b,
    brightness: (r + g + b) / 3,
  };
};

const toFeatureArray = (features: ImageFeatures): [number, number, number, number] => [
  features.r,
  features.g,
  features.b,
  features.brightness,
];

const distance = (a: [number, number, number, number], b: [number, number, number, number]): number => {
  const d0 = a[0] - b[0];
  const d1 = a[1] - b[1];
  const d2 = a[2] - b[2];
  const d3 = a[3] - b[3];
  return Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3);
};

const topLabelsFromCentroid = (
  model: ModelArtifact,
  features: [number, number, number, number],
  limit: number,
): Array<{ label: string; score: number; dist: number }> => {
  const ranked = Object.entries(model.centroids)
    .map(([label, centroid]) => {
      const dist = distance(features, centroid);
      return { label, dist, score: 1 / (dist + 1e-6) };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);

  return ranked;
};

const topLabelsFromKnn = (
  model: ModelArtifact,
  features: [number, number, number, number],
  limit: number,
): Array<{ label: string; score: number; dist: number }> => {
  const nearest = model.train_samples
    .map((sample) => ({
      label: sample.label,
      dist: distance(features, sample.features),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, model.meta.k_neighbors);

  const aggregate = new Map<string, { score: number; minDist: number }>();

  for (const item of nearest) {
    const weight = 1 / (item.dist + 1e-6);
    const current = aggregate.get(item.label);
    if (!current) {
      aggregate.set(item.label, { score: weight, minDist: item.dist });
    } else {
      current.score += weight;
      current.minDist = Math.min(current.minDist, item.dist);
      aggregate.set(item.label, current);
    }
  }

  return Array.from(aggregate.entries())
    .map(([label, value]) => ({ label, score: value.score, dist: value.minDist }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

const normalizeScores = (items: Array<{ label: string; score: number; dist: number }>) => {
  const total = items.reduce((sum, item) => sum + item.score, 0);
  return items.map((item) => ({
    ...item,
    normalized: total > 0 ? item.score / total : 0,
  }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, userAllergies, dietaryPreferences, mealWeight } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      throw new Error("imageBase64 is required");
    }

    const model = await loadModel();
    const rawFeatures = extractImageFeatures(imageBase64);
    const featureVector = toFeatureArray(rawFeatures);

    const ranked = model.selected_model === "knn"
      ? topLabelsFromKnn(model, featureVector, 3)
      : topLabelsFromCentroid(model, featureVector, 3);

    if (!ranked.length) {
      throw new Error("Unable to predict food from model");
    }

    const topPredictions = normalizeScores(ranked).filter((item) => model.food_profiles[item.label]);
    if (!topPredictions.length) {
      throw new Error("Model prediction missing food profile data");
    }

    const safeMealWeight = Number.isFinite(Number(mealWeight)) && Number(mealWeight) > 0
      ? Number(mealWeight)
      : null;

    const estimatedPortion = topPredictions.reduce((sum, item) => {
      const profile = model.food_profiles[item.label];
      return sum + profile.portion_grams * item.normalized;
    }, 0);

    const effectiveWeight = safeMealWeight ?? Math.max(80, Math.round(estimatedPortion));

    const per100 = topPredictions.reduce((acc, item) => {
      const profile = model.food_profiles[item.label];
      acc.calories += profile.calories_per_100g * item.normalized;
      acc.protein += profile.protein_per_100g * item.normalized;
      acc.carbs += profile.carbs_per_100g * item.normalized;
      acc.fat += profile.fat_per_100g * item.normalized;
      acc.fiber += profile.fiber_per_100g * item.normalized;
      acc.sodium += profile.sodium_mg_per_100g * item.normalized;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 });

    const multiplier = effectiveWeight / 100;
    const nutritionalData = {
      calories: Math.round(per100.calories * multiplier),
      protein: Number((per100.protein * multiplier).toFixed(1)),
      carbs: Number((per100.carbs * multiplier).toFixed(1)),
      fat: Number((per100.fat * multiplier).toFixed(1)),
      fiber: Number((per100.fiber * multiplier).toFixed(1)),
      sodium: Math.round(per100.sodium * multiplier),
      vitamins: ["Vitamin A", "Vitamin C", "Vitamin B12"],
      minerals: ["Potassium", "Iron", "Calcium"],
    };

    const detectedFoods = topPredictions.map((item) => {
      const profile = model.food_profiles[item.label];
      const distConfidence = Math.max(0, Math.min(1, 1 - (item.dist / 441)));
      return {
        name: item.label,
        portion: safeMealWeight
          ? `${Math.round(effectiveWeight * item.normalized)}g (estimated share)`
          : profile.portion_label,
        confidence: Number(distConfidence.toFixed(2)),
      };
    });

    const matchedAllergens = new Set<string>();
    for (const item of topPredictions) {
      const profile = model.food_profiles[item.label];
      for (const allergen of profile.allergens) {
        matchedAllergens.add(allergen.toLowerCase());
      }
    }

    const userAllergySet = new Set<string>(
      Array.isArray(userAllergies)
        ? userAllergies.map((value: string) => value.toLowerCase().trim()).filter(Boolean)
        : [],
    );

    const allergenAlerts = Array.from(matchedAllergens)
      .filter((allergen) => userAllergySet.has(allergen))
      .map((allergen) => `Contains ${allergen} (matches your allergy)`);

    const veganScore = topPredictions.reduce((sum, item) => {
      const profile = model.food_profiles[item.label];
      return sum + (profile.is_vegan ? item.normalized : 0);
    }, 0);

    const vegetarianScore = topPredictions.reduce((sum, item) => {
      const profile = model.food_profiles[item.label];
      return sum + (profile.is_vegetarian ? item.normalized : 0);
    }, 0);

    const glutenFreeScore = topPredictions.reduce((sum, item) => {
      const profile = model.food_profiles[item.label];
      return sum + (profile.is_gluten_free ? item.normalized : 0);
    }, 0);

    const dietaryCompliance = {
      vegan: veganScore >= 0.7,
      vegetarian: vegetarianScore >= 0.7,
      glutenFree: glutenFreeScore >= 0.7,
      keto: nutritionalData.carbs <= 20,
      lowSodium: nutritionalData.sodium <= 500,
    };

    const recommendations: string[] = [];

    if (nutritionalData.calories > 700) {
      recommendations.push("High-calorie meal detected; consider a smaller portion next time.");
    }
    if (nutritionalData.protein < 18) {
      recommendations.push("Protein is modest; pair with a protein-rich side for better balance.");
    }
    if (nutritionalData.fiber < 6) {
      recommendations.push("Add vegetables or legumes to improve fiber intake.");
    }
    if (nutritionalData.sodium > 700) {
      recommendations.push("Sodium appears high; drink water and balance with low-salt meals later.");
    }

    const preferenceSet = new Set<string>(
      Array.isArray(dietaryPreferences)
        ? dietaryPreferences.map((value: string) => value.toLowerCase().trim()).filter(Boolean)
        : [],
    );

    if (preferenceSet.has("vegan") && !dietaryCompliance.vegan) {
      recommendations.push("This meal may not be fully vegan.");
    }
    if (preferenceSet.has("vegetarian") && !dietaryCompliance.vegetarian) {
      recommendations.push("This meal may not be fully vegetarian.");
    }
    if ((preferenceSet.has("gluten-free") || preferenceSet.has("gluten free")) && !dietaryCompliance.glutenFree) {
      recommendations.push("This meal may contain gluten.");
    }

    if (!recommendations.length) {
      recommendations.push("Meal looks balanced based on the trained ML model.");
    }

    const healthScore = Number(
      Math.max(
        1,
        Math.min(
          10,
          7
            + (nutritionalData.protein >= 20 ? 1 : 0)
            + (nutritionalData.fiber >= 7 ? 0.5 : 0)
            - (nutritionalData.sodium > 700 ? 1 : 0)
            - (nutritionalData.calories > 800 ? 1 : 0),
        ),
      ).toFixed(1),
    );

    return new Response(
      JSON.stringify({
        detectedFoods,
        nutritionalData,
        allergenAlerts,
        dietaryCompliance,
        healthScore,
        recommendations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in analyze-food function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
