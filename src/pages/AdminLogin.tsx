import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email required", description: "Enter your admin email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      toast({ title: "Access Denied", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Code Sent", description: "Check your email for the login code." });
      setStep("otp");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (error) {
      toast({ title: "Invalid Code", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Check if user has admin role
    if (data.user) {
      const { data: roleData } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      if (roleData) {
        navigate("/admin-dashboard");
      } else {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "You are not authorized to access the admin panel.", variant: "destructive" });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold">Admin Access</h1>
          <p className="text-sm text-muted-foreground">Authorized personnel only</p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Enter admin email"
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-destructive text-destructive-foreground" disabled={loading}>
              {loading ? "Sending Code..." : "Send Login Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              A login code has been sent to your email. Enter it below.
            </p>
            <div className="space-y-2">
              <Label>Login Code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  type="text"
                  placeholder="Enter 6-digit code"
                  className="pl-10 text-center tracking-widest text-lg"
                  maxLength={6}
                  autoComplete="off"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-destructive text-destructive-foreground" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Access"}
            </Button>
            <button
              type="button"
              onClick={() => { setStep("email"); setOtp(""); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
