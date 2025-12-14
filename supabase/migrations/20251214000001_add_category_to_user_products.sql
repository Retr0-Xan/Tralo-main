-- Add category column to user_products table for better product organization
-- This allows auto-filling category when re-recording the same product

ALTER TABLE public.user_products 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for faster category-based queries
CREATE INDEX IF NOT EXISTS idx_user_products_category ON public.user_products(category);

COMMENT ON COLUMN public.user_products.category IS 'Product category (Electronics, Staples, Vegetables, etc.) - used for auto-fill';
