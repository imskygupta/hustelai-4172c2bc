import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import NextActionCard from "./NextActionCard";
import type { NextActionTrigger } from "@/lib/nextActions/registry";

const VALID_TRIGGERS: NextActionTrigger[] = [
  "proposal_exported",
  "invoice_exported",
  "contract_exported",
  "doc_exported",
  "telegram_connected",
  "workspace_created",
  "onboarding_completed",
  "ai_generation_completed",
];

/**
 * Surfaces a single contextual NextActionCard based on the user's most
 * recent activation event. Renders nothing when there's no recent trigger
 * (so the dashboard stays calm for inactive sessions).
 */
export default function RecentNextAction({ className }: { className?: string }) {
  const { user } = useAuth();
  const [trigger, setTrigger] = useState<NextActionTrigger | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!user) { setLoaded(true); return; }
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("activation_events")
          .select("event_key,occurred_at")
          .eq("user_id", user.id)
          .in("event_key", VALID_TRIGGERS as string[])
          .order("occurred_at", { ascending: false })
          .limit(1);
        if (!alive) return;
        const row = data?.[0];
        if (row && VALID_TRIGGERS.includes(row.event_key)) {
          setTrigger(row.event_key as NextActionTrigger);
        }
      } catch { /* silent */ }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  if (!loaded || !trigger) return null;
  return (
    <NextActionCard
      trigger={trigger}
      surface="dashboard.recent_next_action"
      headline="Continue your last workflow"
      className={className}
    />
  );
}
