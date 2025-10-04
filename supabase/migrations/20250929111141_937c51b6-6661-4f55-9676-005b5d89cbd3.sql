-- Update QR code data generation function to point to new customer purchase page
CREATE OR REPLACE FUNCTION public.generate_business_qr_code(business_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Generate QR code data that points to the customer purchase page
  RETURN 'https://dsnzmsiydwspatbflhrt.lovableproject.com/customer-purchase?business_id=' || business_id::text;
END;
$function$;

-- Update existing business profiles to use the new QR code URL
UPDATE public.business_profiles 
SET qr_code_data = generate_business_qr_code(id)
WHERE qr_code_data IS NULL OR qr_code_data LIKE '%purchase-multiple%';