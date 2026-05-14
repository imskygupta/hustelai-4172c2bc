
-- =========================================
-- BOOKMARKS
-- =========================================
CREATE TABLE IF NOT EXISTS public.blog_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  anon_id TEXT,
  post_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookmark_owner CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookmark_user
  ON public.blog_bookmarks(user_id, post_slug) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookmark_anon
  ON public.blog_bookmarks(anon_id, post_slug) WHERE anon_id IS NOT NULL AND user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookmark_slug ON public.blog_bookmarks(post_slug);

ALTER TABLE public.blog_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bookmarks"
  ON public.blog_bookmarks FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bookmarks"
  ON public.blog_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own bookmarks"
  ON public.blog_bookmarks FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "Admins read all bookmarks"
  ON public.blog_bookmarks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- BEHAVIOR EVENTS
-- =========================================
CREATE TABLE IF NOT EXISTS public.blog_events (
  id BIGSERIAL PRIMARY KEY,
  post_slug TEXT,
  user_id UUID,
  anon_id TEXT,
  kind TEXT NOT NULL,            -- view | read | scroll_50 | scroll_90 | bookmark | unbookmark
  persona TEXT,
  referrer TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blog_events_slug_time ON public.blog_events(post_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_events_kind_time ON public.blog_events(kind, created_at DESC);

ALTER TABLE public.blog_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone inserts blog events"
  ON public.blog_events FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admins read blog events"
  ON public.blog_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.tool_launch_events (
  id BIGSERIAL PRIMARY KEY,
  tool_slug TEXT NOT NULL,
  source_kind TEXT,              -- 'blog' | 'cta' | 'rail' | 'homepage' | 'persona_page' | 'direct'
  source_slug TEXT,              -- e.g. blog post slug
  cta_id TEXT,
  persona TEXT,
  user_id UUID,
  anon_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tool_launch_slug_time ON public.tool_launch_events(tool_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_launch_source ON public.tool_launch_events(source_slug, created_at DESC);

ALTER TABLE public.tool_launch_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone inserts tool launches"
  ON public.tool_launch_events FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admins read tool launches"
  ON public.tool_launch_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.cta_events (
  id BIGSERIAL PRIMARY KEY,
  cta_id TEXT NOT NULL,
  kind TEXT NOT NULL,            -- impression | click
  source_slug TEXT,
  target_slug TEXT,
  persona TEXT,
  user_id UUID,
  anon_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cta_events_id_time ON public.cta_events(cta_id, created_at DESC);

ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone inserts cta events"
  ON public.cta_events FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admins read cta events"
  ON public.cta_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- ROLLUP TABLE (filled by future cron)
-- =========================================
CREATE TABLE IF NOT EXISTS public.engagement_rollups_post (
  post_slug TEXT NOT NULL,
  day DATE NOT NULL,
  views INT NOT NULL DEFAULT 0,
  reads INT NOT NULL DEFAULT 0,
  bookmarks INT NOT NULL DEFAULT 0,
  cta_clicks INT NOT NULL DEFAULT 0,
  tool_launches INT NOT NULL DEFAULT 0,
  engagement_score NUMERIC NOT NULL DEFAULT 0,
  PRIMARY KEY (post_slug, day)
);
ALTER TABLE public.engagement_rollups_post ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read rollups"
  ON public.engagement_rollups_post FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- RPCs
-- =========================================
CREATE OR REPLACE FUNCTION public.bookmark_count_for_post(_slug TEXT)
RETURNS INT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.blog_bookmarks WHERE post_slug = _slug;
$$;

CREATE OR REPLACE FUNCTION public.bookmark_counts_for_posts(_slugs TEXT[])
RETURNS TABLE(post_slug TEXT, count INT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT post_slug, COUNT(*)::int
    FROM public.blog_bookmarks
   WHERE post_slug = ANY(_slugs)
   GROUP BY post_slug;
$$;

CREATE OR REPLACE FUNCTION public.toggle_bookmark(_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_existing UUID;
  v_count INT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;
  SELECT id INTO v_existing FROM public.blog_bookmarks
   WHERE user_id = v_user AND post_slug = _slug;
  IF v_existing IS NOT NULL THEN
    DELETE FROM public.blog_bookmarks WHERE id = v_existing;
    INSERT INTO public.blog_events(post_slug, user_id, kind)
      VALUES (_slug, v_user, 'unbookmark');
    SELECT COUNT(*)::int INTO v_count FROM public.blog_bookmarks WHERE post_slug = _slug;
    RETURN jsonb_build_object('saved', false, 'count', v_count);
  ELSE
    INSERT INTO public.blog_bookmarks(user_id, post_slug) VALUES (v_user, _slug);
    INSERT INTO public.blog_events(post_slug, user_id, kind)
      VALUES (_slug, v_user, 'bookmark');
    SELECT COUNT(*)::int INTO v_count FROM public.blog_bookmarks WHERE post_slug = _slug;
    RETURN jsonb_build_object('saved', true, 'count', v_count);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_bookmarks()
RETURNS TABLE(post_slug TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT post_slug, created_at
    FROM public.blog_bookmarks
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.track_tool_launch(
  _tool_slug TEXT,
  _source_kind TEXT DEFAULT NULL,
  _source_slug TEXT DEFAULT NULL,
  _cta_id TEXT DEFAULT NULL,
  _persona TEXT DEFAULT NULL,
  _anon_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _tool_slug IS NULL OR length(_tool_slug) = 0 THEN RETURN; END IF;
  INSERT INTO public.tool_launch_events(
    tool_slug, source_kind, source_slug, cta_id, persona, user_id, anon_id, metadata
  ) VALUES (
    _tool_slug, _source_kind, _source_slug, _cta_id, _persona, auth.uid(), _anon_id, COALESCE(_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.track_cta_event(
  _cta_id TEXT,
  _kind TEXT,
  _source_slug TEXT DEFAULT NULL,
  _target_slug TEXT DEFAULT NULL,
  _persona TEXT DEFAULT NULL,
  _anon_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _cta_id IS NULL OR length(_cta_id) = 0 THEN RETURN; END IF;
  IF _kind NOT IN ('impression', 'click') THEN RETURN; END IF;
  INSERT INTO public.cta_events(
    cta_id, kind, source_slug, target_slug, persona, user_id, anon_id, metadata
  ) VALUES (
    _cta_id, _kind, _source_slug, _target_slug, _persona, auth.uid(), _anon_id, COALESCE(_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.most_launched_tools(_limit INT DEFAULT 6, _since TIMESTAMPTZ DEFAULT now() - interval '30 days')
RETURNS TABLE(tool_slug TEXT, launches BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tool_slug, COUNT(*)::bigint
    FROM public.tool_launch_events
   WHERE created_at >= _since
   GROUP BY tool_slug
   ORDER BY 2 DESC
   LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.most_saved_posts(_limit INT DEFAULT 6)
RETURNS TABLE(post_slug TEXT, saves BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT post_slug, COUNT(*)::bigint
    FROM public.blog_bookmarks
   GROUP BY post_slug
   ORDER BY 2 DESC
   LIMIT _limit;
$$;
