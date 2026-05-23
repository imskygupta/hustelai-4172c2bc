// React hook wrapper around getRuntimeSession(). Subscribes to Supabase auth
// state so the snapshot is always coherent across tabs and refreshes.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getRuntimeSession,
  invalidateRuntimeSession,
  type RuntimeSession,
} from "./session";

export function useRuntimeSession() {
  const [snapshot, setSnapshot] = useState<RuntimeSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async (force = false) => {
      const snap = await getRuntimeSession({ force });
      if (alive) {
        setSnapshot(snap);
        setLoading(false);
      }
    };
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      invalidateRuntimeSession();
      void load(true);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { snapshot, loading, refresh: () => getRuntimeSession({ force: true }).then(setSnapshot) };
}