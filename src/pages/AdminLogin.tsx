import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, KeyRound, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type LoginMethod = "password" | "otp";
type OtpStep = "email" | "otp";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [method, setMethod] = useState<LoginMethod>("password");
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [loading, setLoading] = useState(false);

  const checkAdminAndRedirect = async (userId: string) => {
    const { data: roleData } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (roleData) {
      navigate("/admin-dashboard");
    } else {
      await supabase.auth.signOut();
      toast({ title: "Access Denied", description: "You are not authorized to access the admin panel.", variant: "destructive" });
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Required", description: "Enter email and password.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (data.user) await checkAdminAndRedirect(data.user.id);
    setLoading(false);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email required", description: "Enter your admin email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: AUTH_EMAIL_REDIRECT_TO,
      },
    });
    if (error) {
      toast({ title: "Access Denied", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Code Sent", description: "Check your email for the login code." });
      setOtpStep("otp");
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
    if (data.user) await checkAdminAndRedirect(data.user.id);
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

        {/* Method toggle */}
        <div className="flex rounded-lg bg-muted/30 p-1">
          <button
            onClick={() => { setMethod("password"); setOtpStep("email"); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${method === "password" ? "bg-destructive text-destructive-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Lock className="w-3.5 h-3.5 inline mr-1.5" />Password
          </button>
          <button
            onClick={() => setMethod("otp")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${method === "otp" ? "bg-destructive text-destructive-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <KeyRound className="w-3.5 h-3.5 inline mr-1.5" />OTP / Magic Link
          </button>
        </div>

        {/* Password login */}
        {method === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="pl-10" autoComplete="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"} className="pl-10 pr-10" autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-destructive text-destructive-foreground" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        )}

        {/* OTP login */}
        {method === "otp" && otpStep === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="pl-10" autoComplete="off" />
              </div>
            </div>
            <Button type="submit" className="w-full bg-destructive text-destructive-foreground" disabled={loading}>
              {loading ? "Sending Code..." : "Send Login Code"}
            </Button>
          </form>
        )}

        {method === "otp" && otpStep === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              A login code has been sent to your email. Enter it below.
            </p>
            <div className="space-y-2">
              <Label>Login Code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={otp} onChange={(e) => setOtp(e.target.value)} type="text"
                  placeholder="Enter 6-digit code" className="pl-10 text-center tracking-widest text-lg" maxLength={6} autoComplete="off" />
              </div>
            </div>
            <Button type="submit" className="w-full bg-destructive text-destructive-foreground" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Access"}
            </Button>
            <button type="button" onClick={() => { setOtpStep("email"); setOtp(""); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
