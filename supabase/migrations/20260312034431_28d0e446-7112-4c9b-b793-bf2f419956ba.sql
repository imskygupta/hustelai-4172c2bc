
-- Knowledge Hub: Prompt Folders
CREATE TABLE public.knowledge_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own folders" ON public.knowledge_folders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Knowledge Hub: Saved Prompts
CREATE TABLE public.knowledge_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  folder_id uuid REFERENCES public.knowledge_folders(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  is_favorite boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own prompts" ON public.knowledge_prompts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Knowledge Hub: Knowledge Sources (bookmarks, snippets, notes)
CREATE TABLE public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  source_url text,
  source_type text NOT NULL DEFAULT 'note',
  tags text[] DEFAULT '{}',
  collection text DEFAULT 'General',
  is_favorite boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sources" ON public.knowledge_sources FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Knowledge Hub: Exported Briefings
CREATE TABLE public.knowledge_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  export_type text NOT NULL DEFAULT 'briefing',
  format text NOT NULL DEFAULT 'markdown',
  source_messages jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own exports" ON public.knowledge_exports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Knowledge Hub: Automation Rules
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_config jsonb DEFAULT '{}',
  action_type text NOT NULL DEFAULT 'research',
  action_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  run_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own rules" ON public.automation_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
