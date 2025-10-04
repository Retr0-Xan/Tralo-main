-- Create or update client value ratio calculation function
CREATE OR REPLACE FUNCTION public.update_client_value_ratio(user_uuid UUID, calc_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_sales_value NUMERIC := 0;
  unique_clients INTEGER := 0;
  ratio_value NUMERIC := 0;
BEGIN
  -- Get total sales value for the date (from customer_purchases via business_profiles)
  SELECT COALESCE(SUM(cp.amount), 0)
  INTO total_sales_value
  FROM customer_purchases cp
  JOIN business_profiles bp ON cp.business_id = bp.id
  WHERE bp.user_id = user_uuid 
    AND DATE(cp.purchase_date) = calc_date;

  -- Count unique clients for the date (including walk-in customers as separate clients)
  -- Each unique customer_phone counts as one client
  SELECT COUNT(DISTINCT cp.customer_phone)
  INTO unique_clients
  FROM customer_purchases cp
  JOIN business_profiles bp ON cp.business_id = bp.id
  WHERE bp.user_id = user_uuid 
    AND DATE(cp.purchase_date) = calc_date;

  -- Calculate ratio (sales value per client)
  IF unique_clients > 0 THEN
    ratio_value := total_sales_value / unique_clients;
  ELSE
    ratio_value := 0;
  END IF;

  -- Insert or update the client value ratio
  INSERT INTO client_value_ratios (
    user_id, 
    date, 
    total_sales_value, 
    client_count, 
    ratio
  ) VALUES (
    user_uuid,
    calc_date,
    total_sales_value,
    unique_clients,
    ratio_value
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_sales_value = EXCLUDED.total_sales_value,
    client_count = EXCLUDED.client_count,
    ratio = EXCLUDED.ratio,
    updated_at = now();
END;
$$;

-- Create trigger function to update client value ratio when sales are made
CREATE OR REPLACE FUNCTION public.trigger_client_value_ratio_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_user_id UUID;
  sale_date DATE;
BEGIN
  -- Get user_id from business_profiles
  SELECT bp.user_id, DATE(COALESCE(NEW.purchase_date, OLD.purchase_date))
  INTO target_user_id, sale_date
  FROM business_profiles bp
  WHERE bp.id = COALESCE(NEW.business_id, OLD.business_id);
  
  -- Update client value ratio for the sale date
  IF target_user_id IS NOT NULL THEN
    PERFORM update_client_value_ratio(target_user_id, sale_date);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on customer_purchases to update client value ratio
DROP TRIGGER IF EXISTS update_client_value_ratio_trigger ON customer_purchases;
CREATE TRIGGER update_client_value_ratio_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customer_purchases
  FOR EACH ROW
  EXECUTE FUNCTION trigger_client_value_ratio_update();