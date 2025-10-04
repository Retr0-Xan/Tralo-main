-- Create client_value_ratios table to track fiscal turnover ratios
CREATE TABLE IF NOT EXISTS public.client_value_ratios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  total_sales_value NUMERIC NOT NULL DEFAULT 0,
  client_count INTEGER NOT NULL DEFAULT 0,
  ratio NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.client_value_ratios ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own client value ratios" 
ON public.client_value_ratios 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_client_value_ratios_updated_at
BEFORE UPDATE ON public.client_value_ratios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();