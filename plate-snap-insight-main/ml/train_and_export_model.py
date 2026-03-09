#!/usr/bin/env python3
"""Train a lightweight food-analysis model from CSV and export an artifact for edge inference."""

from __future__ import annotations

import csv
import json
import math
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

RANDOM_SEED = 42
TRAIN_RATIO = 0.8
K_NEIGHBORS = 9


@dataclass
class Sample:
    label: str
    features: Tuple[float, float, float, float]


@dataclass
class FoodProfile:
    food_name: str
    portion_label: str
    portion_grams: float
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    fiber_per_100g: float
    sodium_mg_per_100g: float
    is_vegan: bool
    is_vegetarian: bool
    is_gluten_free: bool
    allergens: List[str]


def euclidean(a: Sequence[float], b: Sequence[float]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def parse_bool(value: str) -> bool:
    return value.strip() == "1"


def read_dataset(dataset_path: Path) -> Tuple[List[Sample], Dict[str, List[dict]]]:
    samples: List[Sample] = []
    rows_by_food: Dict[str, List[dict]] = defaultdict(list)

    with dataset_path.open("r", encoding="utf-8", newline="") as f:
      reader = csv.DictReader(f)
      for row in reader:
          food_name = row["food_name"].strip()
          sample = Sample(
              label=food_name,
              features=(
                  float(row["image_r"]),
                  float(row["image_g"]),
                  float(row["image_b"]),
                  float(row["brightness"]),
              ),
          )
          samples.append(sample)
          rows_by_food[food_name].append(row)

    return samples, rows_by_food


def stratified_split(samples: List[Sample], ratio: float, seed: int) -> Tuple[List[Sample], List[Sample]]:
    random.seed(seed)
    per_class: Dict[str, List[Sample]] = defaultdict(list)
    for sample in samples:
        per_class[sample.label].append(sample)

    train: List[Sample] = []
    test: List[Sample] = []

    for label, items in per_class.items():
        random.shuffle(items)
        split_idx = max(1, min(len(items) - 1, int(len(items) * ratio)))
        train.extend(items[:split_idx])
        test.extend(items[split_idx:])

    random.shuffle(train)
    random.shuffle(test)
    return train, test


def train_centroids(train: List[Sample]) -> Dict[str, Tuple[float, float, float, float]]:
    sums: Dict[str, List[float]] = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0])
    counts: Dict[str, int] = defaultdict(int)

    for sample in train:
        counts[sample.label] += 1
        for i, value in enumerate(sample.features):
            sums[sample.label][i] += value

    centroids: Dict[str, Tuple[float, float, float, float]] = {}
    for label, vec in sums.items():
        n = counts[label]
        centroids[label] = (vec[0] / n, vec[1] / n, vec[2] / n, vec[3] / n)
    return centroids


def predict_centroid(features: Sequence[float], centroids: Dict[str, Tuple[float, float, float, float]]) -> str:
    best_label = ""
    best_dist = float("inf")
    for label, centroid in centroids.items():
        dist = euclidean(features, centroid)
        if dist < best_dist:
            best_dist = dist
            best_label = label
    return best_label


def predict_knn(features: Sequence[float], train: List[Sample], k: int) -> str:
    distances = sorted(
        ((sample.label, euclidean(features, sample.features)) for sample in train),
        key=lambda x: x[1],
    )[:k]

    votes: Dict[str, float] = defaultdict(float)
    for label, dist in distances:
        votes[label] += 1.0 / (dist + 1e-6)

    return max(votes.items(), key=lambda x: x[1])[0]


def accuracy(y_true: List[str], y_pred: List[str]) -> float:
    correct = sum(1 for a, b in zip(y_true, y_pred) if a == b)
    return correct / len(y_true) if y_true else 0.0


