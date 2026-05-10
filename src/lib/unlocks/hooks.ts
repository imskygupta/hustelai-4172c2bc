import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUnlockSummary, getUnlockPacks } from "./api";
import type { UnlockBalance, UnlockPack, UnlockSummary } from "./types";

export function useUnlockSummary() {
  const [summary, setSummary] = useState<UnlockSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) { setSummary({ balances: [], recent: [] }); return; }
      setSummary(await getUnlockSummary(u.user.id));
    } catch { setSummary({ balances: [], recent: [] }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { summary, loading, refresh };
}

export function useUnlockBalance(meter: string, feature = "*"): { balance: UnlockBalance | null; loading: boolean } {
  const { summary, loading } = useUnlockSummary();
  const balance = summary?.balances.find(
    (b) => b.meter === meter && (b.feature === feature || b.feature === "*"),
  ) ?? null;
  return { balance, loading };
}

export function useUnlockPacks(meter?: string, feature?: string) {
  const [packs, setPacks] = useState<UnlockPack[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try { const p = await getUnlockPacks(meter, feature); if (alive) setPacks(p); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [meter, feature]);
  return { packs, loading };
}