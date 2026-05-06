
-- ============ TOPICS ============
CREATE TABLE public.seo_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text DEFAULT '',
  hero_keyword text DEFAULT '',
  keywords text[] DEFAULT '{}',
  cover_image text,
  color text DEFAULT '#6366f1',
  icon text DEFAULT '🧭',
  pillar_page_id uuid,
  priority int DEFAULT 0,
  seo_score int DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage topics" ON public.seo_topics FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone reads published topics" ON public.seo_topics FOR SELECT
  USING (is_published = true);
CREATE TRIGGER seo_topics_updated_at BEFORE UPDATE ON public.seo_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTHORS ============
CREATE TABLE public.seo_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  bio text DEFAULT '',
  avatar_url text,
  expertise text[] DEFAULT '{}',
  social_links jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage authors" ON public.seo_authors FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone reads authors" ON public.seo_authors FOR SELECT USING (is_published = true);
CREATE TRIGGER seo_authors_updated_at BEFORE UPDATE ON public.seo_authors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TAGS ============
CREATE TABLE public.seo_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tags" ON public.seo_tags FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone reads tags" ON public.seo_tags FOR SELECT USING (true);

CREATE TABLE public.seo_post_tags (
  post_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  PRIMARY KEY (post_id, tag_id)
);
ALTER TABLE public.seo_post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage post tags" ON public.seo_post_tags FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone reads post tags" ON public.seo_post_tags FOR SELECT USING (true);

-- ============ RELATED TOOLS ============
CREATE TABLE public.seo_related_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text DEFAULT '',
  url text NOT NULL,
  icon text DEFAULT '🛠️',
  category text DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_related_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tools" ON public.seo_related_tools FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone reads active tools" ON public.seo_related_tools FOR SELECT USING (is_active = true);
CREATE TRIGGER seo_related_tools_updated_at BEFORE UPDATE ON public.seo_related_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INTERNAL LINK MAP ============
CREATE TABLE public.seo_internal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  target_slug text NOT NULL,
  target_type text NOT NULL DEFAULT 'page',
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_internal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage internal links" ON public.seo_internal_links FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone reads active internal links" ON public.seo_internal_links FOR SELECT USING (is_active = true);
CREATE INDEX idx_seo_internal_links_keyword ON public.seo_internal_links (lower(keyword));

-- ============ EXTEND seo_pages ============
ALTER TABLE public.seo_pages
  ADD COLUMN IF NOT EXISTS topic_id uuid,
  ADD COLUMN IF NOT EXISTS is_pillar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_page_id uuid,
  ADD COLUMN IF NOT EXISTS breadcrumb_label text,
  ADD COLUMN IF NOT EXISTS related_page_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_tool_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS faq_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_link_enabled boolean NOT NULL DEFAULT false;

-- ============ EXTEND seo_blog_posts ============
ALTER TABLE public.seo_blog_posts
  ADD COLUMN IF NOT EXISTS topic_id uuid,
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS reading_time_minutes int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS toc jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS related_post_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_tool_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS faq_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS frequently_used_with uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_link_enabled boolean NOT NULL DEFAULT true;

-- ============ AUTO TOC + READING TIME ============
CREATE OR REPLACE FUNCTION public.seo_blog_compute_meta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  word_count int;
  toc_arr jsonb := '[]'::jsonb;
  m text;
  level int;
  txt text;
  slug text;
BEGIN
  IF NEW.content IS NULL THEN
    NEW.content := '';
  END IF;
  -- reading time: ~200 wpm
  word_count := array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1);
  IF word_count IS NULL THEN word_count := 0; END IF;
  NEW.reading_time_minutes := GREATEST(1, ceil(word_count::numeric / 200));

  -- TOC from H2/H3 markdown headings
  FOR m IN SELECT (regexp_matches(NEW.content, '^(#{2,3})\s+(.+)$', 'gm'))[2] LOOP
    NULL;
  END LOOP;

  -- Build TOC properly
  toc_arr := '[]'::jsonb;
  FOR m, txt IN
    SELECT (mm)[1], (mm)[2]
    FROM (
      SELECT regexp_matches(NEW.content, '^(#{2,3})\s+(.+)$', 'gm') AS mm
    ) sub
  LOOP
    level := length(m);
    slug := lower(regexp_replace(regexp_replace(txt, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
    toc_arr := toc_arr || jsonb_build_object('level', level, 'text', txt, 'slug', slug);
  END LOOP;
  NEW.toc := toc_arr;

  RETURN NEW;
END;
$$;

CREATE TRIGGER seo_blog_compute_meta_trg
BEFORE INSERT OR UPDATE OF content ON public.seo_blog_posts
FOR EACH ROW EXECUTE FUNCTION public.seo_blog_compute_meta();

-- ============ SEED ============
INSERT INTO public.seo_topics (slug, title, description, hero_keyword, icon, color, priority) VALUES
('freelancer-crm', 'Freelancer CRM', 'Manage clients, deals and follow-ups in one place.', 'freelancer crm', '🧲', '#6366f1', 100),
('client-onboarding', 'Client Onboarding', 'Frictionless onboarding for new clients with portals and forms.', 'client onboarding software', '🚀', '#0ea5e9', 90),
('ai-invoicing', 'AI Invoicing & Proposals', 'Generate proposals, quotes and invoices with AI.', 'ai invoice generator', '🧾', '#22c55e', 90),
('freelancer-productivity', 'Freelancer Productivity', 'Daily systems, time tracking and focus tools for solo operators.', 'freelancer productivity tools', '⚡', '#f59e0b', 80),
('agency-operations', 'Agency Operations', 'Workflow systems for small agencies and studios.', 'agency workflow tools', '🏢', '#ef4444', 80),
('workspace-os', 'AI Workspace OS', 'The all-in-one workspace for freelancers and creators.', 'ai workspace os', '🧠', '#a855f7', 100)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.seo_authors (slug, display_name, bio, expertise) VALUES
('hustlai-editorial', 'HustleAI Editorial', 'Operating notes and playbooks from the HustleAI team.', ARRAY['freelancer crm','ai workspace','client onboarding'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.seo_internal_links (keyword, target_slug, target_type, priority) VALUES
('freelancer crm', 'freelancer-crm', 'page', 100),
('client onboarding', 'client-onboarding-software', 'page', 90),
('client portal', 'client-portal-software', 'page', 85),
('invoice generator', 'ai-invoice-generator', 'page', 90),
('proposal generator', 'proposal-generator', 'page', 85),
('quotation generator', 'quotation-generator', 'page', 80),
('workspace os', 'workspace-os', 'page', 95),
('ai workspace', 'workspace-os', 'page', 95),
('freelancer workspace', 'freelancer-workspace', 'page', 80),
('document generator', 'ai-document-generator', 'page', 80),
('agency workflow', 'agency-workflow-tools', 'page', 80),
('productivity tools', 'freelancer-productivity-tools', 'page', 75)
ON CONFLICT DO NOTHING;
