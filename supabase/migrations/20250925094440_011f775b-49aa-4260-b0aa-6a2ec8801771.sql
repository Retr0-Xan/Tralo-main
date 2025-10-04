-- Create expenses table for tracking business expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expense_number TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  payment_method TEXT,
  receipt_image_url TEXT,
  notes TEXT,
  currency TEXT DEFAULT '¢',
  external_receipt_id UUID, -- Reference to original receipt if converted from one
  status TEXT DEFAULT 'recorded', -- recorded, pending, reimbursed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses
CREATE POLICY "Users can manage their own expenses" 
ON public.expenses 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add trigger for timestamp updates
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate expense numbers
CREATE OR REPLACE FUNCTION public.generate_expense_number(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  expense_number TEXT;
BEGIN
  -- Get the next expense number for this user
  SELECT COALESCE(MAX(CAST(SUBSTRING(expense_number FROM 'EXP-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.expenses
  WHERE user_id = user_uuid AND expense_number ~ '^EXP-\d+$';
  
  -- Format as EXP-001, EXP-002, etc.
  expense_number := 'EXP-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN expense_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add column to external_receipts to track if it's been converted to expense
ALTER TABLE public.external_receipts ADD COLUMN converted_to_expense BOOLEAN DEFAULT false;

-- Update trust score trigger to include expenses
CREATE OR REPLACE FUNCTION public.trigger_trust_score_update_enhanced()
RETURNS TRIGGER AS $$
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
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  END IF;
  
  -- Update enhanced trust score
  IF target_user_id IS NOT NULL THEN
    PERFORM update_user_trust_score_enhanced(target_user_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;