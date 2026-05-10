
CREATE OR REPLACE FUNCTION public.feature_flags_incident_recorder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;

  -- Kill switch toggled
  IF COALESCE(OLD.kill_switch, false) IS DISTINCT FROM COALESCE(NEW.kill_switch, false) THEN
    IF NEW.kill_switch THEN
      INSERT INTO public.feature_flag_incidents(flag_key, kind, severity, actor_id, message)
      VALUES (NEW.feature_key, 'kill_switch_on', 'critical', auth.uid(),
              'Kill switch activated for ' || NEW.feature_key);
    ELSE
      UPDATE public.feature_flag_incidents
         SET resolved_at = now()
       WHERE flag_key = NEW.feature_key
         AND kind = 'kill_switch_on'
         AND resolved_at IS NULL;
      INSERT INTO public.feature_flag_incidents(flag_key, kind, severity, actor_id, message)
      VALUES (NEW.feature_key, 'kill_switch_off', 'info', auth.uid(),
              'Kill switch cleared for ' || NEW.feature_key);
    END IF;
  END IF;

  -- Maintenance toggled
  IF COALESCE(OLD.maintenance, false) IS DISTINCT FROM COALESCE(NEW.maintenance, false) THEN
    IF NEW.maintenance THEN
      INSERT INTO public.feature_flag_incidents(flag_key, kind, severity, actor_id, message, metadata)
      VALUES (NEW.feature_key, 'maintenance_on', 'warning', auth.uid(),
              'Maintenance mode enabled for ' || NEW.feature_key,
              jsonb_build_object('message', NEW.maintenance_message));
    ELSE
      UPDATE public.feature_flag_incidents
         SET resolved_at = now()
       WHERE flag_key = NEW.feature_key
         AND kind = 'maintenance_on'
         AND resolved_at IS NULL;
      INSERT INTO public.feature_flag_incidents(flag_key, kind, severity, actor_id, message)
      VALUES (NEW.feature_key, 'maintenance_off', 'info', auth.uid(),
              'Maintenance mode cleared for ' || NEW.feature_key);
    END IF;
  END IF;

  -- Flag disabled outright
  IF COALESCE(OLD.enabled, true) IS DISTINCT FROM COALESCE(NEW.enabled, true) AND NEW.enabled = false THEN
    INSERT INTO public.feature_flag_incidents(flag_key, kind, severity, actor_id, message)
    VALUES (NEW.feature_key, 'flag_disabled', 'warning', auth.uid(),
            'Flag disabled: ' || NEW.feature_key);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feature_flags_incidents ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_incidents
AFTER UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.feature_flags_incident_recorder();
