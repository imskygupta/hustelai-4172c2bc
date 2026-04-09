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
import { Rocket, Loader2, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function HustleBlueprint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hustleTitle, setHustleTitle] = useState("");
  const [hustleDesc, setHustleDesc] = useState("");
  const [userSkills, setUserSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState("");
  const [copied, setCopied] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  const generateBlueprint = async () => {
    if (!hustleTitle.trim()) { toast.error("Enter a hustle title"); return; }
    setLoading(true);
    setBlueprint("");
    try {
      const { data, error } = await supabase.functions.invoke("hustle-blueprint", {
        body: { hustle_title: hustleTitle, hustle_description: hustleDesc, user_skills: userSkills },
      });
      if (error) throw error;
      setBlueprint(data.blueprint);
      toast.success("Blueprint generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate blueprint");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(blueprint);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm">
              <Rocket className="w-4 h-4" /> Free Tool
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold">
              Hustle-to-Action <span className="text-gradient">Blueprint</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get a detailed 7-day action plan to land your first gig — with targets, outreach scripts, and daily checklists.
            </p>
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
                <Textarea placeholder="Brief description of the hustle..." value={hustleDesc} onChange={(e) => setHustleDesc(e.target.value)} rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Skills (optional)</label>
                <Input placeholder="e.g. Canva, copywriting, basic SEO" value={userSkills} onChange={(e) => setUserSkills(e.target.value)} />
              </div>
            </div>
            <Button className="w-full bg-gradient-primary text-primary-foreground h-12 text-base" onClick={generateBlueprint} disabled={loading}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Generating Blueprint...</> : <><Sparkles className="w-5 h-5 mr-2" /> Generate 7-Day Blueprint</>}
            </Button>
          </motion.div>

          {loading && !blueprint && (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass rounded-xl p-4 space-y-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-4/5" />
                </div>
              ))}
              <p className="text-center text-muted-foreground text-sm italic">🧠 Crafting your personalized blueprint...</p>
            </div>
          )}

          {blueprint && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 md:p-8 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-display font-bold text-xl">Your 7-Day Blueprint</h2>
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
