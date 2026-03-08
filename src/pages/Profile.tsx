import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { User, Upload, FileText, Lock, MapPin, Phone, Mail, Crown } from "lucide-react";
import { VerificationSection } from "@/components/VerificationSection";

export default function Profile() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const isPremium = profile && ["pro", "elite", "infinity"].includes(profile.subscription_tier as string);
  const isElite = profile && ["elite", "infinity"].includes(profile.subscription_tier as string);

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

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-primary font-display text-xl">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-2xl space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold">My Profile</h1>
                  <Badge className={
                    profile?.subscription_tier === "infinity" ? "bg-gradient-primary text-primary-foreground" :
                    profile?.subscription_tier === "elite" ? "bg-accent/20 text-accent" :
                    profile?.subscription_tier === "pro" ? "bg-primary/20 text-primary" :
                    "bg-secondary text-secondary-foreground"
                  }>
                    {profile?.subscription_tier}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
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

                {/* Premium fields */}
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
            </div>
          </motion.div>

          {/* Resume Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="glass rounded-2xl p-8 space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-display font-bold">Resume</h2>
                {!isPremium && <Badge variant="outline" className="text-[10px]"><Lock className="w-2 h-2 mr-0.5" /> Pro+</Badge>}
              </div>

              {isPremium ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {isElite
                      ? "Upload your resume — our tech experts will personally review it and provide feedback."
                      : "Upload your resume — AI will analyze it and provide improvement suggestions."}
                  </p>
                  {(profile as any)?.resume_url && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <FileText className="w-4 h-4" />
                      <span>Resume uploaded ✓</span>
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/30 transition-colors">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {uploading ? "Uploading..." : "Click to upload PDF/DOCX (max 5MB)"}
                        </p>
                      </div>
                      <input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
                    </label>
                  </div>
                  {isElite && (
                    <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-accent" />
                        <span className="font-semibold text-sm">Elite Perk: Personal Review</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Our tech team will review your resume within 48 hours and provide personalized feedback.
                      </p>
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
          </motion.div>

          {/* Verification Section */}
          <VerificationSection />
        </div>
      </div>
    </div>
  );
}
