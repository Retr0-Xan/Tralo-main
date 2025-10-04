-- Create function to automatically trigger supply chain analysis
CREATE OR REPLACE FUNCTION public.trigger_supply_chain_analysis()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for key business activity tables
-- Trigger when sales are recorded
DROP TRIGGER IF EXISTS trigger_analysis_on_sales ON public.customer_purchases;
CREATE TRIGGER trigger_analysis_on_sales
  AFTER INSERT OR UPDATE ON public.customer_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_supply_chain_analysis();

-- Trigger when inventory is received
DROP TRIGGER IF EXISTS trigger_analysis_on_receipts ON public.inventory_receipts;
CREATE TRIGGER trigger_analysis_on_receipts
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_supply_chain_analysis();

-- Trigger when inventory movements occur
DROP TRIGGER IF EXISTS trigger_analysis_on_movements ON public.inventory_movements;
CREATE TRIGGER trigger_analysis_on_movements
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_supply_chain_analysis();