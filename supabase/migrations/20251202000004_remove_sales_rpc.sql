-- Remove the get_sales_analytics RPC function since we're using direct view queries
DROP FUNCTION IF EXISTS public.get_sales_analytics;
