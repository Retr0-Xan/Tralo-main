-- Add payment tracking columns to customer_purchases table for credit and partial payment management

ALTER TABLE public.customer_purchases 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid_in_full',
ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;

-- Add check constraint to ensure amount_paid doesn't exceed amount
ALTER TABLE public.customer_purchases
ADD CONSTRAINT check_amount_paid_valid 
CHECK (amount_paid >= 0 AND amount_paid <= amount);

-- Add check constraint for valid payment statuses
ALTER TABLE public.customer_purchases
ADD CONSTRAINT check_payment_status_valid 
CHECK (payment_status IN ('paid_in_full', 'partial_payment', 'credit', 'overdue'));

-- Add index for querying credit and partial payment sales
CREATE INDEX IF NOT EXISTS idx_customer_purchases_payment_status 
ON public.customer_purchases(payment_status, business_id);

-- Add comments to document the columns
COMMENT ON COLUMN public.customer_purchases.amount_paid IS 'Amount already paid by customer (for credit/partial payments)';
COMMENT ON COLUMN public.customer_purchases.payment_status IS 'Payment status: paid_in_full, partial_payment, credit, or overdue';
COMMENT ON COLUMN public.customer_purchases.payment_history IS 'JSON array of payment installments with amount, date, and payment_method';

-- Create a function to calculate remaining balance
CREATE OR REPLACE FUNCTION get_remaining_balance(purchase_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total DECIMAL(10,2);
  paid DECIMAL(10,2);
BEGIN
  SELECT amount, amount_paid 
  INTO total, paid
  FROM customer_purchases
  WHERE id = purchase_id;
  
  RETURN COALESCE(total, 0) - COALESCE(paid, 0);
END;
$$;

-- Update existing records to set proper defaults
UPDATE public.customer_purchases
SET 
  amount_paid = amount,
  payment_status = 'paid_in_full'
WHERE payment_method != 'credit' AND amount_paid IS NULL;

UPDATE public.customer_purchases
SET 
  amount_paid = 0,
  payment_status = 'credit'
WHERE payment_method = 'credit' AND amount_paid IS NULL;

-- Add a trigger to automatically update payment_status based on amount_paid
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.amount_paid >= NEW.amount THEN
    NEW.payment_status := 'paid_in_full';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.payment_status := 'partial_payment';
  ELSE
    NEW.payment_status := 'credit';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_payment_status
BEFORE INSERT OR UPDATE OF amount_paid
ON public.customer_purchases
FOR EACH ROW
EXECUTE FUNCTION update_payment_status();
