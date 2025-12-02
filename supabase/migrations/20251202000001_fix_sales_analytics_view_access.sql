-- Comprehensive fix for sales_analytics view access
-- Ensures all underlying tables have proper RLS policies

-- Fix customer_purchases policy
DROP POLICY IF EXISTS "Users can view their own sales analytics" ON public.customer_purchases;
DROP POLICY IF EXISTS "Users can view purchases through their business" ON public.customer_purchases;

CREATE POLICY "Users can view purchases through their business"
ON public.customer_purchases
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
);

-- Fix business_profiles policy
DROP POLICY IF EXISTS "Users can read own business profile" ON public.business_profiles;

CREATE POLICY "Users can read own business profile"
ON public.business_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Ensure sale_reversals has proper policy
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can view their own reversals" ON public.sale_reversals;
  
  -- Create the policy
  CREATE POLICY "Users can view their own reversals"
  ON public.sale_reversals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END$$;

-- Ensure customer_sales has proper policy
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can view their own customer sales" ON public.customer_sales;
  
  -- Create the policy
  CREATE POLICY "Users can view their own customer sales"
  ON public.customer_sales
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  WHEN undefined_column THEN
    -- user_id column doesn't exist, try sale_id based access
    CREATE POLICY "Users can view their own customer sales"
    ON public.customer_sales
    FOR SELECT
    TO authenticated
    USING (
      sale_id IN (
        SELECT cp.id 
        FROM public.customer_purchases cp
        JOIN public.business_profiles bp ON bp.id = cp.business_id
        WHERE bp.user_id = auth.uid()
      )
    );
END$$;

-- Grant SELECT on the view
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.sales_analytics TO authenticated;
