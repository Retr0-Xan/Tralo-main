-- Create user trust scores table
CREATE TABLE public.user_trust_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trust_score INTEGER NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 99),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Activity counters for trust score calculation
  total_sales INTEGER DEFAULT 0,
  total_inventory_updates INTEGER DEFAULT 0,
  total_achievements INTEGER DEFAULT 0,
  profile_completeness INTEGER DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_trust_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own trust score" 
ON public.user_trust_scores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage trust scores" 
ON public.user_trust_scores 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Function to calculate trust score based on activities
CREATE OR REPLACE FUNCTION public.calculate_trust_score(
  sales_count INTEGER,
  inventory_count INTEGER, 
  achievements_count INTEGER,
  profile_score INTEGER,
  active_days INTEGER
) RETURNS INTEGER AS $$
BEGIN
  -- Base calculation with weights and caps to ensure max 99
  RETURN LEAST(99, GREATEST(0,
    (LEAST(sales_count * 2, 25)) +           -- Max 25 from sales
    (LEAST(inventory_count * 1, 20)) +       -- Max 20 from inventory
    (LEAST(achievements_count * 3, 15)) +    -- Max 15 from achievements  
    (LEAST(profile_score, 10)) +             -- Max 10 from profile
    (LEAST(active_days, 24))                 -- Max 24 from daily usage
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update trust score for a user
CREATE OR REPLACE FUNCTION public.update_user_trust_score(user_uuid UUID)
RETURNS void AS $$
DECLARE
  sales_count INTEGER;
  inventory_count INTEGER;
  achievements_count INTEGER;
  profile_score INTEGER;
  active_days INTEGER;
  new_score INTEGER;
BEGIN
  -- Count user activities
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
  
  -- Calculate profile completeness (out of 10)
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
  
  -- Set defaults if null
  sales_count := COALESCE(sales_count, 0);
  inventory_count := COALESCE(inventory_count, 0);
  achievements_count := COALESCE(achievements_count, 0);
  profile_score := COALESCE(profile_score, 0);
  
  -- Calculate days active (simplified - just days since registration)
  SELECT EXTRACT(DAY FROM now() - created_at)::INTEGER
  INTO active_days
  FROM auth.users
  WHERE id = user_uuid;
  
  active_days := COALESCE(LEAST(active_days, 30), 1); -- Cap at 30 days for calculation
  
  -- Calculate new trust score
  new_score := calculate_trust_score(sales_count, inventory_count, achievements_count, profile_score, active_days);
  
  -- Insert or update trust score
  INSERT INTO user_trust_scores (
    user_id, trust_score, total_sales, total_inventory_updates, 
    total_achievements, profile_completeness, days_active
  )
  VALUES (
    user_uuid, new_score, sales_count, inventory_count, 
    achievements_count, profile_score, active_days
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    trust_score = new_score,
    total_sales = sales_count,
    total_inventory_updates = inventory_count,
    total_achievements = achievements_count,
    profile_completeness = profile_score,
    days_active = active_days,
    last_updated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update trust score on sales
CREATE OR REPLACE FUNCTION public.trigger_trust_score_update()
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
  END IF;
  
  -- Update trust score if we found a user
  IF target_user_id IS NOT NULL THEN
    PERFORM update_user_trust_score(target_user_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic trust score updates
CREATE TRIGGER trust_score_on_sales
  AFTER INSERT OR UPDATE OR DELETE ON customer_purchases
  FOR EACH ROW EXECUTE FUNCTION trigger_trust_score_update();

CREATE TRIGGER trust_score_on_inventory
  AFTER INSERT OR UPDATE OR DELETE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION trigger_trust_score_update();

CREATE TRIGGER trust_score_on_achievements
  AFTER INSERT OR UPDATE OR DELETE ON user_achievements
  FOR EACH ROW EXECUTE FUNCTION trigger_trust_score_update();

CREATE TRIGGER trust_score_on_profile
  AFTER INSERT OR UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_trust_score_update();