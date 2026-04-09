import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Loader2, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function ResumeOptimizer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState("");
  const [targetCategory, setTargetCategory] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  if (!user) { navigate("/login"); return null; }

  const optimize = async () => {
    if (!resumeText.trim() || !targetCategory.trim()) { toast.error("Resume text and target category are required"); return; }
    setLoading(true);
    setResult("");
    try {
      const { data, error } = await supabase.functions.invoke("resume-optimizer", {
        body: { resume_text: resumeText, target_category: targetCategory, target_role: targetRole },
      });
      if (error) throw error;
      setResult(data.optimized_resume);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm">
              <FileText className="w-4 h-4" /> Free Tool
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold">
              AI Resume <span className="text-gradient">Optimizer</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Re-skin your CV for any freelance category. Get a mock portfolio piece and optimized profile bio.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 md:p-8 space-y-5">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Paste Your Resume / CV *</label>
                <Textarea placeholder="Paste your resume text here..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows={8} />
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
            <Button className="w-full bg-gradient-primary text-primary-foreground h-12 text-base" onClick={optimize} disabled={loading}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Optimizing...</> : <><Sparkles className="w-5 h-5 mr-2" /> Optimize My Resume</>}
            </Button>
          </motion.div>

          {loading && !result && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass rounded-xl p-4 space-y-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              ))}
              <p className="text-center text-muted-foreground text-sm italic">✨ Tailoring your resume for maximum impact...</p>
            </div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 md:p-8 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-display font-bold text-xl">Optimized Resume</h2>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
