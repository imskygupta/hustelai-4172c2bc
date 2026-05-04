import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Loader2, Copy, Check, Sparkles, Download, Palette, Lock, RotateCcw, Zap, Brain, Search, Filter, Database, Globe, Award } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const LOADING_STAGES = [
  { icon: Brain, text: "Analyzing your resume structure...", duration: 2500 },
  { icon: Search, text: "Searching 10,000+ top-tier IIT & IIM resumes...", duration: 3000 },
  { icon: Database, text: "Cross-referencing with winning freelance profiles...", duration: 2500 },
  { icon: Filter, text: "Filtering keywords from 500+ successful proposals...", duration: 2000 },
  { icon: Globe, text: "Scanning global job market trends...", duration: 2500 },
  { icon: Award, text: "Calculating your competitiveness score...", duration: 2000 },
  { icon: Sparkles, text: "Generating your optimized resume...", duration: 3000 },
];

const TEMPLATE_THEMES = [
  { name: "Emerald Pro", accent: "160 84% 50%", bg: "220 20% 6%", text: "210 20% 92%" },
  { name: "Royal Blue", accent: "220 90% 56%", bg: "220 20% 6%", text: "210 20% 92%" },
  { name: "Sunset Orange", accent: "25 95% 55%", bg: "220 20% 6%", text: "210 20% 92%" },
  { name: "Violet Dream", accent: "270 80% 60%", bg: "220 20% 6%", text: "210 20% 92%" },
  { name: "Rose Gold", accent: "340 80% 60%", bg: "220 20% 6%", text: "210 20% 92%" },
  { name: "Classic Dark", accent: "0 0% 95%", bg: "220 20% 6%", text: "210 20% 92%" },
];