def build_food_profiles(rows_by_food: Dict[str, List[dict]]) -> Dict[str, FoodProfile]:
    profiles: Dict[str, FoodProfile] = {}
    for food_name, rows in rows_by_food.items():
        n = len(rows)
        portion_counter = Counter(row["portion_label"] for row in rows)
        allergen_set = set()

        portion_grams = 0.0
        calories = 0.0
        protein = 0.0
        carbs = 0.0
        fat = 0.0
        fiber = 0.0
        sodium = 0.0
        vegan_count = 0
        vegetarian_count = 0
        gluten_free_count = 0

        for row in rows:
            portion_grams += float(row["portion_grams"])
            calories += float(row["calories_per_100g"])
            protein += float(row["protein_per_100g"])
            carbs += float(row["carbs_per_100g"])
            fat += float(row["fat_per_100g"])
            fiber += float(row["fiber_per_100g"])
            sodium += float(row["sodium_mg_per_100g"])

            if parse_bool(row["is_vegan"]):
                vegan_count += 1
            if parse_bool(row["is_vegetarian"]):
                vegetarian_count += 1
            if parse_bool(row["is_gluten_free"]):
                gluten_free_count += 1

            allergens = row["allergens"].strip()
            if allergens and allergens != "none":
                for allergen in allergens.split("|"):
                    cleaned = allergen.strip().lower()
                    if cleaned:
                        allergen_set.add(cleaned)

        profiles[food_name] = FoodProfile(
            food_name=food_name,
            portion_label=portion_counter.most_common(1)[0][0],
            portion_grams=portion_grams / n,
            calories_per_100g=calories / n,
            protein_per_100g=protein / n,
            carbs_per_100g=carbs / n,
            fat_per_100g=fat / n,
            fiber_per_100g=fiber / n,
            sodium_mg_per_100g=sodium / n,
            is_vegan=(vegan_count / n) >= 0.7,
            is_vegetarian=(vegetarian_count / n) >= 0.7,
            is_gluten_free=(gluten_free_count / n) >= 0.7,
            allergens=sorted(allergen_set),
        )

    return profiles


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    dataset_path = root / "supabase" / "functions" / "analyze-food" / "data" / "food_dataset.csv"
    model_dir = root / "supabase" / "functions" / "analyze-food" / "model"
    model_path = model_dir / "model_artifact.json"

    samples, rows_by_food = read_dataset(dataset_path)
    train, test = stratified_split(samples, TRAIN_RATIO, RANDOM_SEED)

    centroids = train_centroids(train)

    y_true = [sample.label for sample in test]
    y_centroid = [predict_centroid(sample.features, centroids) for sample in test]
    y_knn = [predict_knn(sample.features, train, K_NEIGHBORS) for sample in test]

    centroid_acc = accuracy(y_true, y_centroid)
    knn_acc = accuracy(y_true, y_knn)
    selected_model = "knn" if knn_acc >= centroid_acc else "centroid"

    profiles = build_food_profiles(rows_by_food)

    artifact = {
        "meta": {
            "trained_at_utc": datetime.now(timezone.utc).isoformat(),
            "random_seed": RANDOM_SEED,
            "train_ratio": TRAIN_RATIO,
            "k_neighbors": K_NEIGHBORS,
            "feature_names": ["image_r", "image_g", "image_b", "brightness"],
            "label_name": "food_name",
            "dataset_rows": len(samples),
            "food_classes": len(profiles),
        },
        "metrics": {
            "centroid_accuracy": round(centroid_acc, 4),
            "knn_accuracy": round(knn_acc, 4),
            "test_samples": len(test),
            "train_samples": len(train),
        },
        "selected_model": selected_model,
        "centroids": {label: list(vec) for label, vec in centroids.items()},
        "train_samples": [
            {"label": sample.label, "features": list(sample.features)}
            for sample in train
        ],
        "food_profiles": {
            name: {
                "food_name": profile.food_name,
                "portion_label": profile.portion_label,
                "portion_grams": round(profile.portion_grams, 2),
                "calories_per_100g": round(profile.calories_per_100g, 4),
                "protein_per_100g": round(profile.protein_per_100g, 4),
                "carbs_per_100g": round(profile.carbs_per_100g, 4),
                "fat_per_100g": round(profile.fat_per_100g, 4),
                "fiber_per_100g": round(profile.fiber_per_100g, 4),
                "sodium_mg_per_100g": round(profile.sodium_mg_per_100g, 4),
                "is_vegan": profile.is_vegan,
                "is_vegetarian": profile.is_vegetarian,
                "is_gluten_free": profile.is_gluten_free,
                "allergens": profile.allergens,
            }
            for name, profile in profiles.items()
        },
    }

    model_dir.mkdir(parents=True, exist_ok=True)
    with model_path.open("w", encoding="utf-8") as f:
        json.dump(artifact, f, ensure_ascii=True, indent=2)

    print("Model artifact saved:", model_path)
    print("Selected model:", selected_model)
    print("Centroid accuracy:", round(centroid_acc, 4))
    print("k-NN accuracy:", round(knn_acc, 4))


if __name__ == "__main__":
    main()
