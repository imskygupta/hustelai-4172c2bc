import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string, referralCode?: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, referral_code: referralCode || "" },
        emailRedirectTo: window.location.origin,
      },
    });
    // If signup succeeded and there's a referral code, track the referral
    if (!error && data.user && referralCode) {
      // Find the referrer by their referral code
      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", referralCode)
        .single();
      if (referrerProfile) {
        // Create a referral record
        await supabase.from("referrals").insert({
          referrer_id: referrerProfile.user_id,
          referred_user_id: data.user.id,
          referral_code: referralCode,
          status: "converted",
          reward_type: "search_credit",
          reward_amount: 1,
          converted_at: new Date().toISOString(),
        });
        // Award 1 search credit to referrer
        await supabase.from("profiles")
          .update({ referral_credits: 1 })
          .eq("referral_code", referralCode);
        // Log the earning
        await supabase.from("affiliate_earnings").insert({
          affiliate_id: referrerProfile.user_id,
          source_user_id: data.user.id,
          amount: 1,
          type: "search_credit",
          description: "Referral signup credit",
        });
      }
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
