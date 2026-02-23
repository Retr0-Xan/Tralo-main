-- =============================================================
-- RATE LIMITING TABLE
-- Provides a durable, cross-isolate rate limit store for
-- Edge Functions.  Each function calls check_rate_limit() via
-- the service-role client before processing any request.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id          BIGSERIAL    PRIMARY KEY,
  key         TEXT         NOT NULL,               -- e.g. "reset-password:1.2.3.4"
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hit_count   INTEGER      NOT NULL DEFAULT 1,
  UNIQUE (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_window ON public.rate_limit_log (key, window_start);

-- Auto-clean rows older than 24 hours to keep the table small
CREATE OR REPLACE FUNCTION public.prune_rate_limit_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_log WHERE window_start < NOW() - INTERVAL '24 hours';
$$;

-- ---------------------------------------------------------------------------
-- check_rate_limit(p_key, p_max, p_window_seconds)
-- Returns TRUE  → request is allowed
-- Returns FALSE → request is rate-limited
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key            TEXT,
  p_max            INTEGER,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window  TIMESTAMPTZ;
  v_count   INTEGER;
BEGIN
  -- Truncate NOW() to the start of the current window
  v_window := date_trunc('seconds', NOW()) -
              (EXTRACT(EPOCH FROM NOW())::INTEGER % p_window_seconds) * INTERVAL '1 second';

  INSERT INTO public.rate_limit_log (key, window_start, hit_count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET hit_count = rate_limit_log.hit_count + 1
  RETURNING hit_count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role, authenticated;

-- Disable RLS – this table is only written by service_role functions
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.rate_limit_log
  USING (false);             -- deny all authenticated/anon direct access
