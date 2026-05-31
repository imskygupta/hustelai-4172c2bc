import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export default function AccountStatus() {
  const { status, referenceId } = useAccountAccess();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const headline =
    status === "banned"
      ? "Your HustleAI access has been removed."
      : status === "deleted"
      ? "This account is no longer available."
      : "Your HustleAI access is currently unavailable.";

  const submitUnlock = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_account_unlock_request", { _reason: reason.trim() });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Request submitted", description: "Our team will be in touch." });
    } catch (e: any) {
      toast({ title: "Couldn't submit", description: e?.message ?? "Try again later", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Helmet><title>Account access · HustleAI</title><meta name="robots" content="noindex" /></Helmet>
      <div className="max-w-lg w-full bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">{headline}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          If you believe this is a mistake, contact{" "}
          <a className="underline" href="mailto:support@hustlaiapp.in">support@hustlaiapp.in</a>.
        </p>
        {referenceId && (
          <div className="text-xs bg-muted rounded-md px-3 py-2 font-mono">
            Reference: {referenceId}
          </div>
        )}

        {status !== "banned" && status !== "deleted" && !submitted && (
          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium">Request a review</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us why you think this is a mistake (optional context helps)."
              rows={4}
            />
            <Button onClick={submitUnlock} disabled={submitting || !reason.trim()} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit request"}
            </Button>
          </div>
        )}
        {submitted && (
          <div className="text-sm text-emerald-600 bg-emerald-500/10 rounded-md p-3">
            Your request was received. We'll email you when it's reviewed.
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={handleSignOut}>Sign out</Button>
      </div>
    </div>
  );
}