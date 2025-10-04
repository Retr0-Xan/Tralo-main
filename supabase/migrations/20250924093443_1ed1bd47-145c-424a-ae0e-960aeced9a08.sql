-- Create customer purchases table to track QR code purchases

CREATE TABLE public.customer_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  customer_phone TEXT NOT NULL,
  product_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customer_purchases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer purchases
-- Business owners can view their own customer purchases
CREATE POLICY "Business owners can view their purchases" 
ON public.customer_purchases 
FOR SELECT 
USING (
  business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
);

-- Anyone can insert purchases (customers don't need accounts)
CREATE POLICY "Anyone can record purchases" 
ON public.customer_purchases 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_customer_purchases_business_id ON public.customer_purchases(business_id);
CREATE INDEX idx_customer_purchases_date ON public.customer_purchases(purchase_date);
CREATE INDEX idx_customer_purchases_phone ON public.customer_purchases(customer_phone);