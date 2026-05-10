
ALTER TABLE public.telegram_bots
  ADD COLUMN IF NOT EXISTS webhook_info jsonb,
  ADD COLUMN IF NOT EXISTS webhook_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_update_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_response jsonb,
  ADD COLUMN IF NOT EXISTS last_command_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_command text,
  ADD COLUMN IF NOT EXISTS runtime_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
-- role: 'user' (HustleAI user-facing bot) | 'admin' (ops bot)

UPDATE public.telegram_bots SET role='admin' WHERE username='theskymediabot';

CREATE TABLE IF NOT EXISTS public.telegram_admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid REFERENCES public.telegram_bots(id) ON DELETE CASCADE,
  telegram_chat_id text NOT NULL,
  telegram_username text,
  display_name text,
  user_id uuid,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot_id, telegram_chat_id)
);
ALTER TABLE public.telegram_admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tg admins admin all" ON public.telegram_admin_users
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.telegram_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid REFERENCES public.telegram_bots(id) ON DELETE SET NULL,
  telegram_chat_id text NOT NULL,
  telegram_username text,
  command text NOT NULL,
  args text,
  allowed boolean NOT NULL,
  reason text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tg_admin_audit_created ON public.telegram_admin_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tg_admin_audit_bot ON public.telegram_admin_audit(bot_id, created_at DESC);
ALTER TABLE public.telegram_admin_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tg admin audit admin read" ON public.telegram_admin_audit
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- Seed admin command registry for SkyMedia bot (idempotent)
INSERT INTO public.telegram_commands (bot_id, command, description, admin_only, handler_key)
SELECT b.id, c.cmd, c.desc, true, c.cmd
  FROM public.telegram_bots b
  CROSS JOIN (VALUES
    ('runtime',    'Show runtime status snapshot'),
    ('flags',      'List active flag kill switches / maintenance'),
    ('payments',   'Recent payment events / pending UPI approvals'),
    ('broadcast',  'Send broadcast: /broadcast <tier|all> <message>'),
    ('incidents',  'Open feature flag incidents'),
    ('queues',     'Workflow + AI job queue depth'),
    ('aijobs',     'Recent AI jobs summary'),
    ('exports',    'Recent export deliveries'),
    ('maintenance','Toggle maintenance flag: /maintenance <flag> <on|off>'),
    ('whoami',     'Show your admin authorization status'),
    ('help',       'List admin commands')
  ) AS c(cmd, "desc")
 WHERE b.username = 'theskymediabot'
ON CONFLICT (bot_id, command) DO NOTHING;
