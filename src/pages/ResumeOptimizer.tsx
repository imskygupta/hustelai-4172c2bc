import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Loader2, Sparkles, Download, Upload, FilePlus2, Lock,
  ArrowRight, ArrowLeft, Check, Wand2, Crown, Trophy, Target, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { getMaxUses, getUsage, bumpUsage, awardXP } from "@/lib/tool-limits";

// =====================================================================
// Types
// =====================================================================
type Step = "choose" | "template" | "questions" | "editor" | "score";
type Path = "upload" | "new" | null;

type ResumeData = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
  achievements: string;
};

const EMPTY_RESUME: ResumeData = {
  fullName: "", email: "", phone: "", location: "", title: "",
  summary: "", skills: "", experience: "", education: "", achievements: "",
};

// =====================================================================
// Templates — 6 distinct visual layouts
// =====================================================================
type Template = {
  id: string;
  name: string;
  vibe: string;
  accent: string;          // hsl
  bg: string;              // hsl
  text: string;            // hsl
  layout: "classic" | "sidebar" | "modern" | "minimal" | "bold" | "elegant";
};

const TEMPLATES: Template[] = [
  { id: "emerald-classic", name: "Emerald Classic", vibe: "Trustworthy & Clean", accent: "160 84% 45%", bg: "0 0% 100%", text: "220 25% 12%", layout: "classic" },
  { id: "royal-sidebar",   name: "Royal Sidebar",   vibe: "Corporate & Sharp",   accent: "220 85% 52%", bg: "0 0% 100%", text: "220 25% 12%", layout: "sidebar" },
  { id: "sunset-modern",   name: "Sunset Modern",   vibe: "Creative & Bold",     accent: "20 90% 55%",  bg: "30 30% 98%", text: "220 25% 14%", layout: "modern" },
  { id: "ink-minimal",     name: "Ink Minimal",     vibe: "Quiet Confidence",    accent: "220 15% 25%", bg: "0 0% 100%",  text: "220 25% 12%", layout: "minimal" },
  { id: "violet-bold",     name: "Violet Bold",     vibe: "Designer Energy",     accent: "270 75% 55%", bg: "0 0% 100%",  text: "220 25% 12%", layout: "bold" },
  { id: "rose-elegant",    name: "Rose Elegant",    vibe: "Refined & Warm",      accent: "340 70% 55%", bg: "30 30% 99%", text: "220 25% 14%", layout: "elegant" },
];

// =====================================================================
// Gamified Questions
// =====================================================================
const QUESTIONS = [
  { id: "goal",  q: "What's your main goal?",  emoji: "🎯", options: ["Land a freelance gig", "Get a full-time job", "Switch careers", "Internship"] },
  { id: "vibe",  q: "Pick your vibe",          emoji: "✨", options: ["Corporate & Polished", "Creative & Bold", "Minimal & Quiet", "Tech & Modern"] },
  { id: "level", q: "Where are you in your journey?", emoji: "🚀", options: ["Just starting out", "1-3 years experience", "Mid-level pro", "Senior expert"] },
];

// =====================================================================
// Component
// =====================================================================
export default function ResumeOptimizer() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const tier = (profile?.subscription_tier as string) || "free";
  const maxUses = getMaxUses(tier);
  const isPaid = tier !== "free";

  const [step, setStep] = useState<Step>("choose");
  const [path, setPath] = useState<Path>(null);
  const [pasted, setPasted] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [qIndex, setQIndex] = useState(0);
  const [resume, setResume] = useState<ResumeData>(EMPTY_RESUME);
  const [scoring, setScoring] = useState(false);
  const [scoreData, setScoreData] = useState<any>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [showWatermarkDialog, setShowWatermarkDialog] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) setUsageCount(getUsage("resume", user.id)); }, [user]);

  if (!user) { navigate("/login"); return null; }

  const atLimit = usageCount >= maxUses;

  // ----- ATS Score animation -----
  useEffect(() => {
    if (!scoreData?.ats_score) return;
    let v = 0;
    const t = setInterval(() => {
      v += 2;
      if (v >= scoreData.ats_score) { v = scoreData.ats_score; clearInterval(t); }
      setAnimatedScore(v);
    }, 25);
    return () => clearInterval(t);
  }, [scoreData]);

  // ----- Step navigation -----
  const startUpload = () => {
    if (atLimit) { toast.error(`Free limit reached (${maxUses}). Upgrade for unlimited.`); return; }
    setPath("upload");
    setStep("template");
  };
  const startNew = () => {
    if (atLimit) { toast.error(`Free limit reached (${maxUses}). Upgrade for unlimited.`); return; }
    setPath("new");
    setStep("template");
  };

  // ----- Score upload via AI -----
  const scoreUpload = async () => {
    if (!pasted.trim()) { toast.error("Paste your resume text first"); return; }
    setScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("resume-optimizer", {
        body: { action: "score", resume_text: pasted, target_role: answers.goal },
      });
      if (error) throw error;
      setScoreData(data);
      // Pre-fill editor with parsed-ish content
      const lines = pasted.split("\n").map(l => l.trim()).filter(Boolean);
      setResume(r => ({
        ...r,
        fullName: r.fullName || lines[0] || "",
        summary: r.summary || lines.slice(1, 4).join(" "),
        experience: r.experience || pasted.slice(0, 800),
      }));
      setStep("score");
      bumpUsage("resume", user.id);
      setUsageCount(c => c + 1);
      awardXP(user.id, 10);
    } catch (e: any) { toast.error(e.message || "Scoring failed"); }
    finally { setScoring(false); }
  };

  // ----- AI autofill a single field -----
  const aiFill = async (field: keyof ResumeData) => {
    if (atLimit && !isPaid) { toast.error("Daily AI fills used. Top up ₹10 or upgrade."); return; }
    setAiBusy(field);
    try {
      const { data, error } = await supabase.functions.invoke("resume-optimizer", {
        body: { action: "autofill", field, context: { ...resume, ...answers } },
      });
      if (error) throw error;
      setResume(r => ({ ...r, [field]: data.content }));
      toast.success(`AI filled ${field}`);
    } catch (e: any) { toast.error(e.message || "AI fill failed"); }
    finally { setAiBusy(null); }
  };

  // ----- Download PDF (clean A4) -----
  const downloadPDF = async (withWatermark: boolean) => {
    setDownloading(true);
    try {
      const pdf = new jsPDF("p", "pt", "a4");
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const M = 40;
      const accent = selectedTemplate.accent.split(" ").map(p => p.trim());
      // Convert hsl to rgb roughly via temp canvas (jsPDF needs rgb)
      const toRgb = (hsl: string) => {
        const c = document.createElement("canvas").getContext("2d")!;
        c.fillStyle = `hsl(${hsl})`;
        const m = c.fillStyle.match(/\d+/g)!.map(Number);
        return m;
      };
      const accentRgb = toRgb(selectedTemplate.accent);
      const textRgb = toRgb(selectedTemplate.text);

      // Top accent bar
      pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      pdf.rect(0, 0, W, 6, "F");

      // Top-right small logo
      pdf.setFontSize(8);
      pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      pdf.text("HustleAI", W - M, 24, { align: "right" });

      // Header
      let y = 60;
      pdf.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(22);
      pdf.text(resume.fullName || "Your Name", M, y);
      y += 18;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
      pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      pdf.text(resume.title || "Professional Title", M, y);
      y += 16;
      pdf.setTextColor(100, 100, 100); pdf.setFontSize(9);
      const contact = [resume.email, resume.phone, resume.location].filter(Boolean).join("  •  ");
      pdf.text(contact, M, y);
      y += 18;
      pdf.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      pdf.setLineWidth(0.8);
      pdf.line(M, y, W - M, y);
      y += 18;

      const section = (title: string, body: string) => {
        if (!body.trim()) return;
        if (y > H - 90) { pdf.addPage(); y = 60; }
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
        pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        pdf.text(title.toUpperCase(), M, y); y += 14;
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
        pdf.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
        const lines = pdf.splitTextToSize(body, W - M * 2);
        for (const ln of lines) {
          if (y > H - 60) { pdf.addPage(); y = 60; }
          pdf.text(ln, M, y); y += 13;
        }
        y += 8;
      };

      section("Summary", resume.summary);
      section("Experience", resume.experience);
      section("Skills", resume.skills);
      section("Education", resume.education);
      section("Achievements", resume.achievements);

      // Bottom watermark/logo on every page
      const pages = pdf.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        pdf.setPage(i);
        // bottom accent bar
        pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        pdf.rect(0, H - 4, W, 4, "F");
        pdf.setFontSize(8);
        pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        pdf.text("Built with HustleAI · hustlaiapp.in", M, H - 14);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i}/${pages}`, W - M, H - 14, { align: "right" });

        if (withWatermark) {
          pdf.setTextColor(220, 220, 220);
          pdf.setFontSize(48);
          pdf.text("HustleAI", W / 2, H / 2, { align: "center", angle: 30 });
        }
      }

      pdf.save(`${(resume.fullName || "Resume").replace(/\s/g, "_")}_HustleAI.pdf`);
      toast.success("Resume downloaded!");
    } catch (e: any) {
      toast.error(e.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const triggerDownload = () => {
    if (isPaid) downloadPDF(false);
    else setShowWatermarkDialog(true);
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {(["choose","template","questions","editor","score"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? "bg-primary text-primary-foreground scale-110 ring-4 ring-primary/20" :
                  ["choose","template","questions","editor","score"].indexOf(step) > i ? "bg-primary/30 text-primary" : "bg-muted text-muted-foreground"
                }`}>{i + 1}</div>
                {i < 4 && <div className={`w-8 h-0.5 ${["choose","template","questions","editor","score"].indexOf(step) > i ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ============ STEP 1: CHOOSE PATH ============ */}
            {step === "choose" && (
              <motion.div key="choose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm">
                    <FileText className="w-4 h-4" /> Free Tool · {usageCount}/{maxUses} used
                  </div>
                  <h1 className="text-3xl md:text-5xl font-display font-bold">
                    Build a <span className="text-gradient">resume that gets calls</span>
                  </h1>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Pick a path. We'll guide you through templates, a quick vibe-check, and AI autofill — done in under 5 minutes.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  <motion.button whileHover={{ scale: 1.02, y: -4 }} onClick={startUpload}
                    className="glass rounded-2xl p-8 text-left border-2 border-transparent hover:border-primary/50 transition-all group">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Upload className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-xl mb-1">I have a resume</h3>
                    <p className="text-sm text-muted-foreground mb-4">Paste or upload — we'll grade it with our ATS scanner & rebuild it stronger.</p>
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      Upload existing <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.button>

                  <motion.button whileHover={{ scale: 1.02, y: -4 }} onClick={startNew}
                    className="glass rounded-2xl p-8 text-left border-2 border-transparent hover:border-primary/50 transition-all group relative overflow-hidden">
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">RECOMMENDED</div>
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4">
                      <FilePlus2 className="w-7 h-7 text-violet-500" />
                    </div>
                    <h3 className="font-display font-bold text-xl mb-1">Start fresh</h3>
                    <p className="text-sm text-muted-foreground mb-4">No resume? No problem. We'll ask 3 quick questions and AI fills the rest.</p>
                    <div className="flex items-center gap-2 text-violet-500 font-medium text-sm">
                      Build new <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.button>
                </div>

                {atLimit && (
                  <div className="text-center">
                    <Button onClick={() => navigate("/payment")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Crown className="w-4 h-4 mr-2" /> Upgrade for unlimited resumes
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ============ STEP 2: TEMPLATE ============ */}
            {step === "template" && (
              <motion.div key="template" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl md:text-4xl font-display font-bold">Pick your <span className="text-gradient">template</span></h2>
                  <p className="text-muted-foreground">Each one is ATS-friendly and fully editable.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {TEMPLATES.map(t => (
                    <motion.button key={t.id} whileHover={{ scale: 1.03, y: -4 }}
                      onClick={() => setSelectedTemplate(t)}
                      className={`rounded-2xl overflow-hidden border-2 transition-all text-left ${
                        selectedTemplate.id === t.id ? "border-primary ring-4 ring-primary/20" : "border-border hover:border-primary/50"
                      }`}>
                      <TemplatePreview template={t} />
                      <div className="p-4 bg-card">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-display font-bold text-sm">{t.name}</h4>
                          {selectedTemplate.id === t.id && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{t.vibe}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
                <div className="flex justify-between max-w-3xl mx-auto pt-4">
                  <Button variant="outline" onClick={() => setStep("choose")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button onClick={() => setStep("questions")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ============ STEP 3: GAMIFIED QUESTIONS ============ */}
            {step === "questions" && (
              <motion.div key="questions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto space-y-6">
                <div className="text-center">
                  <span className="text-xs font-mono text-muted-foreground">Question {qIndex + 1} of {QUESTIONS.length}</span>
                  <Progress value={((qIndex + 1) / QUESTIONS.length) * 100} className="h-1.5 mt-2" />
                </div>
                <motion.div key={QUESTIONS[qIndex].id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                  className="glass rounded-2xl p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="text-5xl">{QUESTIONS[qIndex].emoji}</div>
                    <h3 className="text-2xl font-display font-bold">{QUESTIONS[qIndex].q}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {QUESTIONS[qIndex].options.map(opt => (
                      <button key={opt}
                        onClick={() => {
                          const next = { ...answers, [QUESTIONS[qIndex].id]: opt };
                          setAnswers(next);
                          if (qIndex < QUESTIONS.length - 1) setQIndex(qIndex + 1);
                          else {
                            if (path === "upload") {
                              // ask for paste then score
                              setStep("editor"); // we'll show paste box at top of editor when path=upload & no scoreData
                            } else setStep("editor");
                          }
                        }}
                        className={`p-4 rounded-xl border-2 text-sm font-medium transition-all hover:scale-[1.02] hover:border-primary ${
                          answers[QUESTIONS[qIndex].id] === opt ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </motion.div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => qIndex > 0 ? setQIndex(qIndex - 1) : setStep("template")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <span className="text-xs text-muted-foreground self-center">+10 XP per answer 🎮</span>
                </div>
              </motion.div>
            )}

            {/* ============ STEP 4: EDITOR ============ */}
            {step === "editor" && (
              <motion.div key="editor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="grid lg:grid-cols-2 gap-6">
                {/* Left: Form */}
                <div className="space-y-4">
                  {path === "upload" && !scoreData && (
                    <div className="glass rounded-2xl p-5 space-y-3 border-2 border-primary/30">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        <h3 className="font-display font-bold">Paste your existing resume</h3>
                      </div>
                      <Textarea rows={6} placeholder="Paste resume text..." value={pasted} onChange={e => setPasted(e.target.value)} className="font-mono text-xs" />
                      <Button onClick={scoreUpload} disabled={scoring} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                        {scoring ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running ATS scan...</> : <><Zap className="w-4 h-4 mr-2" /> Get my ATS score</>}
                      </Button>
                    </div>
                  )}

                  <div className="glass rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold">Your details</h3>
                      <span className="text-xs text-muted-foreground">{usageCount}/{maxUses} AI uses</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Full name" value={resume.fullName} onChange={e => setResume({ ...resume, fullName: e.target.value })} />
                      <Input placeholder="Job title" value={resume.title} onChange={e => setResume({ ...resume, title: e.target.value })} />
                      <Input placeholder="Email" value={resume.email} onChange={e => setResume({ ...resume, email: e.target.value })} />
                      <Input placeholder="Phone" value={resume.phone} onChange={e => setResume({ ...resume, phone: e.target.value })} />
                      <Input placeholder="Location" value={resume.location} onChange={e => setResume({ ...resume, location: e.target.value })} className="col-span-2" />
                    </div>

                    {(["summary","experience","skills","education","achievements"] as (keyof ResumeData)[]).map(field => (
                      <div key={field} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field}</label>
                          <Button size="sm" variant="ghost" disabled={aiBusy === field} onClick={() => aiFill(field)}
                            className="h-7 text-xs text-primary hover:bg-primary/10">
                            {aiBusy === field ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                            AI fill
                          </Button>
                        </div>
                        <Textarea rows={field === "experience" ? 5 : 3}
                          placeholder={`Your ${field}...`}
                          value={resume[field]}
                          onChange={e => setResume({ ...resume, [field]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep("questions")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                    <Button onClick={triggerDownload} disabled={downloading} className="flex-1 bg-gradient-primary text-primary-foreground btn-press">
                      {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                      Download PDF
                    </Button>
                  </div>
                </div>

                {/* Right: Live preview */}
                <div className="lg:sticky lg:top-24 self-start">
                  <div ref={previewRef}>
                    <LivePreview template={selectedTemplate} resume={resume} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============ STEP 5: SCORE (after upload scan) ============ */}
            {step === "score" && scoreData && (
              <motion.div key="score" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <Trophy className="w-10 h-10 text-primary mx-auto" />
                  <h2 className="text-3xl font-display font-bold">Your ATS scan is in</h2>
                </div>
                <div className="glass rounded-2xl p-8 text-center space-y-4">
                  <div className="relative w-40 h-40 mx-auto">
                    <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="10"
                        strokeDasharray={`${animatedScore * 3.14} 314`} strokeLinecap="round"
                        className="transition-all duration-100" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="font-display text-4xl font-bold text-primary">{animatedScore}</span>
                      <span className="text-xs text-muted-foreground">ATS Score</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                    {[
                      { l: "Keywords", v: scoreData.keyword_match },
                      { l: "Format", v: scoreData.format_score },
                      { l: "Readability", v: scoreData.readability },
                    ].map(s => (
                      <div key={s.l} className="p-3 rounded-lg bg-muted/30">
                        <p className="font-mono text-lg font-bold text-primary">{s.v}</p>
                        <p className="text-[10px] text-muted-foreground">{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="glass rounded-xl p-5">
                    <h4 className="font-display font-bold text-sm mb-3 text-emerald-500">✓ Strengths</h4>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {(scoreData.strengths || []).slice(0, 5).map((s: string, i: number) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                  <div className="glass rounded-xl p-5">
                    <h4 className="font-display font-bold text-sm mb-3 text-amber-500">⚠ Improve</h4>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {(scoreData.improvements || []).slice(0, 5).map((s: string, i: number) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                </div>

                <Button onClick={() => setStep("editor")} className="w-full bg-gradient-primary text-primary-foreground btn-press h-12">
                  <Sparkles className="w-5 h-5 mr-2" /> Rebuild it stronger →
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Watermark Dialog */}
      <Dialog open={showWatermarkDialog} onOpenChange={setShowWatermarkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> Get a watermark-free PDF</DialogTitle>
            <DialogDescription>
              Free downloads include a small "HustleAI" watermark. Upgrade to Pro to remove it forever — or download free now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => { setShowWatermarkDialog(false); downloadPDF(true); }}>
              <Download className="w-4 h-4 mr-2" /> Download free (with watermark)
            </Button>
            <Button onClick={() => { setShowWatermarkDialog(false); navigate("/payment"); }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <Crown className="w-4 h-4 mr-2" /> Upgrade to remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}

// =====================================================================
// Template Preview (small thumbnail)
// =====================================================================
function TemplatePreview({ template }: { template: Template }) {
  const accent = `hsl(${template.accent})`;
  const bg = `hsl(${template.bg})`;
  const text = `hsl(${template.text})`;
  return (
    <div className="aspect-[3/4] p-3 text-[6px] leading-tight overflow-hidden" style={{ background: bg, color: text }}>
      {template.layout === "sidebar" ? (
        <div className="flex h-full gap-2">
          <div className="w-1/3 rounded p-2" style={{ background: accent, color: "white" }}>
            <div className="h-3 w-3 rounded-full bg-white/40 mb-2" />
            <div className="h-1 w-full bg-white/40 mb-1" />
            <div className="h-1 w-3/4 bg-white/40 mb-3" />
            <div className="h-1 w-1/2 bg-white/30 mb-1" />
            <div className="h-1 w-2/3 bg-white/30 mb-1" />
            <div className="h-1 w-1/2 bg-white/30" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="h-2 w-2/3" style={{ background: text, opacity: 0.8 }} />
            <div className="h-1 w-1/2" style={{ background: accent }} />
            <div className="h-px w-full mt-2 mb-1" style={{ background: accent, opacity: 0.3 }} />
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-0.5 w-full" style={{ background: text, opacity: 0.2 }} />)}
          </div>
        </div>
      ) : template.layout === "bold" ? (
        <div className="space-y-1">
          <div className="h-6 w-full rounded" style={{ background: accent }} />
          <div className="h-2 w-1/2 mt-2" style={{ background: text, opacity: 0.8 }} />
          <div className="h-1 w-1/3" style={{ background: accent }} />
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-0.5 w-full" style={{ background: text, opacity: 0.2 }} />)}
        </div>
      ) : template.layout === "modern" ? (
        <div className="space-y-1">
          <div className="flex justify-between items-end border-b pb-1" style={{ borderColor: accent }}>
            <div className="h-2 w-1/2" style={{ background: text, opacity: 0.8 }} />
            <div className="h-1 w-1/4" style={{ background: accent }} />
          </div>
          {Array.from({ length: 14 }).map((_, i) => <div key={i} className="h-0.5 w-full" style={{ background: text, opacity: 0.2 }} />)}
        </div>
      ) : template.layout === "elegant" ? (
        <div className="space-y-1 text-center">
          <div className="h-2 w-1/2 mx-auto" style={{ background: text, opacity: 0.8 }} />
          <div className="h-px w-1/3 mx-auto my-1" style={{ background: accent }} />
          <div className="h-1 w-2/3 mx-auto" style={{ background: accent }} />
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-0.5 w-full" style={{ background: text, opacity: 0.2 }} />)}
        </div>
      ) : template.layout === "minimal" ? (
        <div className="space-y-1">
          <div className="h-2 w-1/3" style={{ background: text, opacity: 0.9 }} />
          <div className="h-1 w-1/4" style={{ background: text, opacity: 0.5 }} />
          <div className="h-px w-full my-2" style={{ background: text, opacity: 0.2 }} />
          {Array.from({ length: 14 }).map((_, i) => <div key={i} className="h-0.5 w-full" style={{ background: text, opacity: 0.2 }} />)}
        </div>
      ) : (
        // classic
        <div className="space-y-1">
          <div className="h-1 w-full" style={{ background: accent }} />
          <div className="h-2 w-2/3 mt-1" style={{ background: text, opacity: 0.8 }} />
          <div className="h-1 w-1/3" style={{ background: accent }} />
          {Array.from({ length: 14 }).map((_, i) => <div key={i} className="h-0.5 w-full" style={{ background: text, opacity: 0.2 }} />)}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Live Preview (full)
// =====================================================================
function LivePreview({ template, resume }: { template: Template; resume: ResumeData }) {
  const accent = `hsl(${template.accent})`;
  const bg = `hsl(${template.bg})`;
  const text = `hsl(${template.text})`;
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl border border-border">
      <div className="aspect-[210/297] p-8 relative overflow-auto" style={{ background: bg, color: text }}>
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: accent }} />
        <div className="absolute top-2 right-3 text-[9px] font-semibold opacity-50" style={{ color: accent }}>HustleAI</div>

        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: text }}>{resume.fullName || "Your Name"}</h2>
            <p className="text-sm font-medium" style={{ color: accent }}>{resume.title || "Professional Title"}</p>
            <p className="text-[10px] mt-1 opacity-70">
              {[resume.email, resume.phone, resume.location].filter(Boolean).join("  •  ") || "email · phone · location"}
            </p>
          </div>
          <div className="h-px" style={{ background: accent, opacity: 0.4 }} />

          {(["summary","experience","skills","education","achievements"] as (keyof ResumeData)[]).map(f => (
            resume[f] ? (
              <div key={f}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>{f}</h3>
                <p className="text-[11px] leading-relaxed whitespace-pre-wrap opacity-90">{resume[f]}</p>
              </div>
            ) : null
          ))}
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: accent }} />
        <div className="absolute bottom-2 left-3 text-[8px] opacity-50" style={{ color: accent }}>hustlaiapp.in</div>
      </div>
    </div>
  );
}