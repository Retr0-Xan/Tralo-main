-- Fix all functions that need search_path set for security
-- Update the inventory update function
CREATE OR REPLACE FUNCTION public.update_inventory_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    business_name, 
    owner_name, 
    location, 
    business_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'business_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'owner_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'location', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'business_type', '')
  );
  RETURN NEW;
END;
$$;

-- Update the updated_at function 
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;