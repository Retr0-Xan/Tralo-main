-- Fix security warning by setting search_path for trigger function
CREATE OR REPLACE FUNCTION public.trigger_supply_chain_analysis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- This function will be called when relevant business activities occur
  -- For now, we'll just log the activity and rely on manual analysis triggers
  -- In the future, this could call the Edge Function automatically
  
  RAISE LOG 'Supply chain analysis trigger: % on table %', TG_OP, TG_TABLE_NAME;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$;