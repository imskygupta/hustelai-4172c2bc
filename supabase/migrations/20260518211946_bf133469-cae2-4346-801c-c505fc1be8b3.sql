
-- Wave 1: authoritative-state tracking + new queue/incident/replay streams.

ALTER TABLE public.runtime_extraction_streams
  ADD COLUMN IF NOT EXISTS authority_state text NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS fallback_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS parity_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS replay_pressure numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rollback_risk text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS primary_write_disabled_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.runtime_extraction_streams
    ADD CONSTRAINT runtime_extraction_streams_authority_state_check
    CHECK (authority_state IN ('primary','mirror','owned_authoritative','primary_fallback_only','primary_disabled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed new high-churn streams
INSERT INTO public.runtime_extraction_streams (stream, category, posture, owner_db, rail_guarded, critical, est_writes_per_hour, est_bytes_per_write, notes)
VALUES
  ('replay_history',       'queue',     'mirror', 'wguuipsikboqqinqeehv', false, false, 600,  320, 'replay drain outcomes — mirrored from autonomous controller'),
  ('retry_history',        'queue',     'mirror', 'wguuipsikboqqinqeehv', false, false, 400,  256, 'job retry attempts — mirrored from queue/workflow workers'),
  ('incident_history',     'incidents', 'mirror', 'wguuipsikboqqinqeehv', false, false, 60,   512, 'opened/closed incident audit — mirrored from production-incidents'),
  ('lease_contention_log', 'queue',     'mirror', 'wguuipsikboqqinqeehv', false, false, 120,  256, 'worker lease contention — mirrored from telegram worker')
ON CONFLICT (stream) DO NOTHING;

-- Flip non-rail-guarded high-churn ops streams from primary -> mirror so the
-- router begins writing to owned today.
UPDATE public.runtime_extraction_streams
   SET posture='mirror', authority_state='mirror', updated_at=now()
 WHERE rail_guarded = false
   AND posture = 'primary'
   AND category IN ('queue','sweeps','incidents','notifications');

-- Promote already-owned telemetry streams to owned_authoritative tracking
UPDATE public.runtime_extraction_streams
   SET authority_state='owned_authoritative', parity_status='healthy', updated_at=now()
 WHERE posture = 'owned';

-- Updated overview RPC: adds authoritative/still-primary/dual-write/primary-disabled metrics
CREATE OR REPLACE FUNCTION public.runtime_extraction_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_streams int;
  primary_streams int;
  evacuated_streams int;
  authoritative_streams int;
  still_primary_streams int;
  dual_write_risk int;
  primary_disabled_streams int;
  critical_deps int;
  unsafe_writes int;
  hr_writes_owned bigint;
  hr_writes_primary bigint;
  hr_writes_avoided bigint;
  monthly_savings numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT count(*) INTO total_streams FROM public.runtime_extraction_streams;
  SELECT count(*) INTO primary_streams FROM public.runtime_extraction_streams WHERE posture IN ('primary','rollback');
  SELECT count(*) INTO evacuated_streams FROM public.runtime_extraction_streams WHERE posture IN ('owned','mirror','shadow');
  SELECT count(*) INTO authoritative_streams FROM public.runtime_extraction_streams WHERE authority_state IN ('owned_authoritative','primary_disabled');
  SELECT count(*) INTO still_primary_streams FROM public.runtime_extraction_streams WHERE authority_state IN ('primary','mirror') AND posture <> 'owned';
  SELECT count(*) INTO dual_write_risk FROM public.runtime_extraction_streams WHERE posture='mirror' AND authority_state IN ('mirror','primary');
  SELECT count(*) INTO primary_disabled_streams FROM public.runtime_extraction_streams WHERE authority_state='primary_disabled';
  SELECT count(*) INTO critical_deps FROM public.runtime_extraction_streams WHERE critical AND posture='primary';
  SELECT count(*) INTO unsafe_writes FROM public.runtime_hard_dependency_findings WHERE NOT resolved AND severity IN ('high','critical');

  SELECT COALESCE(SUM(routed_owned),0), COALESCE(SUM(routed_primary),0), COALESCE(SUM(writes_avoided),0)
    INTO hr_writes_owned, hr_writes_primary, hr_writes_avoided
    FROM public.runtime_extraction_metrics
    WHERE bucket_minute >= now() - interval '1 hour';

  monthly_savings := (hr_writes_owned + hr_writes_avoided) * 24 * 30 * 0.00000125;

  RETURN jsonb_build_object(
    'primary_dependency_pct',
      CASE WHEN total_streams=0 THEN 100 ELSE round((primary_streams::numeric/total_streams)*100,1) END,
    'operational_independence_pct',
      CASE WHEN total_streams=0 THEN 0 ELSE round((evacuated_streams::numeric/total_streams)*100,1) END,
    'operational_db_independence_pct',
      CASE WHEN total_streams=0 THEN 0 ELSE round((authoritative_streams::numeric/total_streams)*100,1) END,
    'writes_avoided_per_hour', hr_writes_owned + hr_writes_avoided,
    'writes_to_primary_per_hour', hr_writes_primary,
    'projected_monthly_savings_usd', round(monthly_savings, 2),
    'critical_dependency_count', critical_deps,
    'unsafe_direct_write_count', unsafe_writes,
    'total_streams', total_streams,
    'evacuated_streams', evacuated_streams,
    'authoritative_streams', authoritative_streams,
    'still_primary_streams', still_primary_streams,
    'permanent_dual_write_risk', dual_write_risk,
    'primary_writes_removed_streams', primary_disabled_streams,
    'primary_writes_removed_per_hour', hr_writes_avoided
  );
END;
$$;

-- Helper RPC: transition a stream's authoritative state with safety checks.
CREATE OR REPLACE FUNCTION public.runtime_set_authority(_stream text, _state text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  IF _state NOT IN ('primary','mirror','owned_authoritative','primary_fallback_only','primary_disabled') THEN
    RAISE EXCEPTION 'invalid state %', _state;
  END IF;
  SELECT * INTO r FROM public.runtime_extraction_streams WHERE stream=_stream;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown stream %', _stream; END IF;
  IF r.rail_guarded AND _state IN ('owned_authoritative','primary_disabled') THEN
    RAISE EXCEPTION 'stream % is rail-guarded', _stream;
  END IF;

  UPDATE public.runtime_extraction_streams
     SET authority_state = _state,
         posture = CASE _state
           WHEN 'primary' THEN 'primary'
           WHEN 'mirror' THEN 'mirror'
           WHEN 'owned_authoritative' THEN 'owned'
           WHEN 'primary_fallback_only' THEN 'owned'
           WHEN 'primary_disabled' THEN 'owned'
         END,
         fallback_enabled = CASE _state WHEN 'primary_disabled' THEN false ELSE true END,
         primary_write_disabled_at = CASE _state WHEN 'primary_disabled' THEN now() ELSE NULL END,
         updated_at = now()
   WHERE stream = _stream;
END;
$$;
