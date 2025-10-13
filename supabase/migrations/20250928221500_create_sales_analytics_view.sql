-- Create unified sales analytics view to standardize reporting metrics
CREATE OR REPLACE VIEW public.sales_analytics AS
WITH sale_reversal_flags AS (
  SELECT
    sr.original_sale_id,
    sr.user_id,
    TRUE AS has_reversal
  FROM public.sale_reversals sr
),
customer_sale_rollup AS (
  SELECT
    cs.sale_id,
    SUM(cs.total_amount) AS total_amount,
    SUM(cs.quantity) AS total_quantity,
    BOOL_OR(cs.payment_method = 'partial') AS has_partial_payment,
    MAX(cs.payment_method) FILTER (WHERE cs.payment_method IS NOT NULL) AS latest_payment_method
  FROM public.customer_sales cs
  GROUP BY cs.sale_id
)
SELECT
  cp.id AS sale_id,
  cp.business_id,
  bp.user_id,
  cp.product_name,
  cp.amount,
  COALESCE(cp.quantity, 1) AS quantity,
  CASE
    WHEN COALESCE(cp.quantity, 1) = 0 THEN cp.amount
    ELSE cp.amount / COALESCE(NULLIF(cp.quantity, 0), 1)
  END AS unit_price,
  cp.payment_method,
  cp.purchase_date,
  cp.customer_phone,
  COALESCE(srf.has_reversal, FALSE) OR cp.payment_method = 'reversed' AS is_reversed,
  CASE
    WHEN COALESCE(srf.has_reversal, FALSE) OR cp.payment_method = 'reversed' THEN 0
    ELSE cp.amount
  END AS effective_amount,
  CASE
    WHEN COALESCE(srf.has_reversal, FALSE) OR cp.payment_method = 'reversed' THEN 0
    ELSE COALESCE(cp.quantity, 1)
  END AS effective_quantity,
  COALESCE(csr.total_amount, cp.amount) AS customer_total_amount,
  COALESCE(csr.total_quantity, cp.quantity) AS customer_total_quantity,
  COALESCE(csr.has_partial_payment, FALSE) AS has_partial_payment,
  (cp.payment_method = 'credit') AS is_credit_sale,
  CASE
    WHEN cp.payment_method = 'credit' THEN cp.amount
    ELSE 0
  END AS outstanding_credit_amount,
  csr.latest_payment_method AS customer_payment_method
FROM public.customer_purchases cp
JOIN public.business_profiles bp ON bp.id = cp.business_id
LEFT JOIN sale_reversal_flags srf ON srf.original_sale_id = cp.id AND srf.user_id = bp.user_id
LEFT JOIN customer_sale_rollup csr ON csr.sale_id = cp.id;

COMMENT ON VIEW public.sales_analytics IS 'Unified sales reporting view with reversal, quantity, and customer sale rollups.';
