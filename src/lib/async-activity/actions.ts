import { supabase } from "@/integrations/supabase/client";
import type { AsyncItem } from "./hook";

/** Retry a failed AI job — re-queues for the runner. */
export async function retryAiJob(jobId: string) {
  const { data, error } = await supabase.functions.invoke("ai-job-retry", { body: { job_id: jobId } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

/** Re-trigger Telegram delivery for an export. */
export async function retryExportDelivery(exportId: string) {
  const { data, error } = await supabase.functions.invoke("export-deliver-telegram", { body: { export_id: exportId } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

/**
 * Decide if an item shows a retry affordance, and run the right action.
 * Returns true when retry was attempted.
 */
export function isRetryable(item: AsyncItem): boolean {
  if (item.kind === "ai_job") return item.status === "failed" || item.status === "cancelled";
  if (item.kind === "export") return item.status === "failed";
  return false;
}

export async function retryItem(item: AsyncItem) {
  const realId = item.id.replace(/^job:|^exp:/, "");
  if (item.kind === "ai_job") return retryAiJob(realId);
  if (item.kind === "export") return retryExportDelivery(realId);
  throw new Error("Not retryable");
}