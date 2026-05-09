
-- Enums
DO $$ BEGIN
  CREATE TYPE public.export_status AS ENUM ('pending','ready','delivered','expired','revoked','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.export_visibility AS ENUM ('private','unlisted','team');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- generated_exports
CREATE TABLE IF NOT EXISTS public.generated_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier_at_creation TEXT NOT NULL DEFAULT 'free',
  export_type TEXT NOT NULL,
  title TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_bucket TEXT NOT NULL DEFAULT 'exports',
  storage_path TEXT,
  visibility public.export_visibility NOT NULL DEFAULT 'private',
  status public.export_status NOT NULL DEFAULT 'pending',
  telegram_chat_id TEXT,
  telegram_message_id TEXT,
  delivered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_generated_exports_user_created ON public.generated_exports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_exports_status_expires ON public.generated_exports(status, expires_at);

ALTER TABLE public.generated_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exports_select_own" ON public.generated_exports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "exports_update_own" ON public.generated_exports
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "exports_delete_own" ON public.generated_exports
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_generated_exports_updated
  BEFORE UPDATE ON public.generated_exports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- export_download_tokens
CREATE TABLE IF NOT EXISTS public.export_download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id UUID NOT NULL REFERENCES public.generated_exports(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  user_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  use_count INT NOT NULL DEFAULT 0,
  requires_otp BOOLEAN NOT NULL DEFAULT false,
  otp_hash TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tokens_export ON public.export_download_tokens(export_id);

ALTER TABLE public.export_download_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tokens_select_own" ON public.export_download_tokens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.generated_exports e WHERE e.id = export_id AND e.user_id = auth.uid())
  );
CREATE POLICY "tokens_update_own" ON public.export_download_tokens
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.generated_exports e WHERE e.id = export_id AND e.user_id = auth.uid())
  );

-- export_access_logs
CREATE TABLE IF NOT EXISTS public.export_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id UUID NOT NULL REFERENCES public.generated_exports(id) ON DELETE CASCADE,
  token_id UUID REFERENCES public.export_download_tokens(id) ON DELETE SET NULL,
  user_id UUID,
  ip TEXT,
  user_agent TEXT,
  outcome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_access_logs_export ON public.export_access_logs(export_id, created_at DESC);

ALTER TABLE public.export_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_logs_select_own" ON public.export_access_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.generated_exports e WHERE e.id = export_id AND e.user_id = auth.uid())
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can read their own folder; writes via service role only
CREATE POLICY "exports_read_own_folder" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Mark-expired helper
CREATE OR REPLACE FUNCTION public.mark_expired_exports()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n INT;
BEGIN
  UPDATE public.generated_exports
     SET status = 'expired', updated_at = now()
   WHERE status IN ('ready','delivered','pending')
     AND expires_at IS NOT NULL
     AND expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
