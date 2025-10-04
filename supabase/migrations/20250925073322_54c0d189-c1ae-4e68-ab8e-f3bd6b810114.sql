-- Fix security issues for password_reset_tokens table

-- Add RLS policies for password_reset_tokens (only system can access)
CREATE POLICY "System can manage password reset tokens" 
ON public.password_reset_tokens 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Update the cleanup function with proper search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at < now();
END;
$$;