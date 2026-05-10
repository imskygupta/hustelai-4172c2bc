
CREATE OR REPLACE FUNCTION public.ai_jobs_user_cost_breakdown(
  _since timestamptz DEFAULT now() - interval '7 days',
  _limit integer DEFAULT 50
) RETURNS TABLE(
  user_id uuid,
  total_jobs bigint,
  succeeded bigint,
  failed bigint,
  retries bigint,
  tokens_in bigint,
  tokens_out bigint,
  cost_units numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT j.user_id,
         COUNT(*)::bigint,
         COUNT(*) FILTER (WHERE j.status='succeeded')::bigint,
         COUNT(*) FILTER (WHERE j.status='failed')::bigint,
         COALESCE(SUM(GREATEST(j.attempt - 1, 0)), 0)::bigint,
         COALESCE(SUM(j.tokens_input), 0)::bigint,
         COALESCE(SUM(j.tokens_output), 0)::bigint,
         COALESCE(SUM(j.cost_units), 0)::numeric
    FROM public.ai_jobs j
   WHERE j.created_at >= _since
     AND public.has_role(auth.uid(),'admin')
   GROUP BY j.user_id
   ORDER BY 8 DESC NULLS LAST
   LIMIT _limit;
$$;
