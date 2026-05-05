import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Film, Loader2, Zap, Sparkles, Camera, Mic, Type as TypeIcon, Clock, Lock } from "lucide-react";
import { getMaxUses, getUsage, bumpUsage, awardXP } from "@/lib/tool-limits";
import { useEffect } from "react";

type Scene = { scene_number: number; visual: string; voiceover: string; text_overlay: string; duration_seconds: number };
type Result = { title: string; hook: string; scenes: Scene[]; cta: string; hashtags: string[] };

export default function FacelessContent() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("personal-finance");
  const [tone, setTone] = useState("engaging");
  const [result, setResult] = useState<Result | null>(null);
  const [generating, setGenerating] = useState(false);

  const tier = profile?.subscription_tier || "free";
  const maxUses = getMaxUses(tier);
  const [usageCount, setUsageCount] = useState(0);
  useEffect(() => { if (user) setUsageCount(getUsage("faceless", user.id)); }, [user]);
  const atLimit = usageCount >= maxUses;

  const handleGenerate = async () => {
    if (atLimit) { toast({ title: `Limit reached (${maxUses}/${maxUses})`, description: "Upgrade for more uses.", variant: "destructive" }); return; }
    if (topic.trim().length < 5) { toast({ title: "Topic too short", variant: "destructive" }); return; }
    setGenerating(true); setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/faceless-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, niche, tone }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed");
      setResult(json.result);
      setUsageCount(bumpUsage("faceless", user!.id));
      awardXP(user!.id, 10);
      toast({ title: "Storyboard ready! 🎬" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) { navigate("/login"); return null; }

  const totalDuration = result?.scenes.reduce((s, x) => s + x.duration_seconds, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4 px-5 py-2 rounded-full bg-primary/15 border border-primary/40">
            <Film className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Faceless Content Repurposer</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-3">From idea to <span className="text-primary">viral storyboard.</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">Get a 6-scene short-form video script with visuals, voiceover, and text overlays — ready for Runway, Pika, or your editor.</p>
          <Badge className="mt-3 bg-yellow-500/10 text-yellow-500 border-yellow-500/30">{usageCount}/{maxUses} uses · {tier.toUpperCase()} tier</Badge>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-4 mb-6">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /><h2 className="font-display font-bold">Your topic</h2></div>
          <Input placeholder="e.g. '5 side hustles college students can start in 2026'" value={topic} onChange={(e) => setTopic(e.target.value)} className="h-12" />
          <div className="grid md:grid-cols-2 gap-4">
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal-finance">💰 Personal Finance</SelectItem>
                <SelectItem value="tech">💻 Tech & SaaS</SelectItem>
                <SelectItem value="self-improvement">🧠 Self-Improvement</SelectItem>
                <SelectItem value="business">📈 Business / Startups</SelectItem>
                <SelectItem value="lifestyle">✨ Lifestyle</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="engaging">🎯 Engaging</SelectItem>
                <SelectItem value="cinematic">🎬 Cinematic</SelectItem>
                <SelectItem value="motivational">🔥 Motivational</SelectItem>
                <SelectItem value="educational">📚 Educational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generating || atLimit} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12">
            {generating ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Building storyboard...</>
              : atLimit ? <><Lock className="w-5 h-5 mr-2" /> Limit reached — upgrade</>
              : <><Zap className="w-5 h-5 mr-2" /> Generate 6-Scene Storyboard</>}
          </Button>
        </motion.div>

        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="glass rounded-2xl p-6 space-y-3">
              <h2 className="text-2xl font-display font-bold text-gradient-accent">{result.title}</h2>
              <p className="text-sm italic text-muted-foreground">"{result.hook}"</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" /> {totalDuration}s total</Badge>
                {result.hashtags.slice(0, 8).map(h => <Badge key={h} variant="secondary" className="text-[10px]">#{h.replace(/^#/, "")}</Badge>)}
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.scenes.map((scene) => (
                <motion.div key={scene.scene_number} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: scene.scene_number * 0.05 }}
                  className="glass rounded-xl p-5 space-y-3 border-accent/20 hover:border-accent/50 hover:shadow-glow transition-all">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-gradient-to-r from-accent to-primary text-primary-foreground">Scene {scene.scene_number}</Badge>
                    <span className="text-xs text-muted-foreground">{scene.duration_seconds}s</span>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-[10px] uppercase font-bold text-accent mb-1"><Camera className="w-3 h-3" /> Visual</p>
                    <p className="text-xs leading-relaxed">{scene.visual}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-[10px] uppercase font-bold text-primary mb-1"><Mic className="w-3 h-3" /> Voiceover</p>
                    <p className="text-xs italic">"{scene.voiceover}"</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-[10px] uppercase font-bold text-yellow-500 mb-1"><TypeIcon className="w-3 h-3" /> On-screen text</p>
                    <p className="text-xs font-bold">{scene.text_overlay}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="glass rounded-2xl p-6 border-2 border-primary/30">
              <p className="text-[10px] uppercase font-bold text-primary mb-2">Call to Action</p>
              <p className="text-sm font-medium">{result.cta}</p>
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}