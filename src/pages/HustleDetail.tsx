import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Download, Bookmark, BookmarkCheck, Loader2,
  DollarSign, TrendingUp, Clock, Zap, Flame, Share2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [roadmap, setRoadmap] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadHustle();
    checkSaved();
  }, [id, user]);

  const loadHustle = async () => {
    if (!id) return;
    const { data } = await supabase.from("side_hustles").select("*").eq("id", id).single();
    if (data) {
      setHustle(data as HustleData);
      generateRoadmap(data as HustleData);
    }
  };

  const checkSaved = async () => {
    if (!user || !id) return;
    const { data } = await supabase.from("saved_hustles").select("id").eq("user_id", user.id).eq("hustle_id", id);
    if (data && data.length > 0) setIsSaved(true);
  };

  const generateRoadmap = async (h: HustleData) => {
    if (!user || !profile) return;

    // Check search limit (3 for free users)
    const tier = profile.subscription_tier;
    const maxSearches = tier === "free" ? 3 : tier === "pro" ? 15 : 999;
    
    if (profile.search_count >= maxSearches) {
      toast({
        title: "Search limit reached",
        description: `You've used ${profile.search_count}/${maxSearches} searches. Upgrade to continue.`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Increment search count
      await supabase.from("profiles").update({
        search_count: profile.search_count + 1,
      }).eq("user_id", user.id);
      refreshProfile();

      const { data, error } = await supabase.functions.invoke("hustle-roadmap", {
        body: {
          title: h.title,
          category: h.category,
          description: h.description,
          earnings: h.earnings,
          startup_cost: h.startup_cost,
          type: h.type,
        },
      });

      if (error) throw error;
      setRoadmap(data?.roadmap || "Failed to generate roadmap.");
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setRoadmap("Failed to generate roadmap. Please try again.");
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
      await supabase.from("saved_hustles").upsert({
        user_id: user.id,
        hustle_id: id,
        status: "saved",
      } as any);
      setIsSaved(true);
      toast({ title: "💾 Saved!", description: "Track it in My Hustles" });
    }
  };

  const handlePrintPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = contentRef.current?.innerHTML || "";
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${hustle?.title || "Hustle Roadmap"} - HustleAI</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; position: relative; }
          h1 { font-size: 28px; margin-bottom: 8px; }
          h2 { font-size: 22px; margin: 24px 0 12px; color: #0d9488; }
          h3 { font-size: 18px; margin: 16px 0 8px; }
          p { margin: 8px 0; line-height: 1.6; }
          ul, ol { margin: 8px 0 8px 24px; }
          li { margin: 4px 0; line-height: 1.5; }
          code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
          pre { background: #f0f0f0; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
          .watermark {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 80px; font-weight: bold; color: rgba(13, 148, 136, 0.06);
            white-space: nowrap; pointer-events: none; z-index: 0;
          }
          .watermark2 {
            position: fixed; top: 25%; left: 30%;
            transform: rotate(-30deg);
            font-size: 50px; font-weight: bold; color: rgba(13, 148, 136, 0.04);
            white-space: nowrap; pointer-events: none;
          }
          .watermark3 {
            position: fixed; top: 70%; left: 60%;
            transform: rotate(-30deg);
            font-size: 50px; font-weight: bold; color: rgba(13, 148, 136, 0.04);
            white-space: nowrap; pointer-events: none;
          }
          .header { border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
          .header small { color: #666; }
          .footer { margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 16px; text-align: center; color: #999; font-size: 12px; }
          @media print { .watermark, .watermark2, .watermark3 { position: fixed; } }
        </style>
      </head>
      <body>
        <div class="watermark">⚡ HustleAI</div>
        <div class="watermark2">⚡ HustleAI</div>
        <div class="watermark3">⚡ HustleAI</div>
        <div class="header">
          <h1>⚡ ${hustle?.title || ""}</h1>
          <small>Generated by HustleAI — AI-Powered Side Hustle Discovery Platform</small>
        </div>
        <div style="position:relative;z-index:1;">${content}</div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} HustleAI — hustelai.lovable.app — AI-Powered Freelance Discovery</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
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
          {/* Back + Actions */}
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
              {roadmap && (
                <Button variant="outline" size="sm" onClick={handlePrintPDF}
                  className="hover:border-primary/50 hover:text-primary">
                  <Download className="w-4 h-4 mr-1" /> Export PDF
                </Button>
              )}
            </div>
          </div>

          {/* Hustle Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-8 space-y-4"
          >
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
                  <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Search count indicator */}
            {profile && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                <span>Searches used: {profile.search_count}/{profile.subscription_tier === "free" ? 3 : profile.subscription_tier === "pro" ? 15 : "∞"}</span>
              </div>
            )}
          </motion.div>

          {/* AI Roadmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">AI-Generated Roadmap</h2>
              <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">
                Powered by AI
              </Badge>
            </div>

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Generating your personalized roadmap...</p>
                <p className="text-xs text-muted-foreground">This may take 10-15 seconds</p>
              </div>
            ) : (
              <div ref={contentRef} className="prose prose-invert prose-sm max-w-none
                prose-headings:font-display prose-headings:text-foreground
                prose-p:text-muted-foreground prose-li:text-muted-foreground
                prose-strong:text-foreground prose-a:text-primary
                prose-code:bg-secondary prose-code:text-primary prose-code:rounded prose-code:px-1.5
                prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-border/50">
                <ReactMarkdown>{roadmap}</ReactMarkdown>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
