-- Create achievements system tables

-- Achievement definitions table
CREATE TABLE public.achievement_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- e.g., 'hot_seller_fish', 'profit_streak_7d'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- emoji or icon code
  category TEXT NOT NULL, -- 'sales', 'profit', 'inventory', 'growth'
  criteria JSONB NOT NULL, -- criteria for unlocking
  color_class TEXT NOT NULL, -- CSS color classes for styling
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User achievements table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_code TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress_data JSONB, -- additional data like streak count, values, etc.
  UNIQUE(user_id, achievement_code)
);

-- Enable RLS
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Achievement definitions are viewable by everyone" 
ON public.achievement_definitions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create user achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_code ON public.user_achievements(achievement_code);

-- Insert default achievement definitions
INSERT INTO public.achievement_definitions (code, title, description, icon, category, criteria, color_class) VALUES
('hot_seller', 'Hot Seller', 'Product sold out 3 times this month', '🔥', 'sales', '{"type": "product_sellouts", "count": 3, "period": "month"}', 'yellow'),
('growth_streak_7d', 'Growth Streak', '7 days of increasing inventory value', '📈', 'growth', '{"type": "value_increase", "days": 7}', 'green'),
('stock_master', 'Stock Master', 'No stockouts for 2 weeks', '💪', 'inventory', '{"type": "no_stockouts", "days": 14}', 'blue'),
('profit_pro_500', 'Profit Pro', '¢500+ profit this week', '🎯', 'profit', '{"type": "weekly_profit", "amount": 500}', 'purple'),
('first_sale', 'First Sale', 'Made your first sale', '🎉', 'sales', '{"type": "first_sale"}', 'green'),
('sales_champion', 'Sales Champion', 'Made 50+ sales this month', '🏆', 'sales', '{"type": "monthly_sales", "count": 50}', 'gold'),
('inventory_master', 'Inventory Master', 'Maintained 10+ different products', '📦', 'inventory', '{"type": "product_variety", "count": 10}', 'blue'),
('customer_favorite', 'Customer Favorite', 'Served 100+ customers', '❤️', 'sales', '{"type": "customer_count", "count": 100}', 'pink'),
('profit_milestone_1k', 'Profit Milestone', '¢1000+ total profit', '💰', 'profit', '{"type": "total_profit", "amount": 1000}', 'gold'),
('consistency_king', 'Consistency King', 'Sales for 30 consecutive days', '👑', 'sales', '{"type": "consecutive_sales_days", "days": 30}', 'royal');