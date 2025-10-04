-- Add new columns to business_profiles for Business Overview section
ALTER TABLE public.business_profiles
ADD COLUMN years_founded TEXT,
ADD COLUMN stock_freshness TEXT,
ADD COLUMN community_focus TEXT,
ADD COLUMN quality_commitment TEXT;