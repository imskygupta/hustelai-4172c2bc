import { supabase } from "@/integrations/supabase/client";
import { captureException } from "@/lib/sentry";

/**
 * Thin client for the `work-api` edge function.
 * Reads stay direct (cheap); only writes go through the API for validation + consistency.
 */
async function call<T = any>(body: any): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke("work-api", { body });
    if (error) throw new Error(error.message || "Request failed");
    if (data?.error) throw new Error(data.error);
    return data as T;
  } catch (e) {
    captureException(e, { area: "work-api", kind: body?.kind });
    throw e;
  }
}

export const workApi = {
  invoice: {
    create: (p: { client_name: string; service: string; amount: number; due_date?: string | null; notes?: string | null; client_email?: string | null }) =>
      call({ kind: "invoice.create", ...p }),
    setStatus: (id: string, status: "pending" | "paid" | "overdue") =>
      call({ kind: "invoice.update_status", id, status }),
    delete: (id: string) => call({ kind: "invoice.delete", id }),
  },
  checklist: {
    create: (p: { title: string; template: string; tasks: { label: string; done: boolean }[] }) =>
      call({ kind: "checklist.create", ...p }),
    updateTasks: (id: string, tasks: { label: string; done: boolean }[]) =>
      call({ kind: "checklist.update_tasks", id, tasks }),
    delete: (id: string) => call({ kind: "checklist.delete", id }),
  },
  daily: {
    upsert: (p: { log_date: string; proposals_sent: number; leads_found: number; clients_contacted: number; notes?: string | null }) =>
      call({ kind: "daily.upsert", ...p }),
  },
};