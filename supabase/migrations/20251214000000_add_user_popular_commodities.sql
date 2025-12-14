-- Add table to store user's personalized popular commodities list
-- This list updates dynamically as users add custom products

CREATE TABLE public.user_popular_commodities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  use_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_name)
);

-- Create index for faster lookups
CREATE INDEX idx_user_popular_commodities_user_id ON public.user_popular_commodities(user_id);
CREATE INDEX idx_user_popular_commodities_last_used ON public.user_popular_commodities(user_id, last_used_at DESC);

-- Enable RLS
ALTER TABLE public.user_popular_commodities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own popular commodities"
ON public.user_popular_commodities
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own popular commodities"
ON public.user_popular_commodities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own popular commodities"
ON public.user_popular_commodities
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own popular commodities"
ON public.user_popular_commodities
FOR DELETE
USING (auth.uid() = user_id);

-- Function to update or insert popular commodity
CREATE OR REPLACE FUNCTION public.upsert_popular_commodity(
  p_user_id UUID,
  p_product_name TEXT
)
RETURNS void AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if product already exists
  SELECT COUNT(*) INTO v_count
  FROM public.user_popular_commodities
  WHERE user_id = p_user_id 
    AND LOWER(product_name) = LOWER(p_product_name);

  IF v_count > 0 THEN
    -- Update existing entry
    UPDATE public.user_popular_commodities
    SET 
      last_used_at = now(),
      use_count = use_count + 1
    WHERE user_id = p_user_id 
      AND LOWER(product_name) = LOWER(p_product_name);
  ELSE
    -- Insert new entry
    INSERT INTO public.user_popular_commodities (user_id, product_name)
    VALUES (p_user_id, p_product_name);

    -- Check if we have more than 10 items
    SELECT COUNT(*) INTO v_count
    FROM public.user_popular_commodities
    WHERE user_id = p_user_id;

    -- Remove oldest item if we have more than 10
    IF v_count > 10 THEN
      DELETE FROM public.user_popular_commodities
      WHERE id IN (
        SELECT id
        FROM public.user_popular_commodities
        WHERE user_id = p_user_id
        ORDER BY last_used_at ASC
        LIMIT 1
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upsert_popular_commodity(UUID, TEXT) TO authenticated;

-- Seed with default popular commodities for existing users (optional)
-- This will be populated as users use the system

COMMENT ON TABLE public.user_popular_commodities IS 'Stores user-specific popular commodities list, dynamically updated based on usage';
COMMENT ON FUNCTION public.upsert_popular_commodity IS 'Updates or inserts a popular commodity, maintaining a maximum of 10 items per user';
