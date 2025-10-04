-- Add QR code field to business profiles
ALTER TABLE public.business_profiles 
ADD COLUMN qr_code_data TEXT,
ADD COLUMN qr_code_url TEXT;

-- Create a function to generate unique QR code data for each business
CREATE OR REPLACE FUNCTION generate_business_qr_code(business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate QR code data that includes business ID for customer purchases
  RETURN 'https://dsnzmsiydwspatbflhrt.lovableproject.com/purchase-multiple?business_id=' || business_id::text;
END;
$$;

-- Update existing business profiles with QR code data
UPDATE public.business_profiles 
SET qr_code_data = generate_business_qr_code(id)
WHERE qr_code_data IS NULL;

-- Create trigger to automatically generate QR code for new businesses
CREATE OR REPLACE FUNCTION trigger_generate_qr_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qr_code_data IS NULL THEN
    NEW.qr_code_data := generate_business_qr_code(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_business_profile_qr_code
  BEFORE INSERT OR UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_qr_code();