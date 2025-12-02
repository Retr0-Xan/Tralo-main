-- Add RLS policies for sales_analytics view

-- Enable RLS on sales_analytics view (if not already enabled)
-- Note: Views inherit RLS from underlying tables, but we need to ensure access

-- Create a policy to allow users to see their own sales analytics
-- This works because the view already filters by user_id through business_profiles join
CREATE POLICY "Users can view their own sales analytics"
ON public.customer_purchases
FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
);

-- Make sure business_profiles RLS allows reading own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'business_profiles' 
    AND policyname = 'Users can read own business profile'
  ) THEN
    CREATE POLICY "Users can read own business profile"
    ON public.business_profiles
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END$$;

-- Ensure the sales_analytics view is accessible
-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.sales_analytics TO authenticated;
