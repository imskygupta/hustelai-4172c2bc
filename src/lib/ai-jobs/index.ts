import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type AiJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "retrying";

export interface AiJob {
  id: string;
  user_id: string | null;
  kind: string;
  status: AiJobStatus;
  input: any;
  output: any;
  error: string | null;
  provider: string | null;
  model: string | null;
  attempt: number;
  max_attempts: number;
  progress: number;
  tokens_input?: number;
  tokens_output?: number;
  cost_units?: number;
  duration_ms?: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface AiJobEvent {
  id: string;
  job_id: string;
  level: "info" | "warn" | "error" | "progress";
  message: string | null;
  data: any;
  created_at: string;
}

export async function enqueueAiJob(opts: {
  kind: string;
  input: any;
  feature?: string;
  priority?: number;
  dedupe_key?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-job-enqueue", { body: opts });
  if (error) throw error;
  return (data as any).job_id;
}

export async function cancelAiJob(jobId: string) {
  const { error } = await supabase.functions.invoke("ai-job-cancel", { body: { job_id: jobId } });
  if (error) throw error;
}

/** Poll a job's status. Returns null until first row available. */
export function useAiJob(jobId: string | null, intervalMs = 1500) {
  const [job, setJob] = useState<AiJob | null>(null);
  const [events, setEvents] = useState<AiJobEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) { setJob(null); setEvents([]); return; }
    let cancelled = false;
    let lastEventTs: string | null = null;

    const fetchOnce = async () => {
      const { data, error } = await sb.from("ai_jobs").select("*").eq("id", jobId).maybeSingle();
      if (cancelled) return;
      if (error) setError(error.message); else setJob(data as AiJob);

      // Pull new events since last seen
      let q = sb.from("ai_job_events").select("*").eq("job_id", jobId).order("created_at", { ascending: true });
      if (lastEventTs) q = q.gt("created_at", lastEventTs);
      const { data: evs } = await q;
      if (!cancelled && evs && evs.length) {
        lastEventTs = (evs[evs.length - 1] as any).created_at;
        setEvents((prev) => [...prev, ...(evs as AiJobEvent[])]);
      }

      if (data && ["succeeded", "failed", "cancelled"].includes((data as any).status)) return true;
      return false;
    };
    let timer: any;
    const loop = async () => {
      const done = await fetchOnce();
      if (!cancelled && !done) timer = setTimeout(loop, intervalMs);
    };
    loop();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [jobId, intervalMs]);

  return { job, events, error };
}
