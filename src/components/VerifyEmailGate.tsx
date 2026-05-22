import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * useRequireVerifiedEmail
 * -----------------------
 * Call `requireVerified()` before any privileged action (AI run, search,
 * export). Returns true when the user's email is confirmed, otherwise
 * surfaces a toast and returns false. The persistent VerificationOverlay
 * is what actually guides the user through verification — this hook is
 * just an inline guard for action handlers.
 */
export function useRequireVerifiedEmail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const verified = !!user?.email_confirmed_at;

  const requireVerified = () => {
    if (verified) return true;
    toast({
      title: "Verify your email to continue",
      description: "Open the verification banner at the top of the page to resend the link or check your status.",
      variant: "destructive",
    });
    return false;
  };

  return { verified, requireVerified };
}