import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Download, Bookmark, BookmarkCheck, Loader2,
  DollarSign, TrendingUp, Clock, Zap, Flame, BookOpen, ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { openRoadmapPrint } from "@/lib/roadmap-print";

interface HustleData {
  id: string;
  title: string;
  category: string;
  description: string;
  startup_cost: string;
  earnings: string;
  effort: number;
  type: string;
  time_commitment: string | null;
  is_trending: boolean | null;
  tags: string[] | null;
}

export default function HustleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [hustle, setHustle] = useState<HustleData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [roadmapId, setRoadmapId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadHustle();
  }, [id, user]);

  const loadHustle = async () => {
    if (!id) return;

    // Check if roadmap already exists for this hustle
    if (user) {
      const { data: existing } = await supabase
        .from("hustle_roadmaps")
        .select("id")
        .eq("user_id", user.id)
        .eq("hustle_id", id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (existing && existing.length > 0) {
        setRoadmapId(existing[0].id);
      }
    }

    const cached = sessionStorage.getItem(`hustle_${id}`);
    if (cached) {
      setHustle(JSON.parse(cached) as HustleData);
    } else {
      const { data } = await supabase.from("side_hustles").select("*").eq("id", id).single();
      if (data) {
        const h = data as HustleData;
        setHustle(h);
        sessionStorage.setItem(`hustle_${id}`, JSON.stringify(h));
      }
    }

    autoBookmark();
    checkSaved();
  };

  const checkSaved = async () => {
    if (!user || !id) return;
    const { data } = await supabase.from("saved_hustles").select("id").eq("user_id", user.id).eq("hustle_id", id);
    if (data && data.length > 0) setIsSaved(true);
  };

  const autoBookmark = async () => {
    if (!user || !id) return;
    await supabase.from("saved_hustles").upsert({
      user_id: user.id, hustle_id: id, status: "saved",
    } as any, { onConflict: "user_id,hustle_id" });
    setIsSaved(true);
  };

  const generateRoadmap = async () => {
    if (!user || !profile || !hustle || !id) return;

    const tier = profile.subscription_tier;
    const maxSearches = tier === "free" ? 3 : tier === "pro" ? 15 : 999;
    if (profile.search_count >= maxSearches) {
      toast({ title: "Search limit reached", description: `Upgrade to continue.`, variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      await (supabase as any).rpc("increment_own_search_count");
      refreshProfile();

      const { data, error } = await supabase.functions.invoke("hustle-roadmap", {
        body: {
          title: hustle.title, category: hustle.category, description: hustle.description,
          earnings: hustle.earnings, startup_cost: hustle.startup_cost, type: hustle.type,
        },
      });
      if (error) throw error;

      const content = data?.roadmap || "Failed to generate roadmap.";

      // Save to database
      const { data: saved, error: saveErr } = await supabase.from("hustle_roadmaps").insert({
        user_id: user.id,
        hustle_id: id,
        hustle_title: hustle.title,
        hustle_category: hustle.category,
        hustle_description: hustle.description,
        hustle_earnings: hustle.earnings,
        hustle_startup_cost: hustle.startup_cost || "",
        hustle_type: hustle.type,
        content,
      } as any).select("id").single();

      if (saveErr) throw saveErr;
      setRoadmapId(saved.id);
      setShowDialog(true);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || !id) return;
    if (isSaved) {
      await supabase.from("saved_hustles").delete().eq("user_id", user.id).eq("hustle_id", id);
      setIsSaved(false);
      toast({ title: "Removed from saved" });
    } else {
      await supabase.from("saved_hustles").upsert({ user_id: user.id, hustle_id: id, status: "saved" } as any);
      setIsSaved(true);
      toast({ title: "💾 Saved!", description: "Track it in My Hustles" });
    }
  };

  const difficultyLabel = (effort: number) => {
    if (effort <= 1) return "Beginner";
    if (effort <= 3) return "Intermediate";
    return "Advanced";
  };

  if (!hustle) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          {/* Top bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Button variant="ghost" onClick={() => navigate(-1)} className="hover:text-primary">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSave}
                className={isSaved ? "border-primary text-primary" : "hover:border-primary/50"}>
                {isSaved ? <BookmarkCheck className="w-4 h-4 mr-1" /> : <Bookmark className="w-4 h-4 mr-1" />}
                {isSaved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>

          {/* Hustle Info Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-primary border-primary/30">{hustle.category}</Badge>
              <Badge variant="outline">{hustle.type}</Badge>
              {hustle.is_trending && (
                <Badge className="bg-destructive/20 text-destructive border-destructive/30" variant="outline">
                  <Flame className="w-3 h-3 mr-0.5" /> Trending
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">{hustle.title}</h1>
            <p className="text-muted-foreground text-lg">{hustle.description}</p>
            <div className="flex items-center gap-6 flex-wrap text-sm">
              <div className="flex items-center gap-1.5 text-primary">
                <DollarSign className="w-4 h-4" />
                <span>Investment: {hustle.startup_cost || "$0"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-accent">
                <TrendingUp className="w-4 h-4" />
                <span>Earnings: {hustle.earnings}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="w-4 h-4" />
                <span>Difficulty: {difficultyLabel(hustle.effort)}</span>
              </div>
              {hustle.time_commitment && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{hustle.time_commitment}</span>
                </div>
              )}
            </div>
            {hustle.tags && hustle.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hustle.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary">{tag}</span>
                ))}
              </div>
            )}
            {profile && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                <span>Searches used: {profile.search_count}/{profile.subscription_tier === "free" ? 3 : profile.subscription_tier === "pro" ? 15 : "∞"}</span>
              </div>
            )}
          </motion.div>

          {/* Generate / View Roadmap Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">AI-Powered Roadmap</h2>
              <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">Powered by AI</Badge>
            </div>

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-primary/20 animate-ping" />
                </div>
                <p className="text-muted-foreground font-medium">Generating your personalized roadmap...</p>
                <p className="text-xs text-muted-foreground">This may take 10-15 seconds</p>
              </div>
            ) : roadmapId ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-display font-semibold">Roadmap Ready! 🎉</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Your AI-generated ebook-style roadmap is saved and ready to read anytime.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => roadmapId && openRoadmapPrint(roadmapId)} className="gap-2">
                    <BookOpen className="w-4 h-4" /> Read Roadmap
                  </Button>
                  <Button variant="outline" onClick={() => roadmapId && openRoadmapPrint(roadmapId, true)} className="gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={generateRoadmap} className="text-xs text-muted-foreground">
                  🔄 Regenerate a new roadmap
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-display font-semibold">Generate Your Roadmap</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Get a detailed, step-by-step AI roadmap with revenue strategies, tools, and resources — saved as an ebook you can read anytime.
                  </p>
                </div>
                <Button size="lg" onClick={generateRoadmap} className="gap-2 px-8">
                  <Zap className="w-5 h-5" /> Generate Roadmap
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="text-2xl">🎉</span> Roadmap Generated!
            </DialogTitle>
            <DialogDescription>
              Your AI-powered roadmap for <span className="font-medium text-foreground">{hustle.title}</span> is ready. View it as a beautiful ebook or download as PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button className="w-full gap-2" size="lg" onClick={() => { setShowDialog(false); if (roadmapId) openRoadmapPrint(roadmapId); }}>
              <BookOpen className="w-5 h-5" /> View Roadmap
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </Button>
            <Button variant="outline" className="w-full gap-2" size="lg" onClick={() => { setShowDialog(false); if (roadmapId) openRoadmapPrint(roadmapId, true); }}>
              <Download className="w-5 h-5" /> Download as PDF
            </Button>
            <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setShowDialog(false)}>
              Maybe later — I'll find it in My Hustles
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
