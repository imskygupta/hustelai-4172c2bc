-- Sprint D · Phase 5 — Run this in the ADMIN DB SQL editor
-- (project: rqqiujmiagauzohdqjmi).
--
-- Creates the structured drop-audit table for operational alerts that the
-- normalizer rejects (silenced legacy noise, HTML fragments, empty payloads,
-- non-whitelisted kinds). The TG channel never sees these, but operators can
-- still query the table when investigating "where did alert X go?".

CREATE TABLE IF NOT EXISTS public.admin_alerts_dropped (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_kind text NOT NULL,
  original_message text,
  reason text NOT NULL,
  source text,
  feature text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_dropped_created
  ON public.admin_alerts_dropped (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_dropped_reason
  ON public.admin_alerts_dropped (reason, created_at DESC);

NOTIFY pgrst, 'reload schema';