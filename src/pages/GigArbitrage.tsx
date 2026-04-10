import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Loader2, Copy, Check, Sparkles, Lock, Brain, Search, Globe, BarChart3, Zap, DollarSign } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";

const LOADING_STAGES = [
  { icon: Globe, text: "Scanning Upwork, Fiverr & Freelancer listings..." },
  { icon: Search, text: "Analyzing X posts & Craigslist gigs..." },
  { icon: BarChart3, text: "Calculating price differentials..." },
  { icon: DollarSign, text: "Finding arbitrage opportunities..." },
  { icon: Brain, text: "Generating profit strategies..." },
  { icon: Sparkles, text: "Finalizing your report..." },
];

export default function GigArbitrage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const tier = profile?.subscription_tier || "free";
  const hasAccess = tier !== "free";
  const maxUses = tier === "pro" ? 5 : tier === "elite" ? 10 : tier === "infinity" ? 20 : 3;
  const usageKey = `gig_arbitrage_uses_${user?.id}`;
  const getUsage = () => parseInt(localStorage.getItem(usageKey) || "0", 10);
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => { if (user) setUsageCount(getUsage()); }, [user]);

  if (!user) { navigate("/login"); return null; }

  const atLimit = usageCount >= maxUses;

  useEffect(() => {
    if (!loading) return;
    let stage = 0; let progress = 0;
    const si = setInterval(() => { if (stage < LOADING_STAGES.length - 1) { stage++; setLoadingStage(stage); } }, 3000);
    const pi = setInterval(() => { progress += Math.random() * 3 + 0.5; if (progress > 95) progress = 95; setLoadingProgress(progress); }, 200);
    return () => { clearInterval(si); clearInterval(pi); };
  }, [loading]);

  const analyze = async () => {
    if (!hasAccess) { toast.error("Gig Arbitrage requires Pro or higher tier"); return; }
    if (atLimit) { toast.error(`Limit reached (${maxUses}). Upgrade for more!`); return; }
    if (!category.trim()) { toast.error("Enter a category"); return; }
    setLoading(true); setAnalysis(""); setLoadingStage(0); setLoadingProgress(0);
    try {
      const { data, error } = await supabase.functions.invoke("gig-arbitrage", { body: { category, skills } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
      setLoadingProgress(100);
      const newCount = getUsage() + 1;
      localStorage.setItem(usageKey, String(newCount));
      setUsageCount(newCount);
      toast.success("Arbitrage analysis ready!");
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze");
    } finally { setLoading(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(analysis); setCopied(true);
    toast.success("Copied!"); setTimeout(() => setCopied(false), 2000);
  };

  const CurrentIcon = LOADING_STAGES[loadingStage]?.icon || Brain;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-accent text-sm">
              <TrendingUp className="w-4 h-4" /> Pro+ Tool · {usageCount}/{maxUses} Used
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold">
              Gig <span className="text-gradient-accent">Arbitrage</span> Monitor
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Find price gaps across Upwork, Fiverr, X & Craigslist. Buy low, sell high.
            </p>
          </motion.div>

          {!hasAccess ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 text-center space-y-4">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
              <h2 className="font-display font-bold text-xl">Pro+ Feature</h2>
              <p className="text-muted-foreground">Upgrade to Pro or higher to unlock the Gig Arbitrage Monitor.</p>
              <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/#pricing")}>
                <Sparkles className="w-4 h-4 mr-1" /> Upgrade Now
              </Button>
            </motion.div>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-6 md:p-8 space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Service Category *</label>
                    <Input placeholder="e.g. Logo Design, Web Scraping" value={category} onChange={(e) => setCategory(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Your Skills (optional)</label>
                    <Input placeholder="e.g. Illustrator, Python, Figma" value={skills} onChange={(e) => setSkills(e.target.value)} />
                  </div>
                </div>
                <Button className="w-full bg-gradient-primary text-primary-foreground h-12 text-base btn-press" onClick={analyze} disabled={loading || atLimit}>
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Scanning...</> : atLimit ? <><Lock className="w-5 h-5 mr-2" /> Limit Reached</> : <><Zap className="w-5 h-5 mr-2" /> Find Arbitrage Opportunities</>}
                </Button>
              </motion.div>

              <AnimatePresence>
                {loading && (
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="glass rounded-2xl p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                      <motion.div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10"
                        style={{ background: "radial-gradient(circle, hsl(var(--accent)), transparent)" }}
                        animate={{ x: [0, -200, 0], y: [0, 100, 0] }} transition={{ duration: 6, repeat: Infinity }} />
                    </div>
                    <div className="relative z-10 space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Scanning Platforms</span>
                          <span className="font-mono text-accent font-bold">{Math.round(loadingProgress)}%</span>
                        </div>
                        <Progress value={loadingProgress} className="h-2" />
                      </div>
                      <motion.div key={loadingStage} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 py-4">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                          <CurrentIcon className="w-6 h-6 text-accent animate-pulse" />
                        </div>
                        <div>
                          <p className="font-display font-semibold text-sm">{LOADING_STAGES[loadingStage]?.text}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Step {loadingStage + 1} of {LOADING_STAGES.length}</p>
                        </div>
                      </motion.div>
                      <div className="flex items-center justify-center gap-2">
                        {LOADING_STAGES.map((_, i) => (
                          <motion.div key={i}
                            className={`h-2 rounded-full transition-all duration-300 ${i <= loadingStage ? "bg-accent w-6" : "bg-muted w-2"}`}
                            animate={i === loadingStage ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 0.6, repeat: Infinity }} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {analysis && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 md:p-8 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="font-display font-bold text-xl flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-accent" /> Arbitrage Opportunities
                    </h2>
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
