import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  subscription_tier: "free" | "pro" | "elite" | "infinity";
  search_count: number;
  is_verified: boolean;
  xp_points: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, referralCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshFailCount = useRef(0);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (data) setProfile(data as Profile);
    } catch {
      // Silently handle profile fetch errors
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const clearStaleSession = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
    // Clear any stale tokens from storage to stop the refresh loop
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Storage access may fail
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "TOKEN_REFRESHED") {
          refreshFailCount.current = 0;
        }

        if (event === "SIGNED_OUT") {
          clearStaleSession();
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            if (mounted) fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error || !session) {
        // If getSession fails, clear stale data
        if (error) {
          console.warn("Session expired, clearing auth state");
          clearStaleSession();
        } else {
          setLoading(false);
        }
        return;
      }
      setSession(session);
      setUser(session.user);
      fetchProfile(session.user.id);
      setLoading(false);
    }).catch(() => {
      if (mounted) clearStaleSession();
    });

    // Safety: catch unhandled refresh failures to prevent crash loops
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message || event.reason || "");
      if (msg.includes("Lock broken") || msg.includes("refresh_token")) {
        event.preventDefault();
        refreshFailCount.current++;
        if (refreshFailCount.current > 3) {
          console.warn("Too many auth refresh failures, signing out");
          clearStaleSession();
          supabase.auth.signOut().catch(() => {});
        }
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearStaleSession();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
