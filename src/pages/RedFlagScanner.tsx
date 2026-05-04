import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ShieldAlert, Loader2, Zap, AlertTriangle, CheckCircle, MessageCircle, Copy, HelpCircle, Lock } from "lucide-react";
import { getMaxUses, getUsage, bumpUsage, awardXP } from "@/lib/tool-limits";
import { useEffect } from "react";

type Risk = { severity: "high" | "medium" | "low"; title: string; explanation: string };
type Benefit = { title: string; explanation: string };
type Result = {
  verdict: "GO" | "CAUTION" | "STOP";
  verdict_reason: string;
  risks: Risk[];
  benefits: Benefit[];
  questions_to_ask: string[];
  suggested_reply: string;
};

const verdictMap = {
  GO: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "GREEN — Proceed", icon: CheckCircle },
  CAUTION: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "YELLOW — Caution", icon: AlertTriangle },
  STOP: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", label: "RED — Stop", icon: ShieldAlert },
};

export default function RedFlagScanner() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [communication, setCommunication] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [generating, setGenerating] = useState(false);

  const tier = profile?.subscription_tier || "free";
  const maxUses = getMaxUses(tier);
  const [usageCount, setUsageCount] = useState(0);
  useEffect(() => { if (user) setUsageCount(getUsage("redflag", user.id)); }, [user]);
  const atLimit = usageCount >= maxUses;

  const handleScan = async () => {
    if (atLimit) { toast({ title: `Limit reached (${maxUses}/${maxUses})`, description: "Upgrade for more uses.", variant: "destructive" }); return; }
    if (communication.trim().length < 30) {
      toast({ title: "Need more text", description: "Paste at least 30 characters of the client message.", variant: "destructive" });
      return;
    }
    setGenerating(true); setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/red-flag-scanner`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ communication }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed");
      setResult(json.result);
      setUsageCount(bumpUsage("redflag", user!.id));
      awardXP(user!.id, 10);
      toast({ title: "Scan complete 🛡️" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) { navigate("/login"); return null; }

  const verdict = result ? verdictMap[result.verdict] : null;
  const VerdictIcon = verdict?.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4 px-5 py-2 rounded-full bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-emerald-500/20 border border-yellow-500/30">
            <ShieldAlert className="w-5 h-5 text-yellow-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-500">Client Red-Flag Scanner</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient mb-3">Spot bad clients. Keep good ones.</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">Paste a client message or job post — get a stoplight risk report (Red / Yellow / Green) with smart questions and a suggested reply.</p>
          <Badge className="mt-3 bg-yellow-500/10 text-yellow-500 border-yellow-500/30">{usageCount}/{maxUses} uses · {tier.toUpperCase()} tier</Badge>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-4 mb-6">
          <h2 className="font-display font-bold">Paste the client communication</h2>
          <Textarea placeholder="Paste their full message, job post, or DM thread here..." value={communication} onChange={(e) => setCommunication(e.target.value)} className="min-h-[180px]" />
          <Button onClick={handleScan} disabled={generating || atLimit} className="w-full bg-gradient-primary text-primary-foreground h-12">
            {generating ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Scanning for red flags...</>
              : atLimit ? <><Lock className="w-5 h-5 mr-2" /> Limit reached — upgrade</>
              : <><Zap className="w-5 h-5 mr-2" /> Run Stoplight Scan</>}
          </Button>
        </motion.div>

        {result && verdict && VerdictIcon && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Verdict header */}
            <div className={`rounded-2xl p-8 ${verdict.bg} border-2 ${verdict.border} text-center`}>
              <VerdictIcon className={`w-16 h-16 mx-auto mb-3 ${verdict.color}`} />
              <h2 className={`text-3xl font-display font-bold ${verdict.color} mb-2`}>{verdict.label}</h2>
              <p className="text-sm max-w-2xl mx-auto">{result.verdict_reason}</p>
            </div>

            {/* Risks (red) + Benefits (green) */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5 bg-red-500/5 border-2 border-red-500/30 space-y-3">
                <h3 className="flex items-center gap-2 font-display font-bold text-red-500"><AlertTriangle className="w-5 h-5" /> Risks Detected</h3>
                {result.risks.map((r, i) => (
                  <div key={i} className="bg-card/50 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">{r.title}</p>
                      <Badge className={`text-[10px] ${r.severity === "high" ? "bg-red-500/20 text-red-500" : r.severity === "medium" ? "bg-yellow-500/20 text-yellow-500" : "bg-blue-500/20 text-blue-500"}`} variant="outline">
                        {r.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.explanation}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl p-5 bg-emerald-500/5 border-2 border-emerald-500/30 space-y-3">
                <h3 className="flex items-center gap-2 font-display font-bold text-emerald-500"><CheckCircle className="w-5 h-5" /> Positive Signals</h3>
                {result.benefits.map((b, i) => (
                  <div key={i} className="bg-card/50 rounded-xl p-3 space-y-1">
                    <p className="font-bold text-sm">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Questions */}
            <div className="glass rounded-2xl p-6 space-y-3">
              <h3 className="flex items-center gap-2 font-display font-bold"><HelpCircle className="w-5 h-5 text-primary" /> Smart questions to ask before saying yes</h3>
              <ul className="space-y-2">
                {result.questions_to_ask.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><span className="font-bold text-primary">{i + 1}.</span><span>{q}</span></li>
                ))}
              </ul>
            </div>

            {/* Suggested reply */}
            <div className="glass rounded-2xl p-6 space-y-3 border-primary/30">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display font-bold"><MessageCircle className="w-5 h-5 text-primary" /> Suggested reply</h3>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(result.suggested_reply); toast({ title: "Copied!" }); }}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
              </div>
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.suggested_reply}</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}