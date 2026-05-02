import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { DollarSign, Loader2, RefreshCw, Sparkles, CheckCircle, Trophy, Zap, Target } from "lucide-react";

type Tier = { name: string; price: number; delivery_days: number; what_you_get: string[]; best_for: string };
type Result = { currency: string; tiers: Tier[]; rationale: string; psych_tip: string };

export default function GigPriceCalculator() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [service, setService] = useState("");
  const [experience, setExperience] = useState("intermediate");
  const [market, setMarket] = useState("Indian freelance market");
  const [result, setResult] = useState<Result | null>(null);
  const [generating, setGenerating] = useState(false);

  const isFree = profile?.subscription_tier === "free";

  const handleGenerate = async () => {
    if (service.trim().length < 10) {
      toast({ title: "Too short", description: "Describe your service in at least 10 characters.", variant: "destructive" });
      return;
    }
    setGenerating(true); setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gig-price-calculator`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ service_description: service, experience_level: experience, target_market: market }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed");
      setResult(json.result);
      toast({ title: "Pricing tiers ready! 💰" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) { navigate("/login"); return null; }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4 px-5 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Gig-Price Calculator</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient mb-3">Quote like a pro.</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">Get a 3-tier pricing structure (Basic / Standard / Premium) instantly — using anchor pricing psychology that makes clients pick the middle tier.</p>
          {isFree && <Badge className="mt-3 bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Free tier: 3 uses</Badge>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-4 mb-6">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /><h2 className="font-display font-bold">Describe your service</h2></div>
          <Textarea placeholder="e.g. 'Logo design with 3 concepts, 2 revisions, and brand guidelines for early-stage startups'" value={service} onChange={(e) => setService(e.target.value)} className="min-h-[120px]" />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Experience Level</label>
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">🌱 Beginner (0-1 yrs)</SelectItem>
                  <SelectItem value="intermediate">⚡ Intermediate (1-3 yrs)</SelectItem>
                  <SelectItem value="expert">🏆 Expert (3+ yrs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target Market</label>
              <Select value={market} onValueChange={setMarket}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indian freelance market">🇮🇳 Indian market</SelectItem>
                  <SelectItem value="US/EU clients">🌍 US / EU clients</SelectItem>
                  <SelectItem value="Mixed global">🌐 Mixed global</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="w-full bg-gradient-primary text-primary-foreground h-12">
            {generating ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Calculating tiers...</> : <><Zap className="w-5 h-5 mr-2" /> Generate Pricing Tiers</>}
          </Button>
        </motion.div>

        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {result.tiers.map((tier, i) => {
                const isStandard = i === 1;
                return (
                  <motion.div key={tier.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className={`glass rounded-2xl p-6 space-y-4 relative ${isStandard ? "border-2 border-primary shadow-glow scale-105" : ""}`}>
                    {isStandard && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-primary text-primary-foreground text-[10px] font-bold uppercase">
                        Most Popular
                      </div>
                    )}
                    <div>
                      <h3 className="font-display font-bold text-lg">{tier.name}</h3>
                      <p className="text-xs text-muted-foreground">{tier.best_for}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-display font-bold text-gradient">₹{tier.price.toLocaleString()}</span>
                    </div>
                    <Badge variant="outline" className="text-xs"><Target className="w-3 h-3 mr-1" /> {tier.delivery_days} days</Badge>
                    <ul className="space-y-2">
                      {tier.what_you_get.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs"><CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /><span>{item}</span></li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
            <div className="glass rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /><h3 className="font-display font-bold">Why this pricing works</h3></div>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.rationale}</p>
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                <p className="text-xs font-bold text-primary mb-1">💡 Psychology tip</p>
                <p className="text-sm">{result.psych_tip}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}><RefreshCw className={`w-4 h-4 mr-1 ${generating ? "animate-spin" : ""}`} /> Regenerate</Button>
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}