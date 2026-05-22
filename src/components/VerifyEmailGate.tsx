import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * Soft modal — auto-shows once per session on dashboard / app pages
 * if the user hasn't verified their email yet.
 * Dismissible once, then any locked feature can call `useEmailVerified()`
 * to know whether to block the action.
 */
export function VerifyEmailGate() {
  return null;
}

/**
 * Returns { verified, requireVerified } — call requireVerified() before
 * running a search or AI tool. If the user isn't verified it shows a
 * toast + opens the gate modal and returns false.
 */
export function useRequireVerifiedEmail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const verified = !!user?.email_confirmed_at;

  const requireVerified = () => {
    if (verified) return true;
    toast({
      title: "Verify your email first",
      description: "Use the verification shell to resend or refresh your status.",
      variant: "destructive",
    });
    return false;
  };

  return { verified, requireVerified };
}