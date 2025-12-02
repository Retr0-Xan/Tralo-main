-- Create a security definer function to query sales_analytics
-- This bypasses RLS on the view and underlying tables

CREATE OR REPLACE FUNCTION public.get_sales_analytics(
  p_user_id UUID DEFAULT NULL,
  p_business_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_include_reversed BOOLEAN DEFAULT false,
  p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE (
  sale_id UUID,
  business_id UUID,
  user_id UUID,
  product_name TEXT,
  amount NUMERIC,
  quantity INTEGER,
  unit_price NUMERIC,
  payment_method TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE,
  customer_phone TEXT,
  is_reversed BOOLEAN,
  effective_amount NUMERIC,
  effective_quantity INTEGER,
  customer_total_amount NUMERIC,
  customer_total_quantity INTEGER,
  has_partial_payment BOOLEAN,
  is_credit_sale BOOLEAN,
  outstanding_credit_amount NUMERIC,
  customer_payment_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Use provided user_id or default to current authenticated user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Ensure user can only query their own data
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot query other users data';
  END IF;

  RETURN QUERY
  SELECT
    sa.sale_id,
    sa.business_id,
    sa.user_id,
    sa.product_name,
    sa.amount,
    sa.quantity,
    sa.unit_price,
    sa.payment_method,
    sa.purchase_date,
    sa.customer_phone,
    sa.is_reversed,
    sa.effective_amount,
    sa.effective_quantity,
    sa.customer_total_amount,
    sa.customer_total_quantity,
    sa.has_partial_payment,
    sa.is_credit_sale,
    sa.outstanding_credit_amount,
    sa.customer_payment_method
  FROM public.sales_analytics sa
  WHERE sa.user_id = v_user_id
    AND (p_business_id IS NULL OR sa.business_id = p_business_id)
    AND (p_start_date IS NULL OR sa.purchase_date >= p_start_date)
    AND (p_end_date IS NULL OR sa.purchase_date <= p_end_date)
    AND (p_include_reversed OR sa.is_reversed = false)
  ORDER BY sa.purchase_date DESC
  LIMIT COALESCE(p_limit, 10000);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_sales_analytics TO authenticated;

COMMENT ON FUNCTION public.get_sales_analytics IS 'Security definer function to query sales analytics, bypassing RLS on underlying tables';
