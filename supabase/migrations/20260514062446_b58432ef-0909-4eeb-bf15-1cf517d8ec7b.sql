
CREATE OR REPLACE FUNCTION public.operator_pulse(_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_views_today INT;
  v_reads_today INT;
  v_bookmarks_24h INT;
  v_launches_24h INT;
  v_distinct_7d INT;
  v_last_bookmark TIMESTAMPTZ;
  v_total_bookmarks INT;
BEGIN
  IF _slug IS NULL OR length(_slug) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COUNT(*) INTO v_views_today
    FROM public.blog_events
   WHERE post_slug = _slug AND kind = 'view'
     AND created_at >= date_trunc('day', now());

  SELECT COUNT(*) INTO v_reads_today
    FROM public.blog_events
   WHERE post_slug = _slug AND kind = 'read'
     AND created_at >= date_trunc('day', now());

  SELECT COUNT(*) INTO v_bookmarks_24h
    FROM public.blog_bookmarks
   WHERE post_slug = _slug AND created_at >= now() - interval '24 hours';

  SELECT COUNT(*) INTO v_launches_24h
    FROM public.tool_launch_events
   WHERE source_slug = _slug AND source_kind = 'blog'
     AND created_at >= now() - interval '24 hours';

  SELECT COUNT(DISTINCT COALESCE(user_id::text, anon_id, '')) INTO v_distinct_7d
    FROM public.blog_events
   WHERE post_slug = _slug AND kind IN ('view','read')
     AND created_at >= now() - interval '7 days';

  SELECT MAX(created_at) INTO v_last_bookmark
    FROM public.blog_bookmarks WHERE post_slug = _slug;

  SELECT COUNT(*) INTO v_total_bookmarks
    FROM public.blog_bookmarks WHERE post_slug = _slug;

  RETURN jsonb_build_object(
    'views_today', COALESCE(v_views_today,0),
    'reads_today', COALESCE(v_reads_today,0),
    'bookmarks_24h', COALESCE(v_bookmarks_24h,0),
    'launches_24h', COALESCE(v_launches_24h,0),
    'distinct_7d', COALESCE(v_distinct_7d,0),
    'total_bookmarks', COALESCE(v_total_bookmarks,0),
    'last_bookmark_at', v_last_bookmark
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.operator_pulse_global()
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_guides INT;
  v_launches_today INT;
  v_saves_today INT;
  v_views_today INT;
BEGIN
  SELECT COUNT(DISTINCT post_slug) INTO v_active_guides
    FROM public.blog_events
   WHERE kind IN ('view','read')
     AND created_at >= now() - interval '24 hours';

  SELECT COUNT(*) INTO v_launches_today
    FROM public.tool_launch_events
   WHERE created_at >= date_trunc('day', now());

  SELECT COUNT(*) INTO v_saves_today
    FROM public.blog_bookmarks
   WHERE created_at >= date_trunc('day', now());

  SELECT COUNT(*) INTO v_views_today
    FROM public.blog_events
   WHERE kind = 'view'
     AND created_at >= date_trunc('day', now());

  RETURN jsonb_build_object(
    'active_guides', COALESCE(v_active_guides,0),
    'launches_today', COALESCE(v_launches_today,0),
    'saves_today', COALESCE(v_saves_today,0),
    'views_today', COALESCE(v_views_today,0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.post_performance(_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_views INT; v_reads INT; v_bookmarks INT;
  v_cta_imp INT; v_cta_click INT; v_launches INT;
  v_distinct_total INT; v_distinct_returning INT;
  v_top_persona TEXT;
  v_engagement NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _slug IS NULL OR length(_slug) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COUNT(*) INTO v_views FROM public.blog_events WHERE post_slug = _slug AND kind = 'view';
  SELECT COUNT(*) INTO v_reads FROM public.blog_events WHERE post_slug = _slug AND kind = 'read';
  SELECT COUNT(*) INTO v_bookmarks FROM public.blog_bookmarks WHERE post_slug = _slug;

  SELECT COUNT(*) INTO v_cta_imp
    FROM public.cta_events WHERE source_slug = _slug AND kind = 'impression';
  SELECT COUNT(*) INTO v_cta_click
    FROM public.cta_events WHERE source_slug = _slug AND kind = 'click';
  SELECT COUNT(*) INTO v_launches
    FROM public.tool_launch_events WHERE source_slug = _slug;

  -- Returning visitor estimate: identifiers seen on >=2 distinct days
  WITH ids AS (
    SELECT COALESCE(user_id::text, anon_id, '') AS who, date_trunc('day', created_at) AS d
      FROM public.blog_events
     WHERE post_slug = _slug AND kind IN ('view','read')
  )
  SELECT
    COUNT(DISTINCT who),
    COUNT(*) FILTER (WHERE who_count >= 2)
  INTO v_distinct_total, v_distinct_returning
  FROM (
    SELECT who, COUNT(DISTINCT d) AS who_count
      FROM ids WHERE who <> '' GROUP BY who
  ) z;

  SELECT persona INTO v_top_persona
    FROM public.tool_launch_events
   WHERE source_slug = _slug AND persona IS NOT NULL
   GROUP BY persona ORDER BY COUNT(*) DESC LIMIT 1;

  v_engagement := (
    COALESCE(v_views,0) * 1.0 +
    COALESCE(v_reads,0) * 2.5 +
    COALESCE(v_bookmarks,0) * 6.0 +
    COALESCE(v_cta_click,0) * 4.0 +
    COALESCE(v_launches,0) * 10.0
  );

  RETURN jsonb_build_object(
    'views', v_views,
    'reads', v_reads,
    'bookmarks', v_bookmarks,
    'cta_impressions', v_cta_imp,
    'cta_clicks', v_cta_click,
    'cta_ctr', CASE WHEN v_cta_imp > 0 THEN ROUND((v_cta_click::numeric / v_cta_imp) * 100, 2) ELSE 0 END,
    'tool_launches', v_launches,
    'conversion_pct', CASE WHEN v_views > 0 THEN ROUND((v_launches::numeric / v_views) * 100, 2) ELSE 0 END,
    'returning_pct', CASE WHEN v_distinct_total > 0 THEN ROUND((v_distinct_returning::numeric / v_distinct_total) * 100, 2) ELSE 0 END,
    'distinct_visitors', v_distinct_total,
    'top_persona', v_top_persona,
    'engagement_score', ROUND(v_engagement, 1)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.recommend_next_tools(_slug TEXT, _limit INT DEFAULT 4)
RETURNS TABLE(tool_slug TEXT, launches BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tool_slug, COUNT(*)::bigint
    FROM public.tool_launch_events
   WHERE source_slug = _slug
   GROUP BY tool_slug
   ORDER BY 2 DESC
   LIMIT _limit;
$$;
