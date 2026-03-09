-- Add exercise-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_calorie_goal INTEGER,
ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS preferred_exercises TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS diet_plan_type TEXT DEFAULT 'maintain',
ADD COLUMN IF NOT EXISTS target_weight DECIMAL;

-- Update activity_level values
COMMENT ON COLUMN public.profiles.activity_level IS 'Options: sedentary, light, moderate, active, very_active';
-- Update diet_plan_type values  
COMMENT ON COLUMN public.profiles.diet_plan_type IS 'Options: cut, bulk, maintain';
-- Update target_weight
COMMENT ON COLUMN public.profiles.target_weight IS 'Target weight in kg for weight loss/gain goals';
