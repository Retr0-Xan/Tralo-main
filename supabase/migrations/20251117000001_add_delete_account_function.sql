-- Function to delete user account and all associated data
CREATE OR REPLACE FUNCTION public.delete_user_account(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete from all user-related tables
  -- Order matters to avoid foreign key conflicts
  
  -- Delete child tables first (tables with foreign keys to other user tables)
  DELETE FROM public.proforma_invoice_items WHERE invoice_id IN (
    SELECT id FROM public.proforma_invoices WHERE user_id = user_uuid
  );
  
  -- Delete inventory_movements before inventory_receipts (has FK to inventory_receipts)
  DELETE FROM public.inventory_movements WHERE user_id = user_uuid;
  
  -- Delete all other user-related tables
  DELETE FROM public.business_notes WHERE user_id = user_uuid;
  DELETE FROM public.business_reminders WHERE user_id = user_uuid;
  DELETE FROM public.client_value_ratios WHERE user_id = user_uuid;
  DELETE FROM public.customer_sales WHERE user_id = user_uuid;
  DELETE FROM public.customers WHERE user_id = user_uuid;
  DELETE FROM public.documents WHERE user_id = user_uuid;
  DELETE FROM public.enquiries WHERE user_id = user_uuid;
  DELETE FROM public.expenses WHERE user_id = user_uuid;
  DELETE FROM public.external_receipts WHERE user_id = user_uuid;
  DELETE FROM public.inventory_receipts WHERE user_id = user_uuid;
  DELETE FROM public.password_reset_tokens WHERE user_id = user_uuid;
  DELETE FROM public.product_requests WHERE user_id = user_uuid;
  DELETE FROM public.proforma_invoices WHERE user_id = user_uuid;
  DELETE FROM public.sale_reversals WHERE user_id = user_uuid;
  DELETE FROM public.sales_goals WHERE user_id = user_uuid;
  DELETE FROM public.suppliers WHERE user_id = user_uuid;
  DELETE FROM public.trade_insights WHERE user_id = user_uuid;
  DELETE FROM public.user_achievements WHERE user_id = user_uuid;
  DELETE FROM public.user_products WHERE user_id = user_uuid;
  DELETE FROM public.user_trust_scores WHERE user_id = user_uuid;
  
  -- Delete business profile
  DELETE FROM public.business_profiles WHERE user_id = user_uuid;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE id = user_uuid;
  
  -- Delete customer purchases (uses business_id which is the user_id)
  DELETE FROM public.customer_purchases WHERE business_id = user_uuid;
  
  -- Finally delete the auth user (this will cascade to other auth-related tables)
  DELETE FROM auth.users WHERE id = user_uuid;
END;
$$;

-- Grant execute permission to authenticated users (they can only delete their own account)
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
