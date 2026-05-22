import type { User } from "@supabase/supabase-js";

type ProfileLike = {
  verification_status?: string | null;
  verification_deadline?: string | null;
} | null;

export type RestrictionReason =
  | "email_unverified"
  | "pending"
  | "suspended"
  | "flagged"
  | "expired"
  | "profile_missing";

export function getRestrictionReason(user: User | null, profile: ProfileLike, profileLoading = false): RestrictionReason | null {
  if (!user) return null;
  if (!user.email_confirmed_at) return "email_unverified";
  if (!profile) return profileLoading ? null : "profile_missing";

  const status = profile.verification_status ?? "pending";
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