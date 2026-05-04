import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, CheckCircle, Sparkles, Lock, Send, Trophy, Globe, Shield } from "lucide-react";
import { motion } from "framer-motion";

const PLATFORMS = ["AI Training", "Data Labeling", "Remote Writing", "Remote Dev", "QA / Review"];

export default function SureHitJobs() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [previous, setPrevious] = useState<any[]>([]);

  const [form, setForm] = useState({
    full_name: profile?.display_name || "",
    email: profile?.email || "",
    phone: "",
    primary_skill: "",
    experience_years: "1-3",
    expected_hourly_rate: "",
    portfolio_url: "",
    linkedin_url: "",
    preferred_platforms: [] as string[],
    availability: "Part-time (10-20 hrs/wk)",
    about: "",
  });

  const tier = profile?.subscription_tier || "free";
  const isPremium = ["pro", "elite", "infinity"].includes(tier);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        full_name: f.full_name || profile.display_name || "",
        email: f.email || profile.email || "",
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("job_opportunity_submissions")
      .select("id, primary_skill, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPrevious(data || []));
  }, [user, submittedId]);

  const togglePlatform = (p: string) => {
    setForm((f) => ({
      ...f,
      preferred_platforms: f.preferred_platforms.includes(p)
        ? f.preferred_platforms.filter((x) => x !== p)
        : [...f.preferred_platforms, p],
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPremium) {
      toast({ title: "Upgrade required", description: "Sure-Hit Jobs is for Pro+ members.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("job-opportunity-submit", { body: form });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSubmittedId(data.id);
      toast({ title: "Application received! 🎯", description: "Akash personally reviews each one. You'll hear back within 48h." });
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-20 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-10"
        >
          <Badge className="bg-gradient-primary text-primary-foreground px-3 py-1">🎯 Premium Exclusive</Badge>
          <h1 className="text-3xl md:text-5xl font-display font-bold">
            <span className="text-gradient">Sure-Hit Jobs</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Skip cold applications. Get directly referred to vetted remote opportunities by the HustleAI team.
            Real high-paying remote gigs — direct invites only, no public listings.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground"><Trophy className="w-4 h-4 text-yellow-500" /> $20–$50/hr roles</div>
            <div className="flex items-center gap-1.5 text-muted-foreground"><Globe className="w-4 h-4 text-primary" /> Remote, global</div>
            <div className="flex items-center gap-1.5 text-muted-foreground"><Shield className="w-4 h-4 text-emerald-500" /> Vetted by HustleAI Team</div>
          </div>
        </motion.div>

        {!isPremium ? (
          <div className="glass rounded-2xl p-10 text-center space-y-4 border-yellow-500/20">
            <Lock className="w-12 h-12 mx-auto text-yellow-500" />
            <h2 className="text-xl font-semibold">Pro members only</h2>
            <p className="text-muted-foreground">Unlock direct job referrals and priority review.</p>
            <Button onClick={() => navigate("/plans")} className="bg-gradient-primary text-primary-foreground">
              Upgrade to Pro <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : submittedId ? (
          <div className="glass rounded-2xl p-10 text-center space-y-4 border-emerald-500/30">
            <CheckCircle className="w-16 h-16 mx-auto text-emerald-500" />
            <h2 className="text-2xl font-semibold">You're in the pipeline!</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Our team personally reviews every application. Expect a referral invite via email within 24-48 hours
              if you match a current opening. Check spam too 📧
            </p>
            <Button variant="outline" onClick={() => { setSubmittedId(null); }}>Submit another profile</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="glass rounded-2xl p-6 md:p-8 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone (WhatsApp preferred)</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" />
              </div>
              <div className="space-y-2">
                <Label>Primary Skill *</Label>
                <Input required value={form.primary_skill} onChange={(e) => setForm({ ...form, primary_skill: e.target.value })} placeholder="e.g. Python, AI Training, Writing" />
              </div>
              <div className="space-y-2">
                <Label>Experience *</Label>
                <Select value={form.experience_years} onValueChange={(v) => setForm({ ...form, experience_years: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-1">0-1 years</SelectItem>
                    <SelectItem value="1-3">1-3 years</SelectItem>
                    <SelectItem value="3-5">3-5 years</SelectItem>
                    <SelectItem value="5+">5+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Hourly Rate (USD)</Label>
                <Input value={form.expected_hourly_rate} onChange={(e) => setForm({ ...form, expected_hourly_rate: e.target.value })} placeholder="e.g. $25/hr" />
              </div>
              <div className="space-y-2">
                <Label>Portfolio URL</Label>
                <Input value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} placeholder="https://…" />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn URL</Label>
                <Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/…" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Preferred Work Type (you'll be referred where you fit)</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button type="button" key={p} onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        form.preferred_platforms.includes(p)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/50"
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Availability</Label>
                <Select value={form.availability} onValueChange={(v) => setForm({ ...form, availability: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Part-time (10-20 hrs/wk)">Part-time (10-20 hrs/wk)</SelectItem>
                    <SelectItem value="Full-time (40+ hrs/wk)">Full-time (40+ hrs/wk)</SelectItem>
                    <SelectItem value="Project-based">Project-based</SelectItem>
                    <SelectItem value="Weekends only">Weekends only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>About you (1-2 sentences)</Label>
                <Textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={3}
                  placeholder="Tell Akash why you'd be a great fit. Highlight your strongest project." />
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-11 bg-gradient-primary text-primary-foreground">
              {submitting ? "Submitting..." : (<><Send className="w-4 h-4 mr-2" /> Submit for Personal Referral</>)}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              By submitting, you allow the HustleAI team to refer you internally to vetted partners.
              No fees. No spam.
            </p>
          </form>
        )}

        {previous.length > 0 && (
          <div className="mt-8 glass rounded-2xl p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Briefcase className="w-4 h-4" /> Your applications</h3>
            {previous.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-secondary/30">
                <div>
                  <div className="font-medium">{p.primary_skill}</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                </div>
                <Badge variant={p.status === "invited" ? "default" : "secondary"}>{p.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}