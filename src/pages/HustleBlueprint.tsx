import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Loader2, Copy, Check, Sparkles, Lock, Brain, Search, Target, Map, Calendar, Zap } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const LOADING_STAGES = [
  { icon: Brain, text: "Analyzing your hustle idea..." },
  { icon: Search, text: "Researching market demand & competition..." },
  { icon: Target, text: "Identifying potential clients via Google Maps data..." },
  { icon: Map, text: "Building your 7-day action roadmap..." },
  { icon: Calendar, text: "Crafting customized outreach scripts..." },
  { icon: Sparkles, text: "Finalizing your blueprint..." },
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

  const tier = profile?.subscription_tier || "free";
  const maxUses = tier === "free" ? 3 : tier === "pro" ? 5 : tier === "elite" ? 10 : 20;
  const usageKey = `blueprint_uses_${user?.id}`;
  const getUsage = () => parseInt(localStorage.getItem(usageKey) || "0", 10);
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => { if (user) setUsageCount(getUsage()); }, [user]);

  const atLimit = usageCount >= maxUses;

  useEffect(() => {
    if (!loading) return;
    let stage = 0;
    let progress = 0;
    const si = setInterval(() => { if (stage < LOADING_STAGES.length - 1) { stage++; setLoadingStage(stage); } }, 2800);
    const pi = setInterval(() => { progress += Math.random() * 3 + 0.5; if (progress > 95) progress = 95; setLoadingProgress(progress); }, 200);
    return () => { clearInterval(si); clearInterval(pi); };
  }, [loading]);

  const generateBlueprint = async () => {
    if (atLimit) { toast.error(`Limit reached (${maxUses}). Upgrade for more!`); return; }
    if (!hustleTitle.trim()) { toast.error("Enter a hustle title"); return; }
    setLoading(true); setBlueprint(""); setLoadingStage(0); setLoadingProgress(0);
    try {
      const { data, error } = await supabase.functions.invoke("hustle-blueprint", {
        body: { hustle_title: hustleTitle, hustle_description: hustleDesc, user_skills: userSkills },
      });
      if (error) throw error;
      setBlueprint(data.blueprint);
      setLoadingProgress(100);
      const newCount = getUsage() + 1;
      localStorage.setItem(usageKey, String(newCount));
      setUsageCount(newCount);
      toast.success("Blueprint generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate blueprint");
    } finally { setLoading(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(blueprint); setCopied(true);
    toast.success("Copied!"); setTimeout(() => setCopied(false), 2000);
  };

  const CurrentIcon = LOADING_STAGES[loadingStage]?.icon || Brain;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm">
              <Rocket className="w-4 h-4" /> Free Tool · {usageCount}/{maxUses} Used
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold">
              Hustle-to-Action <span className="text-gradient">Blueprint</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get a step-by-step 7-day plan to land your gig — with targets, scripts & checklist.
            </p>
            {atLimit && (
              <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/#pricing")}>
                <Lock className="w-4 h-4 mr-1" /> Upgrade for More
              </Button>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 md:p-8 space-y-5">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Hustle / Gig Title *</label>
                <Input placeholder="e.g. Social Media Management for local cafes" value={hustleTitle} onChange={(e) => setHustleTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
                <Textarea placeholder="Describe the hustle or what you want to do..." value={hustleDesc} onChange={(e) => setHustleDesc(e.target.value)} rows={3} />
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

          {/* Loading Animation */}
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="glass rounded-2xl p-8 space-y-6 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                  <motion.div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }}
                    animate={{ x: [0, 200, 0], y: [0, 100, 0] }} transition={{ duration: 6, repeat: Infinity }} />
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {blueprint && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 md:p-8 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-display font-bold text-xl flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" /> Your 7-Day Blueprint
                </h2>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{blueprint}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
