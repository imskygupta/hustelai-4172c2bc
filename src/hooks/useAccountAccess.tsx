import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AccountAccessStatus =
  | "loading"
  | "active"
  | "pending_approval"
  | "suspended"
  | "banned"
  | "deleted"
  | "error";

export interface AccountAccessState {
  status: AccountAccessStatus;
  reason: string | null;
  referenceId: string | null;
  changedAt: string | null;
  refresh: () => Promise<void>;
}

const AccountAccessContext = createContext<AccountAccessState>({
  status: "loading",
  reason: null,
  referenceId: null,
  changedAt: null,
  refresh: async () => {},
});

const POLL_MS = 5 * 60 * 1000; // 5-min fallback poll
const TIMEOUT_MS = 8_000;       // terminal error if no answer

export function AccountAccessProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const [state, setState] = useState<Omit<AccountAccessState, "refresh">>({
    status: "loading",
    reason: null,
    referenceId: null,
    changedAt: null,
  });
  const lastUserIdRef = useRef<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!user) {
      setState({ status: "active", reason: null, referenceId: null, changedAt: null });
      return;
    }
    try {
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("timeout") }), TIMEOUT_MS),
      );
      const { data, error } = (await Promise.race([
        supabase.rpc("get_account_access_state"),
        timeoutPromise,
      ])) as any;
      if (error) {
        setState({ status: "error", reason: null, referenceId: null, changedAt: null });
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        // profile not yet created — treat as active so new users don't get locked out
        setState({ status: "active", reason: null, referenceId: null, changedAt: null });
        return;
      }
      const isDeleted = !!row.deleted_at;
      const status: AccountAccessStatus = isDeleted
        ? "deleted"
        : (row.status as AccountAccessStatus) ?? "active";
      setState({
        status,
        reason: row.reason ?? null,
        referenceId: row.reference_id ?? null,
        changedAt: row.changed_at ?? row.deleted_at ?? null,
      });
    } catch {
      setState({ status: "error", reason: null, referenceId: null, changedAt: null });
    }
  }, [user]);

  // Initial + on auth change
  useEffect(() => {
    if (authLoading) return;
    if (user?.id !== lastUserIdRef.current) {
      lastUserIdRef.current = user?.id ?? null;
      setState((s) => ({ ...s, status: "loading" }));
    }
    void fetchState();
  }, [authLoading, user?.id, fetchState]);

  // Realtime listener on own profile row — primary signal for instant lockout
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`account-access-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => { void fetchState(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, fetchState]);

  // Window focus + poll fallback
  useEffect(() => {
    if (!user) return;
    const onFocus = () => { void fetchState(); };
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => { void fetchState(); }, POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [user, fetchState]);

  // Hard signout when status flips to a locked state
  useEffect(() => {
    if (!user) return;
    if (state.status === "suspended" || state.status === "deleted" || state.status === "banned") {
      // Don't blow away local session immediately — we want the lockout page to render with
      // referenceId. The page itself offers a sign-out button. But revoke server-side.
      void supabase.auth.signOut({ scope: "global" } as any).catch(() => {});
    }
  }, [state.status, user, signOut]);

  return (
    <AccountAccessContext.Provider value={{ ...state, refresh: fetchState }}>
      {children}
    </AccountAccessContext.Provider>
  );
}

export function useAccountAccess() {
  return useContext(AccountAccessContext);
}