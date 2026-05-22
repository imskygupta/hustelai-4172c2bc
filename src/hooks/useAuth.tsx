import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import { identify, resetAnalytics } from "@/lib/analytics";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";
import type { User, Session } from "@supabase/supabase-js";
import { reportAuthAnomaly } from "@/lib/auth/telemetry";
import { broadcastSignout, subscribeAuthBroadcast } from "@/lib/auth/crossTab";
import { isWorkspaceHost } from "@/lib/host";
import { failOpen, retryWithTimeout } from "@/lib/async/timeout";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  subscription_tier: "free" | "pro" | "elite" | "infinity";
  search_count: number;
  is_verified: boolean;
  xp_points: number;
  onboarding_completed?: boolean;
  onboarding?: any;
  verification_status?: "pending" | "verified" | "suspended" | "flagged";
  verification_deadline?: string | null;
  verified_at?: string | null;
  restricted_reason?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signUp: (email: string, password: string, displayName: string, referralCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
const AUTH_BRIDGE_COOKIE = "hai_auth_bridge";
const AUTH_DEBUG_KEY = "hustleai_auth_debug";

type BridgeSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
};

function authDebugEnabled() {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("authdebug") === "1") {
      localStorage.setItem(AUTH_DEBUG_KEY, "1");
      return true;
    }
    return localStorage.getItem(AUTH_DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

function authDebug(event: string, details: Record<string, unknown> = {}) {
  if (!authDebugEnabled()) return;
  console.info(`[auth] ${event}`, {
    host: typeof window !== "undefined" ? window.location.hostname : "server",
    path: typeof window !== "undefined" ? window.location.pathname : "",
    ...details,
  });
}

function bridgeCookieDomain() {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname.toLowerCase();
  return host === "hustlaiapp.in" || host.endsWith(".hustlaiapp.in") ? "; Domain=.hustlaiapp.in" : "";
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function writeBridgeSession(session: Session) {
  if (typeof document === "undefined") return;
  try {
    const payload: BridgeSession = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    };
    const maxAge = Math.max(60, (session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) - Math.floor(Date.now() / 1000));
    document.cookie = `${AUTH_BRIDGE_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure${bridgeCookieDomain()}`;
    authDebug("bridge.write", { hasAccessToken: !!payload.access_token, hasRefreshToken: !!payload.refresh_token, expires_at: payload.expires_at });
  } catch (err) {
    authDebug("bridge.write_failed", { error: err instanceof Error ? err.message : String(err) });
  }
}

function clearBridgeSession() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_BRIDGE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure${bridgeCookieDomain()}`;
  authDebug("bridge.clear");
}

function hasLocalSupabaseSession() {
  if (typeof localStorage === "undefined") return false;
  try {
    return Object.keys(localStorage).some((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));
  } catch {
    return false;
  }
}

async function consumeSessionHashIfPresent() {
  if (typeof window === "undefined" || !window.location.hash.includes("access_token=")) return;
  let hadTokens = false;
  let setOk = false;
  try {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token") || "";
    const refresh_token = hash.get("refresh_token") || "";
    if (!access_token || !refresh_token) return;
    hadTokens = true;
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    authDebug("hash.hydrate", { ok: !error, error: error?.message, type: hash.get("type") });
    setOk = !error;
    if (error) {
      reportAuthAnomaly("auth.invalid_handoff", { error: error.message });
    }
  } catch (err) {
    authDebug("hash.hydrate_failed", { error: err instanceof Error ? err.message : String(err) });
    if (hadTokens) reportAuthAnomaly("auth.invalid_handoff", { error: err instanceof Error ? err.message : String(err) });
  } finally {
    // ALWAYS strip the magic-link hash from the URL — even on failure — so
    // a poisoned token never lingers in the address bar or history.
    try {
      if (window.location.hash.includes("access_token=")) {
        window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
      }
    } catch { /* ignore */ }
    if (hadTokens && !setOk && isWorkspaceHost()) {
      // Bad handoff on workspace surface — bounce to expired recovery instead
      // of looping the portal.
      try {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/?expired=1&next=${next}`);
      } catch { /* ignore */ }
    }
  }
}

async function hydrateFromBridgeIfNeeded() {
  if (typeof window === "undefined" || hasLocalSupabaseSession()) return;
  const raw = readCookie(AUTH_BRIDGE_COOKIE);
  if (!raw) {
    authDebug("bridge.read", { found: false });
    return;
  }

  try {
    const bridged = JSON.parse(raw) as BridgeSession;
    authDebug("bridge.read", {
      found: true,
      hasAccessToken: !!bridged.access_token,
      hasRefreshToken: !!bridged.refresh_token,
      expires_at: bridged.expires_at,
    });
    if (bridged.access_token && bridged.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: bridged.access_token,
        refresh_token: bridged.refresh_token,
      });
      authDebug("bridge.hydrate", { ok: !error, error: error?.message });
    }
  } catch (err) {
    authDebug("bridge.hydrate_failed", { error: err instanceof Error ? err.message : String(err) });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const refreshFailCount = useRef(0);
  const hydratedRef = useRef(false);
  const signedOutTimestamps = useRef<number[]>([]);
  const profileRequestRef = useRef<Promise<void> | null>(null);
  const lastProfileFetchAtRef = useRef(0);

  const fetchProfile = async (userId: string, email?: string | null, emailConfirmed = false, force = false) => {
    const now = Date.now();
    if (!force && profileRequestRef.current && now - lastProfileFetchAtRef.current < 1_500) {
      return profileRequestRef.current;
    }
    lastProfileFetchAtRef.current = now;
    const fallbackProfile: Profile = {
      id: userId,
      user_id: userId,
      display_name: email?.split("@")[0] ?? "Hustler",
      email: email ?? null,
      subscription_tier: "free",
      search_count: 0,
      is_verified: false,
      xp_points: 0,
      onboarding_completed: true,
      verification_status: emailConfirmed ? "verified" : "pending",
      verification_deadline: null,
      verified_at: emailConfirmed ? new Date().toISOString() : null,
    };
    setProfileLoading(true);
    const task = (async () => {
    try {
      const { data } = await failOpen(
        () => retryWithTimeout(
          () => supabase.from("profiles").select("*").eq("user_id", userId).single(),
          "auth.fetchProfile",
          { timeoutMs: 5_000, retries: 1 },
        ),
        { data: fallbackProfile } as any,
        "auth.fetchProfile",
        { timeoutMs: 5_000, retries: 0 },
      );
      if (data) {
        setProfile(data as Profile);
        identify(userId, {
          email: data.email,
          tier: data.subscription_tier,
        });
        setSentryUser({ id: userId, email: data.email, tier: data.subscription_tier });
      }
    } catch {
      // Silently handle profile fetch errors
    } finally {
      setProfileLoading(false);
      profileRequestRef.current = null;
    }
    })();
    profileRequestRef.current = task;
    return task;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.email, !!user.email_confirmed_at, true);
  };

  const applySession = (nextSession: Session | null, source: string) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    authDebug("session.apply", {
      source,
      hasSession: !!nextSession,
      userId: nextSession?.user?.id,
      expires_at: nextSession?.expires_at,
    });

    if (nextSession?.user) {
      writeBridgeSession(nextSession);
      setTimeout(() => fetchProfile(nextSession.user.id, nextSession.user.email, !!nextSession.user.email_confirmed_at), 0);
    } else {
      setProfile(null);
      setProfileLoading(false);
    }
  };

  const clearAuthState = ({ clearStorage = false, clearBridge = false }: { clearStorage?: boolean; clearBridge?: boolean } = {}) => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileLoading(false);
    setLoading(false);
    if (clearBridge) clearBridgeSession();
    if (!clearStorage) return;
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          localStorage.removeItem(key);
        }
      }
      authDebug("session.storage_cleared");
    } catch {
      // Storage access may fail
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!mounted) return;
        authDebug("state_change", { event, hasSession: !!nextSession, userId: nextSession?.user?.id });

        if (event === "TOKEN_REFRESHED") {
          refreshFailCount.current = 0;
          if (nextSession) writeBridgeSession(nextSession);
          authDebug("token.refresh", { ok: !!nextSession, expires_at: nextSession?.expires_at });
        }

        if (event === "SIGNED_OUT") {
          // Login-loop detector: 4+ SIGNED_OUT events within 30s indicates a
          // poisoned state. Fire anomaly so operators see it.
          const now = Date.now();
          signedOutTimestamps.current = [
            ...signedOutTimestamps.current.filter((t) => now - t < 30_000),
            now,
          ];
          if (signedOutTimestamps.current.length >= 4) {
            reportAuthAnomaly("auth.login_loop", { count: signedOutTimestamps.current.length });
            signedOutTimestamps.current = [];
          }
          clearAuthState({ clearStorage: true, clearBridge: true });
          return;
        }

        applySession(nextSession, `event:${event}`);
        if (hydratedRef.current) setLoading(false);
      }
    );

    // Cross-tab / cross-host signout propagation. When any tab signs out,
    // mirror the local state here without calling supabase.signOut() again
    // (which would cascade and reload-storm).
    const unsubBroadcast = subscribeAuthBroadcast((msg) => {
      if (msg.type === "signout" || msg.type === "expired") {
        clearAuthState({ clearStorage: true, clearBridge: true });
      }
    });

    (async () => {
      try {
        await failOpen(() => consumeSessionHashIfPresent(), undefined, "auth.consumeSessionHash", { timeoutMs: 5_000, retries: 0 });
        await failOpen(() => hydrateFromBridgeIfNeeded(), undefined, "auth.hydrateBridge", { timeoutMs: 5_000, retries: 0 });
        const { data: { session: initialSession }, error } = await failOpen(
          () => retryWithTimeout(() => supabase.auth.getSession(), "auth.getSession", { timeoutMs: 5_000, retries: 1 }),
          { data: { session: null }, error: new Error("Auth session unavailable") } as any,
          "auth.getSession",
        );
        if (!mounted) return;

        authDebug("token.read", {
          ok: !error,
          hasSession: !!initialSession,
          userId: initialSession?.user?.id,
          error: error?.message,
        });

        if (initialSession) {
          applySession(initialSession, "getSession");
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        if (!mounted) return;
        authDebug("token.read_failed", { error: err instanceof Error ? err.message : String(err) });
        // Do not clear persisted tokens on hydration/network failures. Route guards
        // should wait for hydration and then send the user to auth if needed.
      } finally {
        if (mounted) {
          hydratedRef.current = true;
          setLoading(false);
        }
      }
    })();

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message || event.reason || "");
      if (msg.includes("Lock broken") || msg.includes("refresh_token")) {
        event.preventDefault();
        refreshFailCount.current++;
        authDebug("token.refresh_error", { count: refreshFailCount.current, message: msg });
        if (refreshFailCount.current > 3) {
          console.warn("Too many auth refresh failures, signing out");
          reportAuthAnomaly("auth.refresh_failure_spike", { count: refreshFailCount.current, message: msg.slice(0, 160) });
          clearAuthState({ clearStorage: true, clearBridge: true });
          supabase.auth.signOut().catch(() => {});
          broadcastSignout();
          // On the workspace surface, bounce to the calm recovery screen
          // instead of letting route guards bounce to /login in a loop.
          if (isWorkspaceHost()) {
            try {
              const next = encodeURIComponent(window.location.pathname + window.location.search);
              window.location.replace(`/?expired=1&next=${next}`);
            } catch { /* ignore */ }
          }
        }
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      unsubBroadcast();
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const signUp = async (email: string, password: string, displayName: string, referralCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, referral_code: referralCode || "" },
        emailRedirectTo: AUTH_EMAIL_REDIRECT_TO,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.session) writeBridgeSession(data.session);
    authDebug("sign_in", { ok: !error, hasSession: !!data.session, userId: data.user?.id, error: error?.message });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthState({ clearStorage: true, clearBridge: true });
    broadcastSignout();
    resetAnalytics();
    clearSentryUser();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
