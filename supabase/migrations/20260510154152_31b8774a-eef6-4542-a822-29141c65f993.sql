-- ============================================================
-- Telegram Bot Control Center foundation
-- ============================================================

-- 1) telegram_bots ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telegram_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  purpose text,
  environment text NOT NULL DEFAULT 'production', -- production | staging | dev
  enabled boolean NOT NULL DEFAULT true,
  token_secret_name text,                 -- secret key name in Lovable Cloud
  webhook_url text,
  webhook_secret_name text,
  last_ping_at timestamptz,
  status text NOT NULL DEFAULT 'unknown', -- ok | degraded | down | unknown
  delivery_count_24h int NOT NULL DEFAULT 0,
  failure_count_24h int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telegram_bots admin all"
  ON public.telegram_bots FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "telegram_bots public read minimal"
  ON public.telegram_bots FOR SELECT USING (enabled = true);

-- 2) notification_routes ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_pattern text NOT NULL,           -- e.g. payment.* | export.failed | security.*
  channel text NOT NULL,                  -- telegram | email | discord | webhook
  target_bot_id uuid REFERENCES public.telegram_bots(id) ON DELETE SET NULL,
  target_email text,
  target_url text,
  enabled boolean NOT NULL DEFAULT true,
  severity_min text NOT NULL DEFAULT 'info', -- info | warn | error | critical
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_routes admin all"
  ON public.notification_routes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) telegram_link_tokens (secure linking) ---------------------------
CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bot_id uuid REFERENCES public.telegram_bots(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tg_link_tokens_user ON public.telegram_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tg_link_tokens_exp  ON public.telegram_link_tokens(expires_at);
CREATE POLICY "tg_link_tokens own read"
  ON public.telegram_link_tokens FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tg_link_tokens admin write"
  ON public.telegram_link_tokens FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) telegram_commands -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.telegram_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid REFERENCES public.telegram_bots(id) ON DELETE CASCADE,
  command text NOT NULL,                   -- e.g. files | latest | plan | usage
  description text,
  enabled boolean NOT NULL DEFAULT true,
  min_tier text DEFAULT 'free',
  admin_only boolean NOT NULL DEFAULT false,
  beta_only boolean NOT NULL DEFAULT false,
  rate_limit_per_min int NOT NULL DEFAULT 30,
  handler_key text,                         -- routes to edge fn handler
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot_id, command)
);
ALTER TABLE public.telegram_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telegram_commands public read"
  ON public.telegram_commands FOR SELECT USING (true);
CREATE POLICY "telegram_commands admin write"
  ON public.telegram_commands FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) broadcast_jobs --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broadcast_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'telegram', -- telegram | email
  bot_id uuid REFERENCES public.telegram_bots(id) ON DELETE SET NULL,
  audience text NOT NULL DEFAULT 'all',     -- all | pro | elite | infinity | beta | affiliates | custom
  audience_user_ids uuid[],
  status text NOT NULL DEFAULT 'draft',     -- draft | queued | sending | done | failed | cancelled
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcast_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broadcast_jobs admin all"
  ON public.broadcast_jobs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6) link token RPCs --------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_telegram_link_token(_user uuid, _bot uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_expires timestamptz := now() + interval '10 minutes';
BEGIN
  IF auth.uid() <> _user AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- invalidate old unused tokens
  UPDATE public.telegram_link_tokens
     SET used_at = now()
   WHERE user_id = _user AND used_at IS NULL;

  v_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.telegram_link_tokens(user_id, bot_id, token, expires_at)
  VALUES (_user, _bot, v_token, v_expires);

  RETURN jsonb_build_object('token', v_token, 'expires_at', v_expires);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_telegram_link_token(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid;
BEGIN
  UPDATE public.telegram_link_tokens
     SET used_at = now()
   WHERE token = _token AND used_at IS NULL AND expires_at > now()
  RETURNING user_id INTO v_user;
  RETURN v_user;
END;
$$;

-- 7) Seeds ------------------------------------------------------------
INSERT INTO public.telegram_bots (name, username, purpose, environment, enabled, token_secret_name, notes)
VALUES
  ('HustleAI Notifications', 'hustlaiapp_bot', 'User notifications, exports, alerts', 'production', true, 'TELEGRAM_BOT_TOKEN', 'Primary user-facing bot.'),
  ('SkyMedia Ops', 'theskymediabot', 'Admin/media operations + ops alerts', 'production', true, 'SKYMEDIA_BOT_TOKEN', 'Internal ops bot.')
ON CONFLICT (username) DO NOTHING;

-- Default command registry on the primary user bot
WITH primary_bot AS (
  SELECT id FROM public.telegram_bots WHERE username = 'hustlaiapp_bot' LIMIT 1
)
INSERT INTO public.telegram_commands (bot_id, command, description, enabled, min_tier, admin_only, beta_only, handler_key)
SELECT pb.id, c.cmd, c.descr, true, c.min_tier, c.admin_only, c.beta_only, c.handler
FROM primary_bot pb,
(VALUES
  ('start',         'Link your HustleAI account',      'free',     false, false, 'cmd_start'),
  ('files',         'List your recent exports',         'free',     false, false, 'cmd_files'),
  ('latest',        'Latest export delivered to you',   'free',     false, false, 'cmd_latest'),
  ('plan',          'Show your current plan',           'free',     false, false, 'cmd_plan'),
  ('usage',         'Show today usage and limits',      'free',     false, false, 'cmd_usage'),
  ('exports',       'Manage your exports',              'pro',      false, false, 'cmd_exports'),
  ('billing',       'Open billing portal link',         'free',     false, false, 'cmd_billing'),
  ('notifications', 'Toggle notification preferences',  'free',     false, false, 'cmd_notifications'),
  ('workspace',     'Open your workspace',              'pro',      false, false, 'cmd_workspace'),
  ('broadcast',     'Send a broadcast (admin only)',    'free',     true,  false, 'cmd_broadcast')
) AS c(cmd, descr, min_tier, admin_only, beta_only, handler)
ON CONFLICT (bot_id, command) DO NOTHING;

-- Default routes: payment + security + system go to primary bot
WITH primary_bot AS (
  SELECT id FROM public.telegram_bots WHERE username = 'hustlaiapp_bot' LIMIT 1
)
INSERT INTO public.notification_routes (event_pattern, channel, target_bot_id, severity_min)
SELECT 'payment.*',  'telegram', pb.id, 'warn'  FROM primary_bot pb
UNION ALL SELECT 'security.*', 'telegram', pb.id, 'warn'  FROM primary_bot pb
UNION ALL SELECT 'system.*',   'telegram', pb.id, 'critical' FROM primary_bot pb
UNION ALL SELECT 'export.failed', 'telegram', pb.id, 'info' FROM primary_bot pb;
