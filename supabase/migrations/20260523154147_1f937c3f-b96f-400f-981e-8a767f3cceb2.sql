
-- 1. api_runtime_config: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Runtime config is publicly readable" ON public.api_runtime_config;
CREATE POLICY "Runtime config readable by authenticated"
  ON public.api_runtime_config
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. email_templates: scope SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone authenticated can read active templates" ON public.email_templates;
CREATE POLICY "Authenticated can read active templates"
  ON public.email_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 3. forum_posts: remove broad UPDATE; add owner-only update; add vote RPC
DROP POLICY IF EXISTS "Authenticated can update vote counts" ON public.forum_posts;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='forum_posts' AND policyname='Owners can update own posts'
  ) THEN
    CREATE POLICY "Owners can update own posts"
      ON public.forum_posts
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.increment_forum_post_vote(_post_id uuid, _delta_up int, _delta_down int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _delta_up NOT IN (-1,0,1) OR _delta_down NOT IN (-1,0,1) THEN
    RAISE EXCEPTION 'Invalid vote delta';
  END IF;
  UPDATE public.forum_posts
     SET upvotes = GREATEST(0, COALESCE(upvotes,0) + _delta_up),
         downvotes = GREATEST(0, COALESCE(downvotes,0) + _delta_down)
   WHERE id = _post_id;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_forum_post_vote(uuid,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_forum_post_vote(uuid,int,int) TO authenticated;

-- 4. newsletter_subscribers: remove open UPDATE; add token-based unsubscribe RPC
DROP POLICY IF EXISTS "Public can unsubscribe via token" ON public.newsletter_subscribers;

CREATE OR REPLACE FUNCTION public.unsubscribe_newsletter(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows int;
BEGIN
  IF _token IS NULL OR length(_token) < 8 THEN
    RETURN false;
  END IF;
  UPDATE public.newsletter_subscribers
     SET is_active = false,
         status = 'unsubscribed'
   WHERE unsubscribe_token::text = _token
     AND COALESCE(is_active, true) = true;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.unsubscribe_newsletter(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unsubscribe_newsletter(text) TO anon, authenticated;

-- 5. runtime_extraction_metrics: restrict writes to service_role only
DROP POLICY IF EXISTS "service insert metrics" ON public.runtime_extraction_metrics;
DROP POLICY IF EXISTS "service update metrics" ON public.runtime_extraction_metrics;
CREATE POLICY "service insert metrics"
  ON public.runtime_extraction_metrics
  FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "service update metrics"
  ON public.runtime_extraction_metrics
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. side_hustles: remove broad UPDATE; add likes RPC
DROP POLICY IF EXISTS "Authenticated can update likes" ON public.side_hustles;

CREATE OR REPLACE FUNCTION public.increment_side_hustle_like(_hustle_id uuid, _delta_like int, _delta_dislike int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _delta_like NOT IN (-1,0,1) OR _delta_dislike NOT IN (-1,0,1) THEN
    RAISE EXCEPTION 'Invalid delta';
  END IF;
  UPDATE public.side_hustles
     SET likes = GREATEST(0, COALESCE(likes,0) + _delta_like),
         dislikes = GREATEST(0, COALESCE(dislikes,0) + _delta_dislike)
   WHERE id = _hustle_id;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_side_hustle_like(uuid,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_side_hustle_like(uuid,int,int) TO authenticated;

-- 7. user_achievements: remove cross-user SELECT policy
DROP POLICY IF EXISTS "Authenticated can read achievements" ON public.user_achievements;
