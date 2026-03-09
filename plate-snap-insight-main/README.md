# Plate Snap Insight

Plate Snap Insight is a food scanning and nutrition tracking app built with React + Vite + Supabase.
Users can sign in, scan meals with camera/gallery, get nutrition estimates from a Supabase Edge Function, and save meal history.

## Project Structure

- `plate-snap-insight-main/`: main web app (React + TypeScript)
- `food datas/`: sample food images

Most development work happens in `plate-snap-insight-main/`.

## Features

- Email/password authentication (Supabase Auth)
- User onboarding and profile setup
- Meal scan flow (camera + gallery upload fallback)
- ML-powered food analysis via Supabase Edge Function (`analyze-food`)
- Nutrition estimates (calories/macros)
- Allergen alerts and diet compliance checks
- Meal history and dashboard progress
- Rule-based in-app nutrition chatbot

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, Edge Functions)
- Capacitor Camera (with web fallback)

## Prerequisites

- Node.js 18+
- npm 9+
- Supabase project (for auth/database/functions)
- Optional: Supabase CLI (for local DB/function workflows)

## Quick Start

```powershell
cd plate-snap-insight-main
npm install
npm run dev
```

App runs at the local Vite URL shown in terminal (usually `http://localhost:5173`).

## Environment Variables

Create `plate-snap-insight-main/.env` with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Supabase Setup

Run SQL migrations from:

- `supabase/migrations/20251023133745_73d093cf-ad43-497b-9b7a-2265408fc437.sql`
- `supabase/migrations/20251025120000_add_exercise_columns.sql`

These create/update:

- `profiles` table
- `meals` table
- RLS policies and indexes
- profile exercise/diet columns

## Edge Function (Food Analysis)

- Function source: `supabase/functions/analyze-food/index.ts`
- Model artifact: `supabase/functions/analyze-food/model/model_artifact.json`
- Dataset: `supabase/functions/analyze-food/data/food_dataset.csv`

If using Supabase CLI:

```powershell
supabase functions serve analyze-food
```

## ML Model Workflow

From `plate-snap-insight-main/`:

```powershell
python ml/train_and_export_model.py
```

This retrains and exports the model artifact used by the `analyze-food` function.

## Build

```powershell
cd plate-snap-insight-main
npm run build
npm run preview
```

## Notes

- There is a duplicated nested app folder in the repository. Use `plate-snap-insight-main/` as the primary app directory.
- Some UI text/icons appear to have encoding artifacts; set files/editor to UTF-8 if you update those strings.
