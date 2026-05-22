import type { User } from "@supabase/supabase-js";

export type ProfileLike = {
  verification_status?: string | null;
  verification_deadline?: string | null;
} | null;

export type RestrictionReason =
  | "email_unverified"
  | "pending"
  | "suspended"
  | "flagged"
  | "expired"
  | "security_review"
  | "profile_missing";

export type TrustState = Readonly<{
  ready: boolean;
  authenticated: boolean;
  emailVerified: boolean;
  profileResolved: boolean;
  restricted: boolean;
  reason: RestrictionReason | null;
  verificationStatus: string | null;
  deadlineExpired: boolean;
}>;

export function getRestrictionReason(user: User | null, profile: ProfileLike, profileLoading = false): RestrictionReason | null {
  if (!user) return null;
  if (!user.email_confirmed_at) return "email_unverified";
  if (!profile) return profileLoading ? null : "profile_missing";

  const status = profile.verification_status ?? "pending";
  if (status === "restricted_security_review") return "security_review";
  if (status !== "verified") {
    if (status === "pending" && profile.verification_deadline && new Date(profile.verification_deadline).getTime() < Date.now()) {
      return "expired";
    }
    return (status as RestrictionReason) || "pending";
  }

  return null;
}

export function isRestrictedUser(user: User | null, profile: ProfileLike, profileLoading = false): boolean {
  return getRestrictionReason(user, profile, profileLoading) !== null;
}

export function resolveTrustState({
  user,
  profile,
  loading,
  profileLoading,
}: {
  user: User | null;
  profile: ProfileLike;
  loading: boolean;
  profileLoading: boolean;
}): TrustState {
  const authenticated = !!user;
  const emailVerified = !!user?.email_confirmed_at;
  const profileResolved = !authenticated || !emailVerified || !!profile || !profileLoading;
  const ready = !loading && profileResolved;
  const reason = ready ? getRestrictionReason(user, profile, profileLoading) : null;
  const deadlineMs = profile?.verification_deadline ? new Date(profile.verification_deadline).getTime() : 0;

  return Object.freeze({
    ready,
    authenticated,
    emailVerified,
    profileResolved,
    restricted: reason !== null,
    reason,
    verificationStatus: !authenticated
      ? null
      : !emailVerified
        ? "email_unverified"
        : profile?.verification_status ?? (profileLoading ? "loading" : "profile_missing"),
    deadlineExpired: !!deadlineMs && deadlineMs < Date.now(),
  });
}