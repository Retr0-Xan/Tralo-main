-- Add cost_price column to user_products table to store latest cost price
-- This ensures cost price is always saved, even when no receipt is created

ALTER TABLE public.user_products 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_products_cost_price ON public.user_products(cost_price);

COMMENT ON COLUMN public.user_products.cost_price IS 'Latest cost price per unit - used for auto-fill and margin calculations';
