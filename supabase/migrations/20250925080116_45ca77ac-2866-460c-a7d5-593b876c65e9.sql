-- Create proforma invoices table
CREATE TABLE public.proforma_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  tax_rate NUMERIC DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  tax_amount NUMERIC DEFAULT 0 CHECK (tax_amount >= 0),
  discount_rate NUMERIC DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100),
  discount_amount NUMERIC DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  currency TEXT DEFAULT '¢',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired')),
  terms_and_conditions TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, invoice_number)
);

-- Create proforma invoice items table
CREATE TABLE public.proforma_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.proforma_invoices(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proforma_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for proforma invoices
CREATE POLICY "Users can manage their own proforma invoices" 
ON public.proforma_invoices 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for proforma invoice items
CREATE POLICY "Users can manage their own proforma invoice items" 
ON public.proforma_invoice_items 
FOR ALL 
USING (
  auth.uid() = (
    SELECT user_id 
    FROM public.proforma_invoices 
    WHERE id = invoice_id
  )
)
WITH CHECK (
  auth.uid() = (
    SELECT user_id 
    FROM public.proforma_invoices 
    WHERE id = invoice_id
  )
);

-- Add updated_at trigger for proforma invoices
CREATE TRIGGER update_proforma_invoices_updated_at
BEFORE UPDATE ON public.proforma_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION public.generate_proforma_invoice_number(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  -- Get the next invoice number for this user
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'PI-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.proforma_invoices
  WHERE user_id = user_uuid AND invoice_number ~ '^PI-\d+$';
  
  -- Format as PI-001, PI-002, etc.
  invoice_number := 'PI-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;