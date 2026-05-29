-- Tighten service-only RLS policies that were using permissive `true` predicates.
-- Public INSERT policies for newsletter/contact/telemetry are intentional and remain unchanged.

-- workspace_artifacts: previously ALL with USING(true)/WITH CHECK(true) — restrict to service_role.
DROP POLICY IF EXISTS "artifacts_service_all" ON public.workspace_artifacts;
CREATE POLICY "artifacts_service_all"
  ON public.workspace_artifacts
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- runtime_extraction_metrics: service insert/update were unscoped — restrict to service_role.
DROP POLICY IF EXISTS "service insert metrics" ON public.runtime_extraction_metrics;
CREATE POLICY "service insert metrics"
  ON public.runtime_extraction_metrics
  AS PERMISSIVE
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "service update metrics" ON public.runtime_extraction_metrics;
CREATE POLICY "service update metrics"
  ON public.runtime_extraction_metrics
  AS PERMISSIVE
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);