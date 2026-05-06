
-- Portals
CREATE TABLE IF NOT EXISTS public.workspace_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  show_notes boolean DEFAULT false,
  show_payments boolean DEFAULT true,
  show_reminders boolean DEFAULT false,
  show_tasks boolean DEFAULT true,
  show_docs boolean DEFAULT true,
  expires_at timestamptz,
  views integer DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_portals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage portals" ON public.workspace_portals
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "public read by token" ON public.workspace_portals
  FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_ws_portals_token ON public.workspace_portals(token);

-- Comments
CREATE TABLE IF NOT EXISTS public.workspace_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  target_type text NOT NULL DEFAULT 'workspace', -- workspace | doc | task | deliverable
  target_id uuid,
  parent_id uuid,
  author_type text NOT NULL DEFAULT 'owner', -- owner | client | collaborator
  author_name text,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage comments" ON public.workspace_comments
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
-- public insert/select via portal handled by edge function (no anon RLS needed)

-- Approvals
CREATE TABLE IF NOT EXISTS public.workspace_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  target_type text NOT NULL, -- doc | milestone | deliverable
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | changes_requested
  comment text,
  viewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage approvals" ON public.workspace_approvals
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Doc versions
CREATE TABLE IF NOT EXISTS public.workspace_doc_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  data jsonb NOT NULL,
  theme text,
  note text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_doc_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage versions" ON public.workspace_doc_versions
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS idx_ws_versions_doc ON public.workspace_doc_versions(doc_id, version DESC);

-- Files
CREATE TABLE IF NOT EXISTS public.workspace_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  storage_path text NOT NULL,
  size_bytes bigint,
  mime_type text,
  is_client_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage files" ON public.workspace_files
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Collaborators
CREATE TABLE IF NOT EXISTS public.workspace_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  collaborator_id uuid,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer', -- viewer | editor
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (workspace_id, email)
);
ALTER TABLE public.workspace_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage collaborators" ON public.workspace_collaborators
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "collaborator reads own" ON public.workspace_collaborators
  FOR SELECT USING (auth.uid() = collaborator_id);

-- Notifications
CREATE TABLE IF NOT EXISTS public.workspace_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  kind text NOT NULL, -- payment_overdue | quote_viewed | agreement_signed | comment | reminder | approval_pending
  title text NOT NULL,
  body text,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own notifs" ON public.workspace_notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ws_notifs_user ON public.workspace_notifications(user_id, read, created_at DESC);

-- Client events
CREATE TABLE IF NOT EXISTS public.workspace_client_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  portal_id uuid,
  event_type text NOT NULL, -- portal_viewed | doc_viewed | doc_downloaded | approved | commented
  target_type text,
  target_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_client_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read client events" ON public.workspace_client_events
  FOR SELECT USING (auth.uid() = owner_id);

-- Retainers
CREATE TABLE IF NOT EXISTS public.workspace_retainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  monthly_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'INR',
  deliverables jsonb DEFAULT '[]'::jsonb,
  recurring_reminders jsonb DEFAULT '[]'::jsonb,
  next_invoice_at date,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_retainers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage retainers" ON public.workspace_retainers
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_ws_retainers_updated BEFORE UPDATE ON public.workspace_retainers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for workspace files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-files', 'workspace-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: files namespaced as {auth.uid}/{workspace_id}/{filename}
CREATE POLICY "owners read own ws files" ON storage.objects
  FOR SELECT USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "owners insert own ws files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "owners update own ws files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "owners delete own ws files" ON storage.objects
  FOR DELETE USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