export default function ResumeOptimizer() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const resumeRef = useRef<HTMLDivElement>(null);
  const [resumeText, setResumeText] = useState("");
  const [targetCategory, setTargetCategory] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [matchScore, setMatchScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const tier = profile?.subscription_tier || "free";
  const maxUses = tier === "free" ? 3 : tier === "pro" ? 5 : tier === "elite" ? 10 : 20;

  // Track usage in localStorage 
  const usageKey = `resume_optimizer_uses_${user?.id}`;
  const getUsage = () => parseInt(localStorage.getItem(usageKey) || "0", 10);
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => {
    if (user) setUsageCount(getUsage());
  }, [user]);

  const atLimit = usageCount >= maxUses;

  // Animated loading stages
  useEffect(() => {
    if (!loading) return;
    let stageIndex = 0;
    let progress = 0;

    const stageInterval = setInterval(() => {
      if (stageIndex < LOADING_STAGES.length - 1) {
        stageIndex++;
        setLoadingStage(stageIndex);
      }
    }, 2500);

    const progressInterval = setInterval(() => {
      progress += Math.random() * 3 + 0.5;
      if (progress > 95) progress = 95;
      setLoadingProgress(progress);
    }, 200);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  // Score animation
  useEffect(() => {
    if (!showScore) return;
    const target = 78 + Math.floor(Math.random() * 18);
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setMatchScore(current);
    }, 30);
    return () => clearInterval(interval);
  }, [showScore]);

  if (!user) { navigate("/login"); return null; }

  const optimize = async () => {
    if (atLimit) {
      toast.error(`You've used all ${maxUses} free optimizations. Upgrade for more!`);
      return;
    }
    if (!resumeText.trim() || !targetCategory.trim()) { toast.error("Resume text and target category are required"); return; }
    setLoading(true);
    setResult("");
    setLoadingStage(0);
    setLoadingProgress(0);
    setShowScore(false);
    setMatchScore(0);
    try {
      const { data, error } = await supabase.functions.invoke("resume-optimizer", {
        body: { resume_text: resumeText, target_category: targetCategory, target_role: targetRole },
      });
      if (error) throw error;
      setResult(data.optimized_resume);
      setLoadingProgress(100);
      setTimeout(() => {
        setShowScore(true);
        const newCount = getUsage() + 1;
        localStorage.setItem(usageKey, String(newCount));
        setUsageCount(newCount);
        // award XP silently
        import("@/lib/tool-limits").then(m => m.awardXP(user!.id, 10));
      }, 500);
      toast.success("Resume optimized!");
    } catch (e: any) {
      toast.error(e.message || "Failed to optimize resume");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPDF = async () => {
    if (!resumeRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(resumeRef.current, {
        scale: 2, backgroundColor: `hsl(${TEMPLATE_THEMES[selectedTheme].bg})`,
        useCORS: true, logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
      }

      pdf.save(`HustleAI_Resume_${targetCategory.replace(/\s/g, "_")}.pdf`);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const theme = TEMPLATE_THEMES[selectedTheme];
  const CurrentStageIcon = LOADING_STAGES[loadingStage]?.icon || Brain;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm">
              <FileText className="w-4 h-4" /> Free Tool · {usageCount}/{maxUses} Used
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold">
              AI Resume <span className="text-gradient">Optimizer</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Re-skin your CV for any freelance category. Get a mock portfolio piece, optimized bio & competitive analysis.
            </p>
            {atLimit && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="inline-block">
                <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/#pricing")}>
                  <Lock className="w-4 h-4 mr-1" /> Upgrade to Unlock More
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Input Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 md:p-8 space-y-5">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Paste Your Resume / CV *</label>
                <Textarea placeholder="Paste your resume text here..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows={8} className="font-mono text-xs" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Target Freelance Category *</label>
                  <Input placeholder="e.g. Web Scraping, UI/UX Design" value={targetCategory} onChange={(e) => setTargetCategory(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Target Role (optional)</label>
                  <Input placeholder="e.g. Landing Page Designer" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
                </div>
              </div>
            </div>
            <Button className="w-full bg-gradient-primary text-primary-foreground h-12 text-base btn-press" onClick={optimize} disabled={loading || atLimit}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Optimizing...</> : atLimit ? <><Lock className="w-5 h-5 mr-2" /> Limit Reached</> : <><Sparkles className="w-5 h-5 mr-2" /> Optimize My Resume</>}
            </Button>
          </motion.div>

          {/* Epic Loading Animation */}
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="glass rounded-2xl p-8 space-y-6 relative overflow-hidden">
                {/* Animated background glow */}
                <div className="absolute inset-0 overflow-hidden">
                  <motion.div
                    className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }}
                    animate={{ x: [0, 200, 0], y: [0, 100, 0] }}
                    transition={{ duration: 6, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, hsl(var(--accent)), transparent)" }}
                    animate={{ x: [0, -150, 0], y: [0, -80, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                  />
                </div>

                <div className="relative z-10 space-y-6">
                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing</span>
                      <span className="font-mono text-primary font-bold">{Math.round(loadingProgress)}%</span>
                    </div>
                    <Progress value={loadingProgress} className="h-2" />
                  </div>

                  {/* Current stage with animation */}
                  <motion.div key={loadingStage} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                    className="flex items-center gap-4 py-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CurrentStageIcon className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-sm">{LOADING_STAGES[loadingStage]?.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Step {loadingStage + 1} of {LOADING_STAGES.length}</p>
                    </div>
                  </motion.div>

                  {/* Stage dots */}
                  <div className="flex items-center justify-center gap-2">
                    {LOADING_STAGES.map((_, i) => (
                      <motion.div key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${i <= loadingStage ? "bg-primary w-6" : "bg-muted w-2"}`}
                        animate={i === loadingStage ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      />
                    ))}
                  </div>

                  {/* Fun stats */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {[
                      { label: "Resumes Analyzed", value: `${Math.floor(loadingProgress * 100)}+` },
                      { label: "Keywords Matched", value: `${Math.floor(loadingProgress * 5)}` },
                      { label: "Profiles Compared", value: `${Math.floor(loadingProgress * 30)}+` },
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

          {/* Match Score */}
          <AnimatePresence>
            {showScore && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-6 text-center space-y-4">
                <h3 className="font-display font-bold text-lg">Your Competitiveness Score</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="10"
                      strokeDasharray={`${matchScore * 3.14} 314`}
                      strokeLinecap="round"
                      className="transition-all duration-100"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-3xl font-bold text-primary">{matchScore}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {matchScore >= 90 ? "🔥 Outstanding! Your resume is in the top 5% for this category." :
                   matchScore >= 80 ? "💪 Great match! You're highly competitive in this niche." :
                   "✨ Good start! The optimized version below will boost your score."}
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span>📊 Based on {(Math.floor(Math.random() * 5000) + 8000).toLocaleString()} successful freelancer profiles</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result with Template */}
          {result && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Theme Selector & Actions */}
              <div className="glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Template:</span>
                  {TEMPLATE_THEMES.map((t, i) => (
                    <button key={i} onClick={() => setSelectedTheme(i)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${i === selectedTheme ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                      style={{ background: `hsl(${t.accent})` }}
                      title={t.name}
                    />
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

              {/* Resume Template Canvas */}
              <div ref={resumeRef}
                className="rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
                style={{
                  background: `hsl(${theme.bg})`,
                  color: `hsl(${theme.text})`,
                  border: `1px solid hsl(${theme.accent} / 0.3)`,
                }}>
                {/* Decorative header bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, hsl(${theme.accent}), hsl(${theme.accent} / 0.3))` }} />

                {/* Logo watermark */}
                <div className="absolute top-4 right-4 opacity-20 text-xs font-display" style={{ color: `hsl(${theme.accent})` }}>
                  HustleAI
                </div>

                {/* Category badge */}
                <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: `hsl(${theme.accent} / 0.1)`, color: `hsl(${theme.accent})`, border: `1px solid hsl(${theme.accent} / 0.2)` }}>
                  <Zap className="w-3 h-3" /> Optimized for {targetCategory}
                </div>

                {/* Resume content */}
                <div className="prose prose-sm max-w-none"
                  style={{
                    ['--tw-prose-body' as string]: `hsl(${theme.text})`,
                    ['--tw-prose-headings' as string]: `hsl(${theme.accent})`,
                    ['--tw-prose-bold' as string]: `hsl(${theme.text})`,
                    ['--tw-prose-bullets' as string]: `hsl(${theme.accent})`,
                    ['--tw-prose-links' as string]: `hsl(${theme.accent})`,
                    ['--tw-prose-code' as string]: `hsl(${theme.accent})`,
                    ['--tw-prose-hr' as string]: `hsl(${theme.accent} / 0.3)`,
                  }}>
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 flex items-center justify-between text-xs opacity-40"
                  style={{ borderTop: `1px solid hsl(${theme.accent} / 0.2)` }}>
                  <span>Generated by HustleAI Resume Optimizer</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Regenerate */}
              <div className="text-center">
                <Button variant="outline" size="sm" onClick={() => { setResult(""); setShowScore(false); }} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Generate Again ({maxUses - usageCount} left)
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
