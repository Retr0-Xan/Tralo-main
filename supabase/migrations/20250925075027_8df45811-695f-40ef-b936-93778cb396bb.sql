-- Add trust score degradation logic and external receipts table

-- Create external receipts table for tracking outside receipts
CREATE TABLE public.external_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT '¢',
  receipt_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  payment_method TEXT,
  receipt_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own external receipts" 
ON public.external_receipts 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add trust score degradation fields
ALTER TABLE public.user_trust_scores ADD COLUMN IF NOT EXISTS 
  last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS 
  debt_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS 
  inconsistency_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS 
  degradation_factor NUMERIC DEFAULT 0.0;

-- Enhanced trust score calculation with degradation
CREATE OR REPLACE FUNCTION public.calculate_trust_score_with_degradation(
  sales_count INTEGER,
  inventory_count INTEGER, 
  achievements_count INTEGER,
  profile_score INTEGER,
  active_days INTEGER,
  debt_days INTEGER DEFAULT 0,
  inconsistency_score INTEGER DEFAULT 0,
  days_inactive INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
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
  IF debt_days > 7 THEN
    degradation_penalty := degradation_penalty + LEAST((debt_days / 7), 10);
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to detect and update inconsistencies
CREATE OR REPLACE FUNCTION public.detect_business_inconsistencies(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  inconsistency_count INTEGER := 0;
  debt_amount NUMERIC;
  avg_daily_sales NUMERIC;
  stock_turnover NUMERIC;
  recent_sales_count INTEGER;
BEGIN
  -- Check for excessive debt vs sales ratio
  SELECT 
    COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN amount ELSE 0 END), 0),
    COALESCE(AVG(amount), 0),
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
    FROM user_products
    WHERE user_id = user_uuid AND current_stock > 50;
    
    IF stock_turnover > 3 THEN
      inconsistency_count := inconsistency_count + 1;
    END IF;
  END IF;
  
  -- Inconsistency 3: Erratic sales patterns (very high variance)
  -- Add more sophisticated inconsistency detection here as needed
  
  RETURN inconsistency_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enhanced trust score update function with degradation
CREATE OR REPLACE FUNCTION public.update_user_trust_score_enhanced(user_uuid UUID)
RETURNS void AS $$
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
  -- Get existing activity counts (same as before)
  SELECT COUNT(*) INTO sales_count
  FROM customer_purchases cp
  JOIN business_profiles bp ON cp.business_id = bp.id
  WHERE bp.user_id = user_uuid;
  
  SELECT COUNT(*) INTO inventory_count
  FROM inventory_movements
  WHERE user_id = user_uuid;
  
  SELECT COUNT(*) INTO achievements_count
  FROM user_achievements
  WHERE user_id = user_uuid;
  
  -- Calculate profile completeness
  SELECT 
    CASE WHEN business_name IS NOT NULL AND business_name != '' THEN 2 ELSE 0 END +
    CASE WHEN owner_name IS NOT NULL AND owner_name != '' THEN 2 ELSE 0 END +
    CASE WHEN phone_number IS NOT NULL AND phone_number != '' THEN 2 ELSE 0 END +
    CASE WHEN business_address IS NOT NULL AND business_address != '' THEN 2 ELSE 0 END +
    CASE WHEN business_type IS NOT NULL AND business_type != '' THEN 2 ELSE 0 END
  INTO profile_score
  FROM business_profiles
  WHERE user_id = user_uuid
  LIMIT 1;
  
  -- Set defaults
  sales_count := COALESCE(sales_count, 0);
  inventory_count := COALESCE(inventory_count, 0);
  achievements_count := COALESCE(achievements_count, 0);
  profile_score := COALESCE(profile_score, 0);
  
  -- Calculate days active
  SELECT EXTRACT(DAY FROM now() - created_at)::INTEGER
  INTO active_days
  FROM auth.users
  WHERE id = user_uuid;
  
  active_days := COALESCE(LEAST(active_days, 30), 1);
  
  -- Calculate debt duration (days with outstanding credit)
  SELECT COALESCE(EXTRACT(DAY FROM now() - MIN(purchase_date))::INTEGER, 0)
  INTO debt_days
  FROM customer_purchases cp
  JOIN business_profiles bp ON cp.business_id = bp.id
  WHERE bp.user_id = user_uuid 
    AND payment_method = 'credit'
    AND purchase_date >= now() - INTERVAL '60 days';
  
  -- Detect inconsistencies
  inconsistency_score := detect_business_inconsistencies(user_uuid);
  
  -- Calculate days inactive (days since last sale/inventory update)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update triggers to use enhanced function
DROP TRIGGER IF EXISTS trust_score_on_sales ON customer_purchases;
DROP TRIGGER IF EXISTS trust_score_on_inventory ON inventory_movements;
DROP TRIGGER IF EXISTS trust_score_on_achievements ON user_achievements;
DROP TRIGGER IF EXISTS trust_score_on_profile ON business_profiles;

CREATE OR REPLACE FUNCTION public.trigger_trust_score_update_enhanced()
RETURNS trigger AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get user_id based on the table
  IF TG_TABLE_NAME = 'customer_purchases' THEN
    SELECT bp.user_id INTO target_user_id
    FROM business_profiles bp
    WHERE bp.id = COALESCE(NEW.business_id, OLD.business_id);
  ELSIF TG_TABLE_NAME = 'inventory_movements' THEN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'user_achievements' THEN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'business_profiles' THEN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'external_receipts' THEN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  END IF;
  
  -- Update enhanced trust score
  IF target_user_id IS NOT NULL THEN
    PERFORM update_user_trust_score_enhanced(target_user_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create enhanced triggers
CREATE TRIGGER trust_score_enhanced_on_sales
  AFTER INSERT OR UPDATE OR DELETE ON customer_purchases
  FOR EACH ROW EXECUTE FUNCTION trigger_trust_score_update_enhanced();

CREATE TRIGGER trust_score_enhanced_on_inventory
  AFTER INSERT OR UPDATE OR DELETE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION trigger_trust_score_update_enhanced();

CREATE TRIGGER trust_score_enhanced_on_achievements
  AFTER INSERT OR UPDATE OR DELETE ON user_achievements
  FOR EACH ROW EXECUTE FUNCTION trigger_trust_score_update_enhanced();

CREATE TRIGGER trust_score_enhanced_on_profile
  AFTER INSERT OR UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_trust_score_update_enhanced();

CREATE TRIGGER trust_score_on_external_receipts
  AFTER INSERT OR UPDATE OR DELETE ON external_receipts
  FOR EACH ROW EXECUTE FUNCTION trigger_trust_score_update_enhanced();

-- Add updated_at trigger for external_receipts
CREATE TRIGGER update_external_receipts_updated_at
BEFORE UPDATE ON public.external_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();