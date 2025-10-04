-- Fix the generate_proforma_invoice_number function to resolve ambiguous column reference
DROP FUNCTION IF EXISTS public.generate_proforma_invoice_number(uuid);

CREATE OR REPLACE FUNCTION public.generate_proforma_invoice_number(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  -- Get the next invoice number for this user using fully qualified table reference
  SELECT COALESCE(MAX(CAST(SUBSTRING(pi.invoice_number FROM 'PI-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.proforma_invoices pi
  WHERE pi.user_id = user_uuid AND pi.invoice_number ~ '^PI-\d+$';
  
  -- Format as PI-001, PI-002, etc.
  invoice_number := 'PI-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN invoice_number;
END;
$$;