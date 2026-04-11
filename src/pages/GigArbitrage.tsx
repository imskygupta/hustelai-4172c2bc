import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Loader2, Copy, Check, Sparkles, Lock, Brain, Search, Globe, BarChart3, Zap, DollarSign, Download, Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const LOADING_STAGES = [
  { icon: Globe, text: "Scanning Upwork, Fiverr & Freelancer listings...", stat: "Platforms Scanned" },
  { icon: Search, text: "Analyzing X posts & Craigslist gigs...", stat: "Posts Analyzed" },
  { icon: BarChart3, text: "Calculating price differentials across markets...", stat: "Price Points" },
  { icon: DollarSign, text: "Finding arbitrage gaps above 40% margin...", stat: "Opportunities" },
  { icon: Brain, text: "Generating profit strategies & fulfillment plans...", stat: "Strategies Built" },
  { icon: Sparkles, text: "Finalizing your arbitrage report...", stat: "Report Ready" },
];

const TEMPLATE_THEMES = [
  { name: "Money Dark", accent: "142 76% 46%", bg: "220 13% 8%", text: "210 20% 92%", gradient: "linear-gradient(135deg, hsl(142 76% 46%), hsl(170 80% 40%))" },
  { name: "Clean White", accent: "220 10% 20%", bg: "0 0% 98%", text: "220 13% 12%", gradient: "linear-gradient(135deg, hsl(220 10% 30%), hsl(220 10% 50%))" },
  { name: "Profit Gradient", accent: "45 93% 47%", bg: "30 10% 6%", text: "30 20% 92%", gradient: "linear-gradient(135deg, hsl(45 93% 47%), hsl(142 76% 46%))" },
];

export default function GigArbitrage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [profitScore, setProfitScore] = useState(0);
  const [showScore, setShowScore] = useState(false);

  const tier = profile?.subscription_tier || "free";
  const hasAccess = tier !== "free";
  const maxUses = tier === "pro" ? 5 : tier === "elite" ? 10 : tier === "infinity" ? 20 : 3;
  const usageKey = `gig_arbitrage_uses_${user?.id}`;
  const getUsage = () => parseInt(localStorage.getItem(usageKey) || "0", 10);
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => { if (user) setUsageCount(getUsage()); }, [user]);
  const atLimit = usageCount >= maxUses;

  useEffect(() => {
    if (!loading) return;
    let stage = 0; let progress = 0;
    const si = setInterval(() => { if (stage < LOADING_STAGES.length - 1) { stage++; setLoadingStage(stage); } }, 3000);
    const pi = setInterval(() => { progress += Math.random() * 3 + 0.5; if (progress > 95) progress = 95; setLoadingProgress(progress); }, 200);
    return () => { clearInterval(si); clearInterval(pi); };
  }, [loading]);

  useEffect(() => {
    if (!showScore) return;
    const target = 60 + Math.floor(Math.random() * 35);
    let current = 0;
    const interval = setInterval(() => { current += 2; if (current >= target) { current = target; clearInterval(interval); } setProfitScore(current); }, 25);
    return () => clearInterval(interval);
  }, [showScore]);

  if (!user) { navigate("/login"); return null; }

  const analyze = async () => {
    if (!hasAccess) { toast.error("Gig Arbitrage requires Pro or higher tier"); return; }
    if (atLimit) { toast.error(`Limit reached (${maxUses}). Upgrade for more!`); return; }
    if (!category.trim()) { toast.error("Enter a category"); return; }
    setLoading(true); setAnalysis(""); setLoadingStage(0); setLoadingProgress(0); setShowScore(false); setProfitScore(0);
    try {
      const { data, error } = await supabase.functions.invoke("gig-arbitrage", { body: { category, skills } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
      setLoadingProgress(100);
      setTimeout(() => {
        setShowScore(true);
        const newCount = getUsage() + 1;
        localStorage.setItem(usageKey, String(newCount));
        setUsageCount(newCount);
      }, 400);
      toast.success("Arbitrage analysis ready!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to analyze";
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const copyToClipboard = () => { navigator.clipboard.writeText(analysis); setCopied(true); toast.success("Copied!"); setTimeout(() => setCopied(false), 2000); };

  const downloadPDF = async () => {
    if (!canvasRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(canvasRef.current, { scale: 2, backgroundColor: `hsl(${theme.bg})`, useCORS: true, logging: false });
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgW = pw - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      let left = imgH; let pos = 10;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, pos, imgW, imgH);
      left -= (ph - 20);
      while (left > 0) { pos = left - imgH + 10; pdf.addPage(); pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, pos, imgW, imgH); left -= (ph - 20); }
      pdf.save(`HustleAI_Arbitrage_${category.replace(/\s/g, "_")}.pdf`);
      toast.success("PDF downloaded!");
    } catch { toast.error("Failed to download PDF"); } finally { setDownloading(false); }
  };

  const theme = TEMPLATE_THEMES[selectedTheme];
  const CurrentIcon = LOADING_STAGES[loadingStage]?.icon || Brain;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-accent text-sm">
              <TrendingUp className="w-4 h-4" /> Pro+ Tool · {usageCount}/{maxUses} Used
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold">
              Gig <span className="text-gradient-accent">Arbitrage</span> Monitor
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Find price gaps across Upwork, Fiverr, X & Craigslist. Buy low, sell high — be the agency.
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

              {/* Loading */}
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
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        {[
                          { label: LOADING_STAGES[loadingStage]?.stat || "Processing", value: `${Math.floor(loadingProgress * 40)}+` },
                          { label: "Listings Compared", value: `${Math.floor(loadingProgress * 85)}` },
                          { label: "Margin Gaps Found", value: `${Math.floor(loadingProgress * 0.5)}` },
                        ].map(s => (
                          <div key={s.label} className="text-center p-3 rounded-lg bg-muted/30">
                            <p className="font-mono text-lg font-bold text-accent">{s.value}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Profit Score */}
              <AnimatePresence>
                {showScore && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-6 text-center space-y-4">
                    <h3 className="font-display font-bold text-lg">Estimated Profit Potential</h3>
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--accent))" strokeWidth="10"
                          strokeDasharray={`${profitScore * 3.14} 314`} strokeLinecap="round" className="transition-all duration-100" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-display text-3xl font-bold text-accent">{profitScore}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {profitScore >= 80 ? "🔥 High-margin opportunities detected! Act fast." :
                       profitScore >= 60 ? "💰 Good arbitrage potential with solid margins." :
                       "📊 Moderate opportunities — check the details below."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result */}
              {analysis && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Palette className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Template:</span>
                      {TEMPLATE_THEMES.map((t, i) => (
                        <button key={i} onClick={() => setSelectedTheme(i)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${i === selectedTheme ? "ring-2 ring-accent/50 scale-105" : "opacity-60 hover:opacity-100"}`}
                          style={{ background: t.gradient, color: `hsl(${t.text})` }}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>
                        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} {copied ? "Copied" : "Copy"}
                      </Button>
                      <Button size="sm" className="bg-gradient-primary text-primary-foreground btn-press" onClick={downloadPDF} disabled={downloading}>
                        {downloading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />} Download PDF
                      </Button>
                    </div>
                  </div>

                  <div ref={canvasRef} className="rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
                    style={{ background: `hsl(${theme.bg})`, color: `hsl(${theme.text})`, border: `1px solid hsl(${theme.accent} / 0.3)` }}>
                    <div className="absolute top-0 left-0 right-0 h-2" style={{ background: theme.gradient }} />
                    <div className="absolute top-4 right-4 opacity-20 text-xs font-display" style={{ color: `hsl(${theme.accent})` }}>⚡ HustleAI</div>

                    <div className="mb-8 space-y-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                        style={{ background: `hsl(${theme.accent} / 0.1)`, color: `hsl(${theme.accent})`, border: `1px solid hsl(${theme.accent} / 0.2)` }}>
                        <TrendingUp className="w-3 h-3" /> Gig Arbitrage Report
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold" style={{ color: `hsl(${theme.accent})` }}>
                        {category} — Arbitrage Opportunities
                      </h2>
                      {profitScore > 0 && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                          style={{ background: `hsl(${theme.accent} / 0.1)`, color: `hsl(${theme.accent})` }}>
                          💰 Profit Potential: {profitScore}%
                        </div>
                      )}
                    </div>

                    <div className="prose prose-sm max-w-none" style={{
                      ['--tw-prose-body' as string]: `hsl(${theme.text})`,
                      ['--tw-prose-headings' as string]: `hsl(${theme.accent})`,
                      ['--tw-prose-bold' as string]: `hsl(${theme.text})`,
                      ['--tw-prose-bullets' as string]: `hsl(${theme.accent})`,
                      ['--tw-prose-links' as string]: `hsl(${theme.accent})`,
                      ['--tw-prose-code' as string]: `hsl(${theme.accent})`,
                      ['--tw-prose-hr' as string]: `hsl(${theme.accent} / 0.3)`,
                    }}>
                      <ReactMarkdown>{analysis}</ReactMarkdown>
                    </div>

                    <div className="mt-8 pt-4 flex items-center justify-between text-xs opacity-40"
                      style={{ borderTop: `1px solid hsl(${theme.accent} / 0.2)` }}>
                      <span>Generated by HustleAI Arbitrage Monitor</span>
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button variant="outline" size="sm" onClick={() => { setAnalysis(""); setShowScore(false); }} className="gap-2">
                      <RotateCcw className="w-4 h-4" /> Analyze Again ({maxUses - usageCount} left)
                    </Button>
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
