-- Add international_unit and local_unit columns to track units of measure
-- These fields are used to display quantities in receipts and analytics

-- Add to user_products table
ALTER TABLE public.user_products 
ADD COLUMN IF NOT EXISTS international_unit TEXT,
ADD COLUMN IF NOT EXISTS local_unit TEXT;

-- Add to inventory_receipts
ALTER TABLE public.inventory_receipts 
ADD COLUMN IF NOT EXISTS international_unit TEXT,
ADD COLUMN IF NOT EXISTS local_unit TEXT;

-- Add to inventory_movements
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS international_unit TEXT,
ADD COLUMN IF NOT EXISTS local_unit TEXT;

-- Add comments
COMMENT ON COLUMN public.user_products.international_unit IS 'International unit of measure (e.g., kg, liters)';
COMMENT ON COLUMN public.user_products.local_unit IS 'Local unit of measure (e.g., bags, crates) - prioritized when available';
COMMENT ON COLUMN public.inventory_receipts.international_unit IS 'International unit for received items';
COMMENT ON COLUMN public.inventory_receipts.local_unit IS 'Local unit for received items - prioritized when available';
COMMENT ON COLUMN public.inventory_movements.international_unit IS 'International unit for inventory movements';
COMMENT ON COLUMN public.inventory_movements.local_unit IS 'Local unit for inventory movements - prioritized when available';
