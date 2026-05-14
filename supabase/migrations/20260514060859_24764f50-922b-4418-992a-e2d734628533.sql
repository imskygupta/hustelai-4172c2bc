ALTER TABLE public.seo_blog_posts
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS read_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS trending_score numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS seo_blog_posts_trending_idx
  ON public.seo_blog_posts (trending_score DESC, last_viewed_at DESC NULLS LAST)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS seo_blog_posts_views_idx
  ON public.seo_blog_posts (view_count DESC)
  WHERE status = 'published';

CREATE OR REPLACE FUNCTION public.bump_blog_view(_slug text, _kind text DEFAULT 'view')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decay numeric;
BEGIN
  IF _slug IS NULL OR length(_slug) = 0 THEN
    RETURN;
  END IF;

  -- Time-decayed trending score: recent views weigh more.
  -- Each new view adds 1.0; existing score decays with age (half-life ~3 days).
  UPDATE public.seo_blog_posts
     SET view_count = CASE WHEN _kind = 'read' THEN view_count ELSE view_count + 1 END,
         read_count = CASE WHEN _kind = 'read' THEN read_count + 1 ELSE read_count END,
         last_viewed_at = now(),
         trending_score = LEAST(
           9999,
           (CASE WHEN last_viewed_at IS NULL THEN 0
                 ELSE trending_score * exp(-greatest(0, EXTRACT(EPOCH FROM (now() - last_viewed_at))) / 259200.0)
            END) + (CASE WHEN _kind = 'read' THEN 2.0 ELSE 1.0 END)
         )
   WHERE slug = _slug
     AND status = 'published';
END;
$$;

REVOKE ALL ON FUNCTION public.bump_blog_view(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.bump_blog_view(text, text) TO anon, authenticated;