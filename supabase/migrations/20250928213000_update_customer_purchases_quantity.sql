-- Add quantity tracking to customer purchases and update inventory trigger for multi-unit sales
ALTER TABLE public.customer_purchases
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- Ensure existing rows have the default quantity value
UPDATE public.customer_purchases
SET quantity = COALESCE(quantity, 1);

-- Update trigger function to deduct inventory based on recorded quantity
CREATE OR REPLACE FUNCTION public.update_inventory_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id UUID;
  sale_quantity INTEGER;
  unit_sale_price NUMERIC;
BEGIN
  -- Resolve the owning user for the business that recorded the sale
  SELECT bp.user_id
  INTO target_user_id
  FROM business_profiles bp
  WHERE bp.id = NEW.business_id;

  sale_quantity := GREATEST(COALESCE(NEW.quantity, 1), 1);
  unit_sale_price := CASE
    WHEN sale_quantity > 0 THEN NEW.amount / sale_quantity
    ELSE NEW.amount
  END;

  IF target_user_id IS NOT NULL THEN
    -- Sync tracked inventory for the matching product
    UPDATE public.user_products
    SET
      current_stock = GREATEST(0, COALESCE(current_stock, 0) - sale_quantity),
      total_sales_this_month = COALESCE(total_sales_this_month, 0) + NEW.amount,
      last_sale_date = NEW.purchase_date,
      selling_price = unit_sale_price,
      updated_at = now()
    WHERE user_id = target_user_id
      AND (
        product_name ILIKE '%' || NEW.product_name || '%'
        OR NEW.product_name ILIKE '%' || product_name || '%'
      );

    -- Log the movement with the full quantity sold
    INSERT INTO public.inventory_movements (
      user_id,
      product_name,
      movement_type,
      quantity,
      unit_price,
      selling_price,
      customer_id,
      sale_id,
      movement_date
    ) VALUES (
      target_user_id,
      NEW.product_name,
      'sold',
      sale_quantity,
      unit_sale_price,
      unit_sale_price,
      NEW.customer_phone,
      NEW.id::text,
      NEW.purchase_date
    );
  END IF;

  RETURN NEW;
END;
$function$;
