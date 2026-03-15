import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RESET_PASSWORD_REDIRECT_TO } from "@/lib/auth-config";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { User, Upload, FileText, Lock, MapPin, Phone, Mail, Crown, Shield, Trash2, Key, Settings, Gift, CreditCard, Package, Receipt } from "lucide-react";
import { VerificationSection } from "@/components/VerificationSection";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";

type ProfileTab = "general" | "security" | "account" | "billing";

export default function Profile() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("general");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [userPayments, setUserPayments] = useState<any[]>([]);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const referredBy = (profile as any)?.referred_by;

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio((profile as any).bio || "");
      setPhone((profile as any).phone || "");
      setAddress((profile as any).address || "");
    }
  }, [profile]);

  useEffect(() => {
    if (user && activeTab === "billing") {
      loadBillingData();
    }
  }, [user, activeTab]);

  const loadBillingData = async () => {
    if (!user) return;
    setLoadingBilling(true);
    const [payRes, ordRes] = await Promise.all([
      supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (payRes.data) setUserPayments(payRes.data);
    if (ordRes.data) setUserOrders(ordRes.data);
    setLoadingBilling(false);
  };

  const isPremium = profile && ["pro", "elite", "infinity"].includes(profile.subscription_tier as string);
  const isElite = profile && ["elite", "infinity"].includes(profile.subscription_tier as string);
  const emailVerified = user?.email_confirmed_at != null;

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio,
        phone: isPremium ? phone : undefined,
        address: isPremium ? address : undefined,
      } as any)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile Updated!" });
      refreshProfile();
    }
    setSaving(false);
  };

  const applyCouponCode = async () => {
    if (!couponCode.trim() || !user) return;
    if (referredBy) {
      toast({ title: "Already applied", description: "You have already used a referral code.", variant: "destructive" });
      return;
    }
    setApplyingCoupon(true);
    try {
      // Find referrer by code
      const { data: referrer } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", couponCode.trim())
        .single();

      if (!referrer) {
        toast({ title: "Invalid code", description: "This referral/coupon code doesn't exist.", variant: "destructive" });
        setApplyingCoupon(false);
        return;
      }

      if (referrer.user_id === user.id) {
        toast({ title: "Can't use your own code", variant: "destructive" });
        setApplyingCoupon(false);
        return;
      }

      // Set referred_by on profile
      await supabase.from("profiles").update({ referred_by: referrer.user_id } as any).eq("user_id", user.id);

      // Create referral record
      await supabase.from("referrals").insert({
        referrer_id: referrer.user_id,
        referred_user_id: user.id,
        referral_code: couponCode.trim(),
        status: "converted",
        reward_type: "search_credit",
        reward_amount: 1,
        converted_at: new Date().toISOString(),
      });

      // Credit referrer
      const { data: refProfile } = await supabase.from("profiles").select("referral_credits").eq("user_id", referrer.user_id).single();
      await supabase.from("profiles").update({ referral_credits: ((refProfile as any)?.referral_credits || 0) + 1 } as any).eq("user_id", referrer.user_id);

      // Log earning
      await supabase.from("affiliate_earnings").insert({
        affiliate_id: referrer.user_id,
        source_user_id: user.id,
        amount: 1,
        type: "search_credit",
        description: "Referral coupon applied post-signup",
      });

      toast({ title: "Coupon Applied! 🎉", description: "Referral linked successfully." });
      setCouponCode("");
      refreshProfile();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setApplyingCoupon(false);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `${user.id}/${file.name}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("profiles").update({ resume_url: path } as any).eq("user_id", user.id);
      toast({ title: "Resume Uploaded!", description: isElite ? "Our tech team will review it soon." : "AI analysis available for Elite users." });
      refreshProfile();
    }
    setUploading(false);
  };

  const handleDeleteAccount = () => {
    window.location.href = "mailto:contact@hustlaiapp.in?subject=Account Deletion Request&body=I would like to delete my HustleAI account. My email: " + encodeURIComponent(user?.email || "");
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-primary font-display text-xl">Loading...</div>
    </div>;
  }

  const tabs: { key: ProfileTab; label: string; icon: any }[] = [
    { key: "general", label: "General", icon: User },
    { key: "security", label: "Security", icon: Shield },
    { key: "account", label: "Account", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass rounded-2xl p-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-display font-bold">{profile?.display_name || "My Profile"}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={
                    profile?.subscription_tier === "infinity" ? "bg-gradient-primary text-primary-foreground" :
                    profile?.subscription_tier === "elite" ? "bg-accent/20 text-accent" :
                    profile?.subscription_tier === "pro" ? "bg-primary/20 text-primary" :
                    "bg-secondary text-secondary-foreground"
                  }>
                    {profile?.subscription_tier}
                  </Badge>
                  {emailVerified ? (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">✓ Verified</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">✗ Unverified</Badge>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {!emailVerified && <EmailVerificationBanner email={user?.email || ""} />}

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-secondary/30 rounded-xl p-1">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* General Tab */}
          {activeTab === "general" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="glass rounded-2xl p-8 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
                  <Input value={profile?.email || ""} disabled className="opacity-60" />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                    {!isPremium && <Badge variant="outline" className="text-[10px] ml-1"><Lock className="w-2 h-2 mr-0.5" /> Pro+</Badge>}
                  </Label>
                  {isPremium ? (
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
                  ) : (
                    <Input disabled placeholder="Upgrade to Pro to add phone" className="opacity-40" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Address
                    {!isPremium && <Badge variant="outline" className="text-[10px] ml-1"><Lock className="w-2 h-2 mr-0.5" /> Pro+</Badge>}
                  </Label>
                  {isPremium ? (
                    <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your address..." />
                  ) : (
                    <Textarea disabled placeholder="Upgrade to Pro to add address" className="opacity-40" />
                  )}
                </div>
                <Button onClick={saveProfile} disabled={saving} className="w-full bg-gradient-primary text-primary-foreground">
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>

              {/* Coupon / Referral Code Section */}
              <div className="glass rounded-2xl p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Gift className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-display font-bold">Coupon / Referral Code</h2>
                </div>
                {referredBy ? (
                  <div className="flex items-center gap-2 text-primary text-sm">
                    <Gift className="w-4 h-4" /> Referral code already applied ✓
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Have a coupon or referral code from a friend? Apply it here (one-time only).
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="e.g. HA-abc12345"
                        className="flex-1"
                      />
                      <Button onClick={applyCouponCode} disabled={applyingCoupon || !couponCode.trim()}>
                        {applyingCoupon ? "Applying..." : "Apply"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Resume Section */}
              <div className="glass rounded-2xl p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-display font-bold">Resume</h2>
                  {!isPremium && <Badge variant="outline" className="text-[10px]"><Lock className="w-2 h-2 mr-0.5" /> Pro+</Badge>}
                </div>
                {isPremium ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {isElite ? "Upload your resume — our tech experts will personally review it." : "Upload your resume — AI will analyze it."}
                    </p>
                    {(profile as any)?.resume_url && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <FileText className="w-4 h-4" /> <span>Resume uploaded ✓</span>
                      </div>
                    )}
                    <label className="cursor-pointer block">
                      <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/30 transition-colors">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload PDF/DOCX (max 5MB)"}</p>
                      </div>
                      <input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
                    </label>
                    {isElite && (
                      <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="w-4 h-4 text-accent" />
                          <span className="font-semibold text-sm">Elite Perk: Personal Review</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Our tech team will review your resume within 48 hours.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 opacity-50">
                    <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Upgrade to Pro or Elite to upload and analyze your resume</p>
                  </div>
                )}
              </div>

              <VerificationSection />
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="glass rounded-2xl p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Key className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-display font-bold">Password</h2>
                </div>
                <p className="text-sm text-muted-foreground">Need to change your password? We'll send a reset link to your email.</p>
                <Button variant="outline" onClick={async () => {
                  const { error } = await supabase.auth.resetPasswordForEmail(user?.email || "", {
                    redirectTo: RESET_PASSWORD_REDIRECT_TO,
                  });
                  if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                  else toast({ title: "Reset link sent!", description: "Check your email." });
                }}>
                  <Mail className="w-4 h-4 mr-2" /> Send Password Reset Link
                </Button>
              </div>

              <div className="glass rounded-2xl p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-display font-bold">Email Verification</h2>
                </div>
                {emailVerified ? (
                  <div className="flex items-center gap-2 text-primary text-sm">
                    <Shield className="w-4 h-4" /> Your email is verified ✓
                  </div>
                ) : (
                  <EmailVerificationBanner email={user?.email || ""} />
                )}
              </div>
            </motion.div>
          )}

          {/* Account Tab */}
          {activeTab === "account" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="glass rounded-2xl p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-display font-bold">Account Settings</h2>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong className="text-foreground">Account Type:</strong> {profile?.subscription_tier?.toUpperCase()}</p>
                  <p><strong className="text-foreground">Member Since:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</p>
                  <p><strong className="text-foreground">XP Points:</strong> {profile?.xp_points}</p>
                  <p><strong className="text-foreground">Search Credits:</strong> {(profile as any)?.referral_credits || 0}</p>
                </div>
              </div>

              <div className="glass rounded-2xl p-8 space-y-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-destructive" /> Sign Out / Delete Account
                </h3>
                <Button variant="outline" onClick={async () => { await signOut(); navigate("/"); }}>
                  Sign Out
                </Button>
                <div className="border-t border-border/50 pt-4 space-y-3">
                  {!showDeleteConfirm ? (
                    <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete My Account
                    </Button>
                  ) : (
                    <div className="bg-destructive/10 rounded-xl p-4 space-y-3 border border-destructive/20">
                      <p className="text-sm text-destructive font-medium">⚠️ This action is irreversible</p>
                      <p className="text-xs text-muted-foreground">
                        To delete your account, please send an email to <strong>contact@hustlaiapp.in</strong> from your registered email address requesting account deletion.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-destructive text-destructive-foreground" onClick={handleDeleteAccount}>
                          <Mail className="w-3 h-3 mr-1" /> Send Email
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
