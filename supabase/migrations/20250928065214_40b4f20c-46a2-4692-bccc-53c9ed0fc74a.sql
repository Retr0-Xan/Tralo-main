-- Add selling_price column to inventory_movements table
ALTER TABLE public.inventory_movements 
ADD COLUMN selling_price numeric;

-- Add selling_price column to user_products table  
ALTER TABLE public.user_products
ADD COLUMN selling_price numeric;

-- Update the inventory trigger to also update selling price in user_products
CREATE OR REPLACE FUNCTION public.update_inventory_on_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the correct user_id from business_profiles
  SELECT bp.user_id INTO target_user_id
  FROM business_profiles bp
  WHERE bp.id = NEW.business_id;

  -- Only proceed if we found a valid user_id
  IF target_user_id IS NOT NULL THEN
    -- Try to find matching product in user_products (using correct user_id)
    UPDATE public.user_products 
    SET 
      current_stock = GREATEST(0, current_stock - 1),
      total_sales_this_month = COALESCE(total_sales_this_month, 0) + NEW.amount,
      last_sale_date = NEW.purchase_date,
      updated_at = now()
    WHERE user_id = target_user_id
      AND (
        product_name ILIKE '%' || NEW.product_name || '%' 
        OR NEW.product_name ILIKE '%' || product_name || '%'
      );

    -- Record inventory movement for tracking (using correct user_id)
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
      target_user_id,
      NEW.product_name,
      'sold',
      1,
      NEW.amount,
      NEW.customer_phone,
      NEW.id::text,
      NEW.purchase_date
    );
  END IF;

  RETURN NEW;
END;
$function$;