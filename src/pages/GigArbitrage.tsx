import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, Copy, Check, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";

export default function GigArbitrage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-tier", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  if (!user) { navigate("/login"); return null; }

  const tier = profile?.subscription_tier || "free";
  const hasAccess = tier !== "free";

  const analyze = async () => {
    if (!category.trim()) { toast.error("Enter a category"); return; }
    setLoading(true);
    setAnalysis("");
    try {
      const { data, error } = await supabase.functions.invoke("gig-arbitrage", {
        body: { category, skills },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
      toast.success("Arbitrage analysis ready!");
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(analysis);
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-accent text-sm">
              <TrendingUp className="w-4 h-4" /> Pro+ Tool
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold">
              Gig-Arbitrage <span className="text-gradient">Monitor</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Find price gaps across platforms. Buy low, sell high — become the agency.
            </p>
          </motion.div>

          {!hasAccess ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass rounded-2xl p-8 text-center space-y-4 border-accent/20">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
              <h2 className="font-display font-bold text-xl">Pro+ Feature</h2>
              <p className="text-muted-foreground">Upgrade to Pro or above to access the Gig Arbitrage Monitor.</p>
              <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/plans")}>
                View Plans
              </Button>
            </motion.div>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-6 md:p-8 space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Freelance Category *</label>
                    <Input placeholder="e.g. Logo Design, Web Development" value={category} onChange={(e) => setCategory(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Your Skills (optional)</label>
                    <Input placeholder="e.g. Figma, AI tools, React" value={skills} onChange={(e) => setSkills(e.target.value)} />
                  </div>
                </div>
                <Button className="w-full bg-gradient-primary text-primary-foreground h-12 text-base" onClick={analyze} disabled={loading}>
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Analyzing Markets...</> : <><Sparkles className="w-5 h-5 mr-2" /> Find Arbitrage Opportunities</>}
                </Button>
              </motion.div>

              {loading && !analysis && (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="glass rounded-xl p-4 space-y-3 animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  ))}
                  <p className="text-center text-muted-foreground text-sm italic">📊 Scanning markets for arbitrage gaps...</p>
                </div>
              )}

              {analysis && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 md:p-8 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="font-display font-bold text-xl">Arbitrage Analysis</h2>
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
