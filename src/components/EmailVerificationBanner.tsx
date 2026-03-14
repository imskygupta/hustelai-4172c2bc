import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  email: string;
}

export function EmailVerificationBanner({ email }: Props) {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const resendVerification = async () => {
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: AUTH_EMAIL_REDIRECT_TO },
    });
    setSending(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verification email sent!", description: "Check your inbox and spam folder." });
    }
  };

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">Email not verified</p>
          <p className="text-xs text-destructive/80">Please verify your email to access all features.</p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={resendVerification} disabled={sending}
        className="ml-auto border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0">
        {sending ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Mail className="w-3 h-3 mr-1" />}
        {sending ? "Sending..." : "Resend Link"}
      </Button>
    </div>
  );
}
