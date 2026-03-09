# ML Workflow

This project now includes a reproducible ML pipeline for food prediction.

## Dataset
- CSV: `supabase/functions/analyze-food/data/food_dataset.csv`
- Rows: 1200 samples
- Label: `food_name`
- Features used: `image_r`, `image_g`, `image_b`, `brightness`

## Training
Run from project root:

```powershell
python ml/train_and_export_model.py
```

This script performs:
- Stratified train/test split (80/20)
- Model comparison:
  - k-NN classifier
  - Nearest Centroid classifier
- Accuracy evaluation on test split
- Export of trained artifact

## Trained Artifact
- File: `supabase/functions/analyze-food/model/model_artifact.json`
- Contains:
  - selected model
  - metrics (test accuracy)
  - centroids
  - train samples (for k-NN)
  - per-food nutrition profiles

## Inference Runtime
`supabase/functions/analyze-food/index.ts` loads the artifact and predicts:
- detected foods
- nutritional estimates
- allergen alerts
- dietary compliance
- health score and recommendations

No UI changes are required.
