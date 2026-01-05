-- Add RLS policy to allow business owners to update their customer purchases
-- This is needed for recording credit/partial payment installments

CREATE POLICY "Business owners can update their purchases" 
ON public.customer_purchases 
FOR UPDATE 
USING (
  business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
);
