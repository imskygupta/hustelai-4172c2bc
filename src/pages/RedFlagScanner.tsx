import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FullscreenTextarea } from "@/components/ai/FullscreenTextarea";
import { StickyGenerateBar } from "@/components/ai/StickyGenerateBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ShieldAlert, Loader2, Zap, AlertTriangle, CheckCircle, MessageCircle, Copy, HelpCircle, Lock, ClipboardPaste, Eye, MessageSquareReply } from "lucide-react";
import { AIToolHero } from "@/components/tools/AIToolHero";
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
      <main className="container mx-auto px-4 pt-24 pb-32 md:pb-16 max-w-5xl">
        <AIToolHero
          eyebrow="Client Red-Flag Scanner"
          title={<>Spot <span className="text-gradient">bad clients</span> before they cost you.</>}
          subtitle="Paste a client message or job post — get a stoplight risk report (Red / Yellow / Green) with smart questions and a copy-paste reply that protects your terms."
          Icon={ShieldAlert}
          accent="from-rose-500 via-amber-500 to-emerald-500"
          tier={tier.toUpperCase()}
          usage={{ used: usageCount, max: maxUses }}
          steps={[
            { icon: ClipboardPaste, label: "Paste the message", sub: "DM, email, or job post — we read the whole thing." },
            { icon: Eye, label: "AI scans for traps", sub: "Scope creep, payment risk, vague briefs, ego signals." },
            { icon: MessageSquareReply, label: "Get a safe reply", sub: "Smart questions + a reply you can copy in one click." },
          ]}
          stats={[
            { value: "27+", label: "Risk patterns" },
            { value: "<6s", label: "Avg scan time" },
            { value: "3-color", label: "Verdict system" },
          ]}
        />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-5 md:p-6 space-y-4 mb-6">
          <h2 className="font-display font-bold">Paste the client communication</h2>
          <FullscreenTextarea
            value={communication}
            onChange={setCommunication}
            placeholder="Paste their full message, job post, or DM thread here..."
            rows={7}
            fullscreenTitle="Client message"
            ariaLabel="Client communication"
            className="min-h-[180px]"
          />
          <Button onClick={handleScan} disabled={generating || atLimit} className="w-full bg-gradient-primary text-primary-foreground h-12">
            {generating ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Scanning for red flags...</>
              : atLimit ? <><Lock className="w-5 h-5 mr-2" /> Limit reached — upgrade</>
              : <><Zap className="w-5 h-5 mr-2" /> Run Stoplight Scan</>}
          </Button>
        </motion.div>

        {result && verdict && VerdictIcon && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Verdict header */}
            <div className={`rounded-2xl p-6 md:p-8 ${verdict.bg} border-2 ${verdict.border} text-center`}>
              <VerdictIcon className={`w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 ${verdict.color}`} />
              <h2 className={`text-2xl md:text-3xl font-display font-bold ${verdict.color} mb-2`}>{verdict.label}</h2>
              <p className="text-sm max-w-2xl mx-auto leading-relaxed">{result.verdict_reason}</p>
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
            <div className="glass rounded-2xl p-5 md:p-6 space-y-3 border-primary/30 sticky bottom-2 md:static">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display font-bold text-sm md:text-base"><MessageCircle className="w-5 h-5 text-primary" /> Suggested reply</h3>
                <Button variant="outline" size="sm" className="min-h-tap" onClick={() => { navigator.clipboard.writeText(result.suggested_reply); toast({ title: "Copied!" }); }}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 max-h-[40vh] overflow-y-auto overscroll-contain">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{result.suggested_reply}</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Mobile sticky scan bar */}
      {!result && (
        <StickyGenerateBar
          status={
            generating
              ? "Scanning…"
              : atLimit
                ? "Daily limit reached"
                : `${Math.max(0, maxUses - usageCount)} of ${maxUses} scans left`
          }
          action={
            <Button
              size="sm"
              onClick={handleScan}
              disabled={generating || atLimit}
              className="bg-gradient-primary text-primary-foreground min-h-tap px-4"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : atLimit ? <Lock className="w-4 h-4" /> : <><Zap className="w-4 h-4 mr-1" /> Scan</>}
            </Button>
          }
        />
      )}

      <Footer />
    </div>
  );
}