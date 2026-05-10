import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Resolve whether the current user has a connected Telegram integration. */
export function useTelegramConnection() {
  const [state, setState] = useState<{ connected: boolean; loading: boolean; chatId: string | null }>({
    connected: false, loading: true, chatId: null,
  });
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { if (alive) setState({ connected: false, loading: false, chatId: null }); return; }
      const { data } = await (supabase as any).from("notification_integrations")
        .select("provider_chat_id, status")
        .eq("user_id", u.user.id)
        .eq("provider", "telegram")
        .eq("status", "connected")
        .maybeSingle();
      if (!alive) return;
      setState({
        connected: !!data?.provider_chat_id,
        loading: false,
        chatId: data?.provider_chat_id || null,
      });
    })();
    return () => { alive = false; };
  }, []);
  return state;
}
