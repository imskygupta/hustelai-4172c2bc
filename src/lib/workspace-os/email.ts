import { supabase } from "@/integrations/supabase/client";

export type EmailTemplate =
  | "welcome"
  | "magic-link"
  | "password-reset"
  | "workspace-created"
  | "invoice-created"
  | "agreement-approved"
  | "payment-overdue"
  | "client-invite"
  | "subscription-updated"
  | "community-invite"
  | "broadcast"
  | "generic";

export interface SendEmailArgs {
  to: string | string[];
  template: EmailTemplate;
  data?: Record<string, any>;
  subject?: string;
  html?: string;
  from?: "noreply" | "support" | "hello" | "billing" | "connect";
  user_id?: string;
  campaign_id?: string;
  bypass_prefs?: boolean;
}

export async function sendWorkspaceEmail(args: SendEmailArgs) {
  const { data, error } = await supabase.functions.invoke("workspace-email", { body: args });
  if (error) throw error;
  return data;
}