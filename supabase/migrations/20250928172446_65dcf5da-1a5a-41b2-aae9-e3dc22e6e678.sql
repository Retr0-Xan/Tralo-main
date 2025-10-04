-- Create customers table for customer tracking
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT,
  phone_number TEXT,
  email TEXT,
  address TEXT,
  total_purchases NUMERIC DEFAULT 0,
  total_sales_count INTEGER DEFAULT 0,
  first_purchase_date TIMESTAMP WITH TIME ZONE,
  last_purchase_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone_number),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own customers" 
ON public.customers 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create customer_sales table to track individual sales per customer
CREATE TABLE public.customer_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sale_id UUID,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS  
ALTER TABLE public.customer_sales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own customer sales" 
ON public.customer_sales 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create sale_reversals table for tracking reversed sales
CREATE TABLE public.sale_reversals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_sale_id UUID NOT NULL,
  reversal_reason TEXT,
  reversal_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reversal_receipt_number TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.sale_reversals ENABLE ROW LEVEL SECURITY;

-- Create policies  
CREATE POLICY "Users can manage their own sale reversals"
ON public.sale_reversals
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_phone ON public.customers(user_id, phone_number);
CREATE INDEX idx_customers_name ON public.customers(user_id, name);
CREATE INDEX idx_customer_sales_customer_id ON public.customer_sales(customer_id);
CREATE INDEX idx_customer_sales_user_id ON public.customer_sales(user_id);
CREATE INDEX idx_sale_reversals_user_id ON public.sale_reversals(user_id);

-- Create trigger to update customer totals
CREATE OR REPLACE FUNCTION update_customer_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.customers 
    SET 
      total_purchases = total_purchases + NEW.total_amount,
      total_sales_count = total_sales_count + 1,
      last_purchase_date = NEW.sale_date,
      first_purchase_date = COALESCE(first_purchase_date, NEW.sale_date),
      updated_at = now()
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.customers 
    SET 
      total_purchases = GREATEST(0, total_purchases - OLD.total_amount),
      total_sales_count = GREATEST(0, total_sales_count - 1),
      updated_at = now()
    WHERE id = OLD.customer_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_totals
  AFTER INSERT OR DELETE ON public.customer_sales
  FOR EACH ROW EXECUTE FUNCTION update_customer_totals();

-- Create function to generate reversal receipt numbers
CREATE OR REPLACE FUNCTION generate_reversal_receipt_number(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  receipt_number TEXT;
BEGIN
  -- Get the next reversal receipt number for this user
  SELECT COALESCE(MAX(CAST(SUBSTRING(reversal_receipt_number FROM 'REV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.sale_reversals
  WHERE user_id = user_uuid AND reversal_receipt_number ~ '^REV-\d+$';
  
  -- Format as REV-001, REV-002, etc.
  receipt_number := 'REV-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN receipt_number;
END;
$$ LANGUAGE plpgsql;