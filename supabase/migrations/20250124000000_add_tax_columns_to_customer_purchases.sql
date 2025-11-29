-- Add tax columns to customer_purchases table

ALTER TABLE public.customer_purchases 
ADD COLUMN vat_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN nhil_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN getfund_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN covid19_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN total_tax DECIMAL(10,2) DEFAULT 0;

-- Add comments to clarify tax purposes
COMMENT ON COLUMN public.customer_purchases.vat_amount IS 'Value Added Tax (15%)';
COMMENT ON COLUMN public.customer_purchases.nhil_amount IS 'National Health Insurance Levy (2.5%)';
COMMENT ON COLUMN public.customer_purchases.getfund_amount IS 'Ghana Education Trust Fund Levy (2.5%)';
COMMENT ON COLUMN public.customer_purchases.covid19_amount IS 'COVID-19 Health Recovery Levy (1%)';
COMMENT ON COLUMN public.customer_purchases.total_tax IS 'Sum of all applicable taxes';
