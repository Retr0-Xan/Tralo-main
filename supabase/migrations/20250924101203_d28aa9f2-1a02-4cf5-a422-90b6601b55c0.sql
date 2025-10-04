-- Add triggers to automatically update inventory when sales are made
-- This will help keep the dashboard data in sync

-- Function to update inventory when a sale is made
CREATE OR REPLACE FUNCTION public.update_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find matching product in user_products
  UPDATE public.user_products 
  SET 
    current_stock = GREATEST(0, current_stock - 1),
    total_sales_this_month = COALESCE(total_sales_this_month, 0) + NEW.amount,
    last_sale_date = NEW.purchase_date,
    updated_at = now()
  WHERE user_id = NEW.business_id 
    AND (
      product_name ILIKE '%' || NEW.product_name || '%' 
      OR NEW.product_name ILIKE '%' || product_name || '%'
    );

  -- If no matching product found, don't fail the sale
  -- Record inventory movement for tracking
  INSERT INTO public.inventory_movements (
    user_id,
    product_name,
    movement_type,
    quantity,
    unit_price,
    customer_id,
    sale_id,
    movement_date
  ) VALUES (
    NEW.business_id,
    NEW.product_name,
    'sold',
    1,
    NEW.amount,
    NEW.customer_phone,
    NEW.id::text,
    NEW.purchase_date
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic inventory updates on sales
DROP TRIGGER IF EXISTS trigger_update_inventory_on_sale ON public.customer_purchases;
CREATE TRIGGER trigger_update_inventory_on_sale
  AFTER INSERT ON public.customer_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_on_sale();