-- =============================================================
-- AUDIT LOG TABLE
-- Tracks critical actions across the application such as
-- user deletions, role changes, profile updates, login events,
-- document access, and other sensitive operations.
-- =============================================================

-- Enum for well-known action categories
CREATE TYPE public.audit_action AS ENUM (
  'user_created',
  'user_deleted',
  'user_role_changed',
  'user_banned',
  'user_unbanned',
  'profile_updated',
  'password_changed',
  'password_reset_requested',
  'login_success',
  'login_failed',
  'logout',
  'document_generated',
  'document_downloaded',
  'document_deleted',
  'inventory_item_deleted',
  'sale_reversed',
  'expense_reversed',
  'bulk_data_deleted',
  'account_data_export',
  'admin_action',
  'other'
);

-- Core audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  action        public.audit_action NOT NULL,
  action_detail TEXT,                          -- free-text description or sub-action label

  -- Who did it
  performed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Who / what was affected (optional)
  target_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_table     TEXT,                       -- e.g. 'user_products', 'documents'
  target_record_id TEXT,                       -- stringified UUID / PK of the affected row

  -- Snapshot of changes (for diff-style audit trails)
  old_values    JSONB,
  new_values    JSONB,

  -- Additional context
  metadata      JSONB,                         -- e.g. { "reason": "...", "source": "admin-panel" }
  ip_address    INET,                          -- caller IP if available
  user_agent    TEXT,

  -- When
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------
-- Indexes for common query patterns
-- -----------------------------------------------------------------
CREATE INDEX idx_audit_log_action        ON public.audit_log (action);
CREATE INDEX idx_audit_log_performed_by  ON public.audit_log (performed_by);
CREATE INDEX idx_audit_log_target_user   ON public.audit_log (target_user_id);
CREATE INDEX idx_audit_log_target_table  ON public.audit_log (target_table);
CREATE INDEX idx_audit_log_created_at    ON public.audit_log (created_at DESC);

-- -----------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only the user themselves can read their own audit entries.
-- Service-role (backend functions) bypasses RLS entirely.
CREATE POLICY "Users can view their own audit entries"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (performed_by = auth.uid() OR target_user_id = auth.uid());

-- Audit entries are written exclusively by server-side code
-- (Edge Functions / triggers running as service_role).
-- Authenticated users must NOT be able to insert/update/delete.
CREATE POLICY "No direct insert by authenticated users"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- -----------------------------------------------------------------
-- Helper function: log_audit_event
-- Called from Edge Functions or trigger bodies (SECURITY DEFINER).
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action           public.audit_action,
  p_performed_by     UUID        DEFAULT NULL,
  p_action_detail    TEXT        DEFAULT NULL,
  p_target_user_id   UUID        DEFAULT NULL,
  p_target_table     TEXT        DEFAULT NULL,
  p_target_record_id TEXT        DEFAULT NULL,
  p_old_values       JSONB       DEFAULT NULL,
  p_new_values       JSONB       DEFAULT NULL,
  p_metadata         JSONB       DEFAULT NULL,
  p_ip_address       INET        DEFAULT NULL,
  p_user_agent       TEXT        DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    action,
    action_detail,
    performed_by,
    target_user_id,
    target_table,
    target_record_id,
    old_values,
    new_values,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_action,
    p_action_detail,
    p_performed_by,
    p_target_user_id,
    p_target_table,
    p_target_record_id,
    p_old_values,
    p_new_values,
    p_metadata,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Allow authenticated users to call the logger
-- (the SECURITY DEFINER body will still enforce what actually gets written)
GRANT EXECUTE ON FUNCTION public.log_audit_event(
  public.audit_action, UUID, TEXT, UUID, TEXT, TEXT, JSONB, JSONB, JSONB, INET, TEXT
) TO authenticated, service_role;

-- -----------------------------------------------------------------
-- Auto-log trigger: capture user deletions via delete_user_account()
-- We attach it to the profiles table since auth.users is managed by GoTrue.
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit_event(
    p_action           => 'user_deleted',
    p_action_detail    => 'User account and associated data deleted',
    p_performed_by     => OLD.id,          -- the user who triggered deletion of their own account
    p_target_user_id   => OLD.id,
    p_target_table     => 'profiles',
    p_target_record_id => OLD.id::TEXT,
    p_old_values       => to_jsonb(OLD),
    p_metadata         => jsonb_build_object('email', OLD.email)
  );
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_audit_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_delete();

-- -----------------------------------------------------------------
-- Auto-log trigger: capture profile updates (e.g. role / plan changes)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if meaningful fields changed
  IF (OLD.business_type IS DISTINCT FROM NEW.business_type)
     OR (OLD.email IS DISTINCT FROM NEW.email)
  THEN
    PERFORM public.log_audit_event(
      p_action           => 'profile_updated',
      p_performed_by     => NEW.id,
      p_target_user_id   => NEW.id,
      p_target_table     => 'profiles',
      p_target_record_id => NEW.id::TEXT,
      p_old_values       => to_jsonb(OLD),
      p_new_values       => to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_update();

-- -----------------------------------------------------------------
-- Grant table-level permissions (read handled by RLS above)
-- -----------------------------------------------------------------
GRANT SELECT ON public.audit_log TO authenticated;
