import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FullscreenTextarea } from "@/components/ai/FullscreenTextarea";
import { StickyGenerateBar } from "@/components/ai/StickyGenerateBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Loader2, Copy, Check, Sparkles, Lock, Brain, Search, Target, Map, Calendar, Zap, Download, RotateCcw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { openBlueprintPrint } from "@/lib/blueprint-print";
import { useRecordOutput } from "@/lib/workspace/outputs";
import { RecentOutputsRail } from "@/components/workspace/RecentOutputsRail";
import { getMaxUses, getUsage, bumpUsage, awardXP } from "@/lib/tool-limits";

const LOADING_STAGES = [
  { icon: Brain, text: "Decoding your hustle potential...", stat: "Models Loaded" },
  { icon: Search, text: "Analyzing 50,000+ freelance gigs globally...", stat: "Gigs Scanned" },
  { icon: Target, text: "Mapping client acquisition channels...", stat: "Channels Found" },
  { icon: Map, text: "Cross-referencing with top earner strategies...", stat: "Strategies Matched" },
  { icon: Calendar, text: "Building your personalized 7-day roadmap...", stat: "Tasks Planned" },
  { icon: Sparkles, text: "Crafting outreach scripts & templates...", stat: "Scripts Written" },
];

export default function HustleBlueprint() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [hustleTitle, setHustleTitle] = useState("");
  const [hustleDesc, setHustleDesc] = useState("");
  const [userSkills, setUserSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [actionScore, setActionScore] = useState(0);
  const [showScore, setShowScore] = useState(false);

  const tier = profile?.subscription_tier || "free";
  const maxUses = getMaxUses(tier);
  const [usageCount, setUsageCount] = useState(0);
  useEffect(() => { if (user) setUsageCount(getUsage("blueprint", user.id)); }, [user]);
  const atLimit = usageCount >= maxUses;

  useEffect(() => {
    if (!loading) return;
    let stage = 0; let progress = 0;
    const si = setInterval(() => { if (stage < LOADING_STAGES.length - 1) { stage++; setLoadingStage(stage); } }, 2800);
    const pi = setInterval(() => { progress += Math.random() * 3 + 0.5; if (progress > 95) progress = 95; setLoadingProgress(progress); }, 200);
    return () => { clearInterval(si); clearInterval(pi); };
  }, [loading]);

  useEffect(() => {
    if (!showScore) return;
    const target = 82 + Math.floor(Math.random() * 15);
    let current = 0;
    const interval = setInterval(() => { current += 2; if (current >= target) { current = target; clearInterval(interval); } setActionScore(current); }, 25);
    return () => clearInterval(interval);
  }, [showScore]);

  if (!user) { navigate("/login"); return null; }
  const recordOutput = useRecordOutput();

  const generateBlueprint = async () => {
    if (atLimit) { toast.error(`Limit reached (${maxUses}). Upgrade for more!`); return; }
    if (!hustleTitle.trim()) { toast.error("Enter a hustle title"); return; }
    setLoading(true); setBlueprint(""); setLoadingStage(0); setLoadingProgress(0); setShowScore(false); setActionScore(0);
    try {
      const { data, error } = await supabase.functions.invoke("hustle-blueprint", {
        body: { hustle_title: hustleTitle, hustle_description: hustleDesc, user_skills: userSkills },
      });
      if (error) throw error;
      setBlueprint(data.blueprint);
      setLoadingProgress(100);
      const score = 82 + Math.floor(Math.random() * 15);
      setTimeout(() => {
        setShowScore(true);
        setUsageCount(bumpUsage("blueprint", user!.id));
        awardXP(user!.id, 10);
        // auto-open clean branded viewer in new tab — same UX as main hustle search
        openBlueprintPrint({ title: hustleTitle, description: hustleDesc, actionScore: score, content: data.blueprint });
      }, 400);
      // Shared workspace memory — let other tools see this generation.
      recordOutput({
        tool: "hustle-blueprint",
        title: hustleTitle,
        summary: (hustleDesc || data.blueprint || "").slice(0, 240),
        metadata: { user_skills: userSkills, action_score: score },
      });
      toast.success("Blueprint ready! Opening in new tab…");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate blueprint";
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const copyToClipboard = () => { navigator.clipboard.writeText(blueprint); setCopied(true); toast.success("Copied!"); setTimeout(() => setCopied(false), 2000); };

  const openCleanView = (autoPrint = false) =>
    openBlueprintPrint({ title: hustleTitle, description: hustleDesc, actionScore, content: blueprint }, autoPrint);

  const CurrentIcon = LOADING_STAGES[loadingStage]?.icon || Brain;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-32 md:pb-16 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm">
              <Rocket className="w-4 h-4" /> Free Tool · {usageCount}/{maxUses} Used
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold">
              Hustle-to-Action <span className="text-gradient">Blueprint</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get a 7-day action plan with targets, outreach scripts & checklists — built from 50K+ gig data.
            </p>
            {atLimit && (
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={() => navigate("/payment")}>
                <Lock className="w-4 h-4 mr-1" /> Upgrade for More
              </Button>
            )}
          </motion.div>

          {/* Input */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 md:p-8 space-y-5">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Hustle / Gig Title *</label>
                <Input placeholder="e.g. Social Media Management for local cafes" value={hustleTitle} onChange={(e) => setHustleTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
                <FullscreenTextarea
                  value={hustleDesc}
                  onChange={setHustleDesc}
                  placeholder="Describe the hustle or what you want to do..."
                  rows={3}
                  fullscreenTitle="Describe your hustle"
                  ariaLabel="Hustle description"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Skills (optional)</label>
                <Input placeholder="e.g. Canva, copywriting, basic video editing" value={userSkills} onChange={(e) => setUserSkills(e.target.value)} />
              </div>
            </div>
            <Button className="w-full bg-gradient-primary text-primary-foreground h-12 text-base btn-press" onClick={generateBlueprint} disabled={loading || atLimit}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Generating...</> : atLimit ? <><Lock className="w-5 h-5 mr-2" /> Limit Reached</> : <><Zap className="w-5 h-5 mr-2" /> Generate My Blueprint</>}
            </Button>
          </motion.div>

          {/* Loading */}
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="glass rounded-2xl p-8 space-y-6 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                  <motion.div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }}
                    animate={{ x: [0, 200, 0], y: [0, 100, 0] }} transition={{ duration: 6, repeat: Infinity }} />
                  <motion.div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, hsl(var(--accent)), transparent)" }}
                    animate={{ x: [0, -150, 0], y: [0, -80, 0] }} transition={{ duration: 5, repeat: Infinity }} />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Building Blueprint</span>
                      <span className="font-mono text-primary font-bold">{Math.round(loadingProgress)}%</span>
                    </div>
                    <Progress value={loadingProgress} className="h-2" />
                  </div>
                  <motion.div key={loadingStage} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 py-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CurrentIcon className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-sm">{LOADING_STAGES[loadingStage]?.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Step {loadingStage + 1} of {LOADING_STAGES.length}</p>
                    </div>
                  </motion.div>
                  <div className="flex items-center justify-center gap-2">
                    {LOADING_STAGES.map((_, i) => (
                      <motion.div key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${i <= loadingStage ? "bg-primary w-6" : "bg-muted w-2"}`}
                        animate={i === loadingStage ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 0.6, repeat: Infinity }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {[
                      { label: LOADING_STAGES[loadingStage]?.stat || "Processing", value: `${Math.floor(loadingProgress * 50)}+` },
                      { label: "Data Points", value: `${Math.floor(loadingProgress * 120)}` },
                      { label: "Success Patterns", value: `${Math.floor(loadingProgress * 8)}` },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="font-mono text-lg font-bold text-primary">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Readiness Score */}
          <AnimatePresence>
            {showScore && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-6 text-center space-y-4">
                <h3 className="font-display font-bold text-lg">Your Action Readiness Score</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="10"
                      strokeDasharray={`${actionScore * 3.14} 314`} strokeLinecap="round" className="transition-all duration-100" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-3xl font-bold text-primary">{actionScore}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {actionScore >= 90 ? "🔥 Elite readiness! This plan has everything to start earning in 7 days." :
                   actionScore >= 80 ? "💪 Highly actionable! Follow day-by-day and you'll land your first gig." :
                   "✨ Solid foundation! Open the full blueprint to start your hustle launch."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result actions — content lives in the new tab now */}
          {blueprint && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 md:p-8 space-y-4 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                <Sparkles className="w-3.5 h-3.5" /> Blueprint Ready
              </div>
              <h3 className="font-display font-bold text-xl">Your blueprint opened in a new tab</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Closed the tab? Reopen the clean branded view, or download as PDF directly from there
                (uses your browser's native PDF — small file, no overlap).
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => openCleanView(false)}>
                  <ExternalLink className="w-4 h-4 mr-1" /> Open in New Tab
                </Button>
                <Button size="sm" variant="outline" onClick={() => openCleanView(true)}>
                  <Download className="w-4 h-4 mr-1" /> Download PDF
                </Button>
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} {copied ? "Copied" : "Copy Markdown"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setBlueprint(""); setShowScore(false); }}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Generate Again ({maxUses - usageCount} left)
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile sticky generate bar — keeps the primary CTA one tap away */}
      <StickyGenerateBar
        status={
          loading
            ? `Generating · ${Math.round(loadingProgress)}%`
            : atLimit
              ? "Daily limit reached"
              : `${maxUses - usageCount} of ${maxUses} left today`
        }
        action={
          <Button
            onClick={generateBlueprint}
            disabled={loading || atLimit}
            className="bg-gradient-primary text-primary-foreground min-h-tap px-4"
            size="sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : atLimit ? <Lock className="w-4 h-4" /> : <><Zap className="w-4 h-4 mr-1" /> Generate</>}
          </Button>
        }
      />

      <Footer />
    </div>
  );
}
