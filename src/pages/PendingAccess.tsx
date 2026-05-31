import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useAccountAccess } from "@/hooks/useAccountAccess";

export default function PendingAccess() {
  const { signOut } = useAuth();
  const { referenceId } = useAccountAccess();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Helmet><title>Pending review · HustleAI</title><meta name="robots" content="noindex" /></Helmet>
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 space-y-5 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6 text-amber-600" />
        </div>
        <h1 className="text-xl font-semibold">Your request is under review.</h1>
        <p className="text-sm text-muted-foreground">
          We'll email you as soon as your account is approved. Thanks for your patience.
        </p>
        {referenceId && (
          <div className="text-xs bg-muted rounded-md px-3 py-2 font-mono">
            Reference: {referenceId}
          </div>
        )}
        <Button variant="outline" className="w-full" onClick={async () => { await signOut(); navigate("/", { replace: true }); }}>
          Sign out
        </Button>
      </div>
    </div>
  );
}