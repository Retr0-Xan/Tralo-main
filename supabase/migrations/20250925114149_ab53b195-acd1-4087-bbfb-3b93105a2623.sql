-- Fix ambiguous column reference in trust score functions
CREATE OR REPLACE FUNCTION public.detect_business_inconsistencies(user_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inconsistency_count INTEGER := 0;
  debt_amount NUMERIC;
  avg_daily_sales NUMERIC;
  stock_turnover NUMERIC;
  recent_sales_count INTEGER;
BEGIN
  -- Check for excessive debt vs sales ratio
  SELECT 
    COALESCE(SUM(CASE WHEN cp.payment_method = 'credit' THEN cp.amount ELSE 0 END), 0),
    COALESCE(AVG(cp.amount), 0),
    COUNT(*)
  INTO debt_amount, avg_daily_sales, recent_sales_count
  FROM customer_purchases cp
  JOIN business_profiles bp ON cp.business_id = bp.id
  WHERE bp.user_id = user_uuid 
    AND cp.purchase_date >= now() - INTERVAL '30 days';
  
  -- Inconsistency 1: Debt > 50% of monthly sales
  IF debt_amount > (avg_daily_sales * 30 * 0.5) AND debt_amount > 100 THEN
    inconsistency_count := inconsistency_count + 1;
  END IF;
  
  -- Inconsistency 2: No sales but claiming high inventory value
  SELECT COUNT(*) INTO recent_sales_count
  FROM customer_purchases cp
  JOIN business_profiles bp ON cp.business_id = bp.id
  WHERE bp.user_id = user_uuid 
    AND cp.purchase_date >= now() - INTERVAL '14 days';
    
  IF recent_sales_count = 0 THEN
    SELECT COUNT(*) INTO stock_turnover
    FROM user_products up
    WHERE up.user_id = user_uuid AND up.current_stock > 50;
    
    IF stock_turnover > 3 THEN
      inconsistency_count := inconsistency_count + 1;
    END IF;
  END IF;
  
  RETURN inconsistency_count;
END;
$function$;

-- Fix the main trust score function with proper table aliases
CREATE OR REPLACE FUNCTION public.update_user_trust_score_enhanced(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sales_count INTEGER;
  inventory_count INTEGER;
  achievements_count INTEGER;
  profile_score INTEGER;
  active_days INTEGER;
  debt_days INTEGER;
  inconsistency_score INTEGER;
  days_inactive INTEGER;
  new_score INTEGER;
  last_activity DATE;
BEGIN
  -- Get existing activity counts
  SELECT COUNT(*) INTO sales_count
  FROM customer_purchases cp
  JOIN business_profiles bp ON cp.business_id = bp.id
  WHERE bp.user_id = user_uuid;
  
  SELECT COUNT(*) INTO inventory_count
  FROM inventory_movements im
  WHERE im.user_id = user_uuid;
  
  SELECT COUNT(*) INTO achievements_count
  FROM user_achievements ua
  WHERE ua.user_id = user_uuid;
  
  -- Calculate profile completeness
  SELECT 
    CASE WHEN bp.business_name IS NOT NULL AND bp.business_name != '' THEN 2 ELSE 0 END +
    CASE WHEN bp.owner_name IS NOT NULL AND bp.owner_name != '' THEN 2 ELSE 0 END +
    CASE WHEN bp.phone_number IS NOT NULL AND bp.phone_number != '' THEN 2 ELSE 0 END +
    CASE WHEN bp.business_address IS NOT NULL AND bp.business_address != '' THEN 2 ELSE 0 END +
    CASE WHEN bp.business_type IS NOT NULL AND bp.business_type != '' THEN 2 ELSE 0 END
  INTO profile_score
  FROM business_profiles bp
  WHERE bp.user_id = user_uuid
  LIMIT 1;
  
  -- Set defaults
  sales_count := COALESCE(sales_count, 0);
  inventory_count := COALESCE(inventory_count, 0);
  achievements_count := COALESCE(achievements_count, 0);
  profile_score := COALESCE(profile_score, 0);
  
  -- Calculate days active
  SELECT EXTRACT(DAY FROM now() - au.created_at)::INTEGER
  INTO active_days
  FROM auth.users au
  WHERE au.id = user_uuid;
  
  active_days := COALESCE(LEAST(active_days, 30), 1);
  
  -- Calculate debt duration (days with outstanding credit) - fixed ambiguous reference
  SELECT COALESCE(EXTRACT(DAY FROM now() - MIN(cp.purchase_date))::INTEGER, 0)
  INTO debt_days
  FROM customer_purchases cp
  JOIN business_profiles bp ON cp.business_id = bp.id
  WHERE bp.user_id = user_uuid 
    AND cp.payment_method = 'credit'
    AND cp.purchase_date >= now() - INTERVAL '60 days';
  
  -- Detect inconsistencies
  inconsistency_score := detect_business_inconsistencies(user_uuid);
  
  -- Calculate days inactive (days since last sale/inventory update) - fixed ambiguous reference
  SELECT GREATEST(
    COALESCE(EXTRACT(DAY FROM now() - MAX(cp.purchase_date))::INTEGER, 30),
    COALESCE(EXTRACT(DAY FROM now() - MAX(im.created_at))::INTEGER, 30)
  )
  INTO days_inactive
  FROM customer_purchases cp
  JOIN business_profiles bp ON cp.business_id = bp.id
  FULL OUTER JOIN inventory_movements im ON im.user_id = bp.user_id
  WHERE bp.user_id = user_uuid;
  
  days_inactive := COALESCE(days_inactive, 30);
  
  -- Calculate new trust score with degradation
  new_score := calculate_trust_score_with_degradation(
    sales_count, inventory_count, achievements_count, profile_score, 
    active_days, debt_days, inconsistency_score, days_inactive
  );
  
  -- Insert or update trust score with degradation metrics
  INSERT INTO user_trust_scores (
    user_id, trust_score, total_sales, total_inventory_updates, 
    total_achievements, profile_completeness, days_active,
    debt_days, inconsistency_score, last_activity_date,
    degradation_factor
  )
  VALUES (
    user_uuid, new_score, sales_count, inventory_count, 
    achievements_count, profile_score, active_days,
    debt_days, inconsistency_score, now(),
    (debt_days + inconsistency_score + (CASE WHEN days_inactive > 7 THEN days_inactive / 7 ELSE 0 END))::NUMERIC
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    trust_score = new_score,
    total_sales = sales_count,
    total_inventory_updates = inventory_count,
    total_achievements = achievements_count,
    profile_completeness = profile_score,
    days_active = active_days,
    debt_days = debt_days,
    inconsistency_score = inconsistency_score,
    last_activity_date = now(),
    degradation_factor = (debt_days + inconsistency_score + (CASE WHEN days_inactive > 7 THEN days_inactive / 7 ELSE 0 END))::NUMERIC,
    last_updated = now();
END;
$function$;