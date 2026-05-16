import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AutomationRow = {
  id: string;
  template_id: string;
  enabled: boolean;
  last_run_at: string | null;
};

export type AutomationRun = {
  id: string;
  template_id: string;
  status: string;
  summary: string | null;
  created_at: string;
};

export function useAutomations() {
  const [rows, setRows] = useState<AutomationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRows([]); setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("workspace_automations")
      .select("id, template_id, enabled, last_run_at")
      .eq("user_id", user.id);
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (template_id: string, enabled: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // optimistic
    setRows(prev => {
      const existing = prev.find(r => r.template_id === template_id);
      if (existing) return prev.map(r => r.template_id === template_id ? { ...r, enabled } : r);
      return [...prev, { id: `tmp-${template_id}`, template_id, enabled, last_run_at: null }];
    });
    await (supabase as any)
      .from("workspace_automations")
      .upsert({ user_id: user.id, template_id, enabled }, { onConflict: "user_id,template_id" });
    load();
  }, [load]);

  const enabledSet = new Set(rows.filter(r => r.enabled).map(r => r.template_id));
  return { rows, enabledSet, loading, toggle, reload: load };
}

export function useAutomationRuns(limit = 12) {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await (supabase as any)
        .from("automation_runs")
        .select("id, template_id, status, summary, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!cancelled) { setRuns(data || []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return { runs, loading };
}