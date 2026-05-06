
-- Extend workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS lifetime_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'inquiry',
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz;

-- Payments
CREATE TABLE IF NOT EXISTS public.workspace_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'INR',
  status text DEFAULT 'pending', -- pending, partial, paid, overdue
  payment_type text DEFAULT 'milestone', -- upfront, milestone, recurring, final
  due_date date,
  paid_at timestamptz,
  paid_amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage payments" ON public.workspace_payments
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS idx_ws_payments_workspace ON public.workspace_payments(workspace_id);
CREATE TRIGGER trg_ws_payments_updated BEFORE UPDATE ON public.workspace_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tasks (Kanban)
CREATE TABLE IF NOT EXISTS public.workspace_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  stage text NOT NULL DEFAULT 'inquiry', -- inquiry, planning, design, development, review, delivery, completed
  progress integer DEFAULT 0,
  due_date date,
  blockers text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage tasks" ON public.workspace_tasks
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS idx_ws_tasks_workspace ON public.workspace_tasks(workspace_id);
CREATE TRIGGER trg_ws_tasks_updated BEFORE UPDATE ON public.workspace_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activity timeline
CREATE TABLE IF NOT EXISTS public.workspace_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  event_type text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage activity" ON public.workspace_activity
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS idx_ws_activity_workspace ON public.workspace_activity(workspace_id, created_at DESC);

-- Reminders
CREATE TABLE IF NOT EXISTS public.workspace_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  due_at timestamptz NOT NULL,
  done boolean DEFAULT false,
  kind text DEFAULT 'followup', -- followup, payment, agreement, custom
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage reminders" ON public.workspace_reminders
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS idx_ws_reminders_workspace ON public.workspace_reminders(workspace_id, due_at);
