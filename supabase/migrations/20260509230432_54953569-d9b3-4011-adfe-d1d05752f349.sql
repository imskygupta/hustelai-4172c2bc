
ALTER TABLE public.generated_exports
  ADD COLUMN IF NOT EXISTS telegram_file_id text,
  ADD COLUMN IF NOT EXISTS telegram_storage_message_id text,
  ADD COLUMN IF NOT EXISTS telegram_storage_channel_id text,
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS download_limit int,
  ADD COLUMN IF NOT EXISTS download_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS watermarked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_generated_exports_user_fav
  ON public.generated_exports (user_id, is_favorite) WHERE is_favorite = true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text;

CREATE OR REPLACE FUNCTION public.consume_export_download(_export_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.generated_exports%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.generated_exports WHERE id = _export_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_found');
  END IF;
  IF v_row.status = 'revoked' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'revoked');
  END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'expired');
  END IF;
  IF v_row.download_limit IS NOT NULL AND v_row.download_count >= v_row.download_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'limit_reached');
  END IF;
  UPDATE public.generated_exports
     SET download_count = download_count + 1,
         last_accessed_at = now()
   WHERE id = _export_id;
  RETURN jsonb_build_object('allowed', true, 'count', v_row.download_count + 1);
END;
$$;
