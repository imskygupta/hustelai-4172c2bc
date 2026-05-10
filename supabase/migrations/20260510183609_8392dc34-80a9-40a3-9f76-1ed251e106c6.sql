-- ============================================================
-- Newsletter automation — sectioned drafts + approval pipeline
-- ============================================================

-- Extend newsletter_subscribers with status / engagement / user link
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS engagement_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill status from is_active
UPDATE public.newsletter_subscribers
   SET status = CASE WHEN is_active THEN 'active' ELSE 'unsubscribed' END
 WHERE status = 'active' AND is_active = false;

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON public.newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user ON public.newsletter_subscribers(user_id);

-- ============================================================
-- newsletter_issues — sectioned drafts with approval workflow
-- ============================================================
CREATE TABLE IF NOT EXISTS public.newsletter_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  subject text NOT NULL,
  preheader text,
  status text NOT NULL DEFAULT 'draft', -- draft|generating|ready|approved|scheduled|sending|sent|failed|rejected
  channel text NOT NULL DEFAULT 'email', -- email|telegram|both
  provider text NOT NULL DEFAULT 'brevo', -- brevo|mailersend
  sections jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{id,title,kind,body_md,sources?}]
  body_html text, -- rendered just before send
  generated_by_job uuid,
  model text,
  cost_units numeric DEFAULT 0,
  scheduled_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz,
  reject_reason text,
  sent_at timestamptz,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_issues_status ON public.newsletter_issues(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_issues_created ON public.newsletter_issues(created_at DESC);

ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage newsletter issues"
  ON public.newsletter_issues FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_newsletter_issues_updated
  BEFORE UPDATE ON public.newsletter_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- newsletter_sends — per-recipient delivery log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.newsletter_issues(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  email text NOT NULL,
  provider text NOT NULL,
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued', -- queued|sent|failed|bounced|opened|clicked
  attempt int NOT NULL DEFAULT 0,
  error text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issue_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_issue ON public.newsletter_sends(issue_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_status ON public.newsletter_sends(status);

ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage newsletter sends"
  ON public.newsletter_sends FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_newsletter_sends_updated
  BEFORE UPDATE ON public.newsletter_sends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- newsletter_capture_dismissals — capture popup dismiss memory
-- ============================================================
CREATE TABLE IF NOT EXISTS public.newsletter_capture_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anon_id text,
  surface text NOT NULL, -- modal|sheet|exit_intent|scroll|onboarding
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_capture_dismiss_user ON public.newsletter_capture_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_capture_dismiss_anon ON public.newsletter_capture_dismissals(anon_id);

ALTER TABLE public.newsletter_capture_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own dismissals"
  ON public.newsletter_capture_dismissals FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL AND anon_id IS NOT NULL)
  );

CREATE POLICY "Users read own dismissals"
  ON public.newsletter_capture_dismissals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RPC helpers
-- ============================================================

-- Approve an issue (admin only). Returns updated row id.
CREATE OR REPLACE FUNCTION public.newsletter_approve_issue(_issue uuid, _scheduled_at timestamptz DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  SELECT status INTO v_status FROM public.newsletter_issues WHERE id = _issue FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF v_status NOT IN ('draft','ready') THEN
    RAISE EXCEPTION 'cannot approve from status %', v_status;
  END IF;
  UPDATE public.newsletter_issues
     SET status = CASE WHEN _scheduled_at IS NOT NULL THEN 'scheduled' ELSE 'approved' END,
         approved_by = auth.uid(),
         approved_at = now(),
         scheduled_at = _scheduled_at
   WHERE id = _issue;
  RETURN _issue;
END;
$$;

-- Reject an issue
CREATE OR REPLACE FUNCTION public.newsletter_reject_issue(_issue uuid, _reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.newsletter_issues
     SET status = 'rejected', rejected_by = auth.uid(),
         rejected_at = now(), reject_reason = _reason
   WHERE id = _issue;
  RETURN _issue;
END;
$$;

-- Dispatch progress counts
CREATE OR REPLACE FUNCTION public.newsletter_dispatch_counts(_issue uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'queued', COUNT(*) FILTER (WHERE status='queued'),
    'sent',   COUNT(*) FILTER (WHERE status='sent'),
    'failed', COUNT(*) FILTER (WHERE status='failed'),
    'opened', COUNT(*) FILTER (WHERE status='opened'),
    'total',  COUNT(*)
  )
  FROM public.newsletter_sends
  WHERE issue_id = _issue
    AND public.has_role(auth.uid(),'admin');
$$;

-- Public-safe subscriber upsert (used by edge function via service role)
-- No RPC needed; edge function uses service role.
