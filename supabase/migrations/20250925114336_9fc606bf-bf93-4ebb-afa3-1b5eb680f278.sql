-- Fix all remaining ambiguous column references
DROP FUNCTION IF EXISTS public.calculate_trust_score_with_degradation(integer, integer, integer, integer, integer, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.calculate_trust_score_with_degradation(
  sales_count integer, 
  inventory_count integer, 
  achievements_count integer, 
  profile_score integer, 
  active_days integer, 
  debt_days_param integer DEFAULT 0, 
  inconsistency_score integer DEFAULT 0, 
  days_inactive integer DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_score INTEGER;
  degradation_penalty INTEGER;
  final_score INTEGER;
BEGIN
  -- Base calculation (same as before)
  base_score := (LEAST(sales_count * 2, 25)) +           -- Max 25 from sales
                (LEAST(inventory_count * 1, 20)) +       -- Max 20 from inventory
                (LEAST(achievements_count * 3, 15)) +    -- Max 15 from achievements  
                (LEAST(profile_score, 10)) +             -- Max 10 from profile
                (LEAST(active_days, 24));                -- Max 24 from daily usage
  
  -- Calculate degradation penalties
  degradation_penalty := 0;
  
  -- Debt penalty: -1 point per week in debt (max -10)
  IF debt_days_param > 7 THEN
    degradation_penalty := degradation_penalty + LEAST((debt_days_param / 7), 10);
  END IF;
  
  -- Inconsistency penalty: -1 point per inconsistency issue (max -15)
  degradation_penalty := degradation_penalty + LEAST(inconsistency_score, 15);
  
  -- Inactivity penalty: -1 point per week inactive (max -10)
  IF days_inactive > 7 THEN
    degradation_penalty := degradation_penalty + LEAST((days_inactive / 7), 10);
  END IF;
  
  -- Apply degradation
  final_score := GREATEST(0, base_score - degradation_penalty);
  
  -- Cap at 99
  RETURN LEAST(final_score, 99);
END;
$function$;

-- Now recreate the enhanced trust score function with explicit parameter names
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
  debt_days_var INTEGER;
  inconsistency_score INTEGER;
  days_inactive INTEGER;
  new_score INTEGER;
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
  
  -- Calculate debt duration using a different variable name
  SELECT COALESCE(EXTRACT(DAY FROM now() - MIN(cp.purchase_date))::INTEGER, 0)
  INTO debt_days_var
  FROM customer_purchases cp
  JOIN business_profiles bp ON cp.business_id = bp.id
  WHERE bp.user_id = user_uuid 
    AND cp.payment_method = 'credit'
    AND cp.purchase_date >= now() - INTERVAL '60 days';
  
  -- Detect inconsistencies
  inconsistency_score := detect_business_inconsistencies(user_uuid);
  
  -- Calculate days inactive
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
  
  -- Calculate new trust score with explicit parameter names
  new_score := calculate_trust_score_with_degradation(
    sales_count, 
    inventory_count, 
    achievements_count, 
    profile_score, 
    active_days, 
    debt_days_var, 
    inconsistency_score, 
    days_inactive
  );
  
  -- Insert or update trust score
  INSERT INTO user_trust_scores (
    user_id, trust_score, total_sales, total_inventory_updates, 
    total_achievements, profile_completeness, days_active,
    debt_days, inconsistency_score, last_activity_date,
    degradation_factor
  )
  VALUES (
    user_uuid, new_score, sales_count, inventory_count, 
    achievements_count, profile_score, active_days,
    debt_days_var, inconsistency_score, now(),
    (debt_days_var + inconsistency_score + (CASE WHEN days_inactive > 7 THEN days_inactive / 7 ELSE 0 END))::NUMERIC
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    trust_score = new_score,
    total_sales = sales_count,
    total_inventory_updates = inventory_count,
    total_achievements = achievements_count,
    profile_completeness = profile_score,
    days_active = active_days,
    debt_days = debt_days_var,
    inconsistency_score = inconsistency_score,
    last_activity_date = now(),
    degradation_factor = (debt_days_var + inconsistency_score + (CASE WHEN days_inactive > 7 THEN days_inactive / 7 ELSE 0 END))::NUMERIC,
    last_updated = now();
END;
$function$;