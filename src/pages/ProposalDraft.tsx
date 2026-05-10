import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  FileText, Loader2, Copy, RefreshCw, Rocket, Crown, Star,
  Sparkles, CheckCircle, Zap, Lock, ClipboardPaste, Wand2, Send,
} from "lucide-react";
import { getMaxUses, getUsage, bumpUsage, awardXP } from "@/lib/tool-limits";
import { AIToolHero } from "@/components/tools/AIToolHero";
import { FullscreenTextarea } from "@/components/ai/FullscreenTextarea";
import { StickyGenerateBar } from "@/components/ai/StickyGenerateBar";

const tones = [
  { value: "Professional", label: "Professional", icon: "💼" },
  { value: "Friendly", label: "Friendly & Warm", icon: "😊" },
  { value: "Confident", label: "Bold & Confident", icon: "💪" },
  { value: "Technical", label: "Technical & Detailed", icon: "🔧" },
];

const focuses = [
  { value: "ROI and results", label: "ROI & Results" },
  { value: "Speed and efficiency", label: "Speed & Efficiency" },
  { value: "Quality and attention to detail", label: "Quality & Detail" },
  { value: "Creativity and innovation", label: "Creativity & Innovation" },
  { value: "Cost-effectiveness", label: "Cost-Effectiveness" },
];

export default function ProposalDraft() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState("Professional");
  const [focus, setFocus] = useState("ROI and results");
  const [proposal, setProposal] = useState("");
  const [generating, setGenerating] = useState(false);

  const isEligible = profile && ["pro", "elite", "infinity"].includes(profile.subscription_tier);
  const tier = profile?.subscription_tier || "free";
  const maxUses = getMaxUses(tier);
  const [usageCount, setUsageCount] = useState(0);
  useEffect(() => { if (user) setUsageCount(getUsage("proposal", user.id)); }, [user]);
  const atLimit = usageCount >= maxUses;

  const handleGenerate = async () => {
    if (atLimit) { toast({ title: `Limit reached (${maxUses}/${maxUses})`, description: "Upgrade for more uses.", variant: "destructive" }); return; }
    if (!jobDescription.trim() || jobDescription.trim().length < 10) {
      toast({ title: "Too short", description: "Please enter a more detailed job description (at least 10 characters).", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setProposal("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposal-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          job_description: jobDescription,
          tone,
          focus,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to generate proposal");

      setProposal(result.proposal);
      setUsageCount(bumpUsage("proposal", user!.id));
      awardXP(user!.id, 10);
      toast({ title: "Proposal generated! ✨" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const copyProposal = () => {
    navigator.clipboard.writeText(proposal);
    toast({ title: "Copied!", description: "Proposal copied to clipboard." });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <AIToolHero
          eyebrow="AI Proposal Generator"
          title={<>Win the gig with a <span className="text-gradient">personalized pitch.</span></>}
          subtitle="Paste a job description and we'll craft a tailored proposal in seconds — using your profile, the client's tone and a focus angle proven to lift response rates by ~34%."
          Icon={FileText}
          accent="from-indigo-500 via-blue-500 to-sky-500"
          requires="Pro+"
          tier={tier.toUpperCase()}
          usage={{ used: usageCount, max: maxUses }}
          steps={[
            { icon: ClipboardPaste, label: "Paste the job", sub: "Upwork, LinkedIn, email — paste the brief verbatim." },
            { icon: Wand2, label: "Pick tone & angle", sub: "Professional, friendly, bold — and a focus that converts." },
            { icon: Send, label: "Send within minutes", sub: "Edit, copy, hit send. Be the first quality reply in the inbox." },
          ]}
          stats={[
            { value: "~34%", label: "Response lift" },
            { value: "<300", label: "Words / proposal" },
            { value: "4 tones", label: "5 focus angles" },
          ]}
        />

        {!isEligible ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl p-10 text-center max-w-lg mx-auto"
          >
            <Rocket className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">Pro+ Feature</h2>
            <p className="text-muted-foreground mb-6">
              Upgrade to Pro or higher to unlock the AI Proposal Generator.
            </p>
            <Button onClick={() => navigate("/payment")} className="bg-gradient-primary text-primary-foreground">
              Upgrade Now
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Input Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-display font-bold">Job Description</h2>
              </div>
              <FullscreenTextarea
                value={jobDescription}
                onChange={setJobDescription}
                placeholder="Paste the job description here... e.g. 'Looking for a web developer to build a React dashboard with analytics...'"
                rows={6}
                fullscreenTitle="Job description"
                ariaLabel="Job description"
                className="min-h-[160px] text-sm"
              />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tones.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Focus On</label>
                  <Select value={focus} onValueChange={setFocus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {focuses.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <span>Your profile name & bio are automatically included for personalization.</span>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || jobDescription.trim().length < 10}
                className="w-full bg-gradient-primary text-primary-foreground h-12 text-base"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Crafting your proposal...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Generate Proposal
                  </>
                )}
              </Button>
            </motion.div>

            {/* Output Section */}
            {proposal && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h2 className="font-display font-bold">Your Proposal</h2>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyProposal}>
                      <Copy className="w-4 h-4 mr-1" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                      <RefreshCw className={`w-4 h-4 mr-1 ${generating ? "animate-spin" : ""}`} /> Regenerate
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl p-5 space-y-4">
                  {proposal.split("\n\n").map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  <span>Generated with Gemini AI • Tip: Edit and personalize further before sending</span>
                </div>
              </motion.div>
            )}

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="font-display font-bold text-sm mb-3">💡 Pro Tips for Winning Proposals</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span>Always customize the generated proposal with specific examples from your portfolio</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span>Reference a specific detail from the job post to show you actually read it</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span>Keep your final proposal under 300 words — clients prefer concise pitches</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span>Include a clear call-to-action: suggest a quick call or ask a smart question</span>
                </li>
              </ul>
            </motion.div>
          </div>
        )}
      </main>
      <Footer />
      {isEligible && (
        <StickyGenerateBar
          status={
            generating
              ? <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Crafting…</span>
              : <span>{usageCount}/{maxUses} used today</span>
          }
          action={
            <Button
              onClick={handleGenerate}
              disabled={generating || atLimit || jobDescription.trim().length < 10}
              className="w-full bg-gradient-primary text-primary-foreground h-11 active:scale-95"
              size="sm"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : atLimit ? <><Lock className="w-4 h-4 mr-1.5" /> Limit</> : <><Zap className="w-4 h-4 mr-1.5" /> Generate</>}
            </Button>
          }
        />
      )}
    </div>
  );
}
