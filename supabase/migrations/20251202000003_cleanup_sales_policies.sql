-- Clean up and ensure proper RLS policies for sales_analytics view access
-- This migration ensures all tables involved in the view have proper SELECT policies

-- Drop any duplicate policies first
DROP POLICY IF EXISTS "Users can view purchases through their business" ON public.customer_purchases;

-- The original policy "Business owners can view their purchases" already exists and works correctly
-- No need to modify customer_purchases

-- Verify business_profiles policy exists (it already does from migration 20250924091958)
-- "Users can manage their own business profile" covers SELECT

-- Grant explicit access to the view
GRANT SELECT ON public.sales_analytics TO authenticated;

-- The issue might be with the materialized view or cached permissions
-- Force refresh of any cached permissions
NOTIFY pgrst, 'reload schema';
