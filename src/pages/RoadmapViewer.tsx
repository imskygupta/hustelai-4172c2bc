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
  ArrowLeft, Download, Share2, Loader2, Zap,
  BookOpen, Calendar, DollarSign, TrendingUp,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { openRoadmapPrint } from "@/lib/roadmap-print";
import { Skeleton } from "@/components/ui/skeleton";

interface RoadmapData {
  id: string;
  hustle_title: string;
  hustle_category: string;
  hustle_description: string;
  hustle_earnings: string;
  hustle_startup_cost: string;
  hustle_type: string;
  content: string;
  created_at: string;
}

export default function RoadmapViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadRoadmap();
  }, [id, user]);

  const loadRoadmap = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("hustle_roadmaps")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      toast({ title: "Roadmap not found", variant: "destructive" });
      navigate("/saved-hustles");
      return;
    }
    setRoadmap(data as RoadmapData);
    setLoading(false);
    // Auto-open polished print/PDF view in a new tab — the in-app renderer
    // produced cramped, badly formatted content. The print view is branded,
    // print-ready, and download-friendly.
    openRoadmapPrint(data as RoadmapData);
  };

  const handlePrintPDF = () => {
    if (!roadmap) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const content = contentRef.current?.innerHTML || "";
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>${roadmap.hustle_title} - HustleAI Roadmap</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; padding: 48px; color: #1a1a2e; position: relative; background: #fff; }
        h1 { font-family: 'Space Grotesk', sans-serif; font-size: 28px; margin-bottom: 8px; color: #0d9488; }
        h2 { font-family: 'Space Grotesk', sans-serif; font-size: 20px; margin: 28px 0 12px; color: #0f766e; border-bottom: 2px solid #ccfbf1; padding-bottom: 6px; }
        h3 { font-size: 16px; margin: 18px 0 8px; color: #1a1a2e; }
        p { margin: 8px 0; line-height: 1.7; font-size: 14px; }
        ul, ol { margin: 8px 0 8px 24px; }
        li { margin: 4px 0; line-height: 1.6; font-size: 14px; }
        code { background: #f0fdfa; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #0d9488; }
        pre { background: #f0fdfa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; border: 1px solid #ccfbf1; }
        strong { color: #0f172a; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: bold; color: rgba(13, 148, 136, 0.04); white-space: nowrap; pointer-events: none; z-index: 0; font-family: 'Space Grotesk', sans-serif; }
        .watermark2 { position: fixed; top: 20%; left: 25%; transform: rotate(-30deg); font-size: 48px; font-weight: bold; color: rgba(13, 148, 136, 0.03); pointer-events: none; font-family: 'Space Grotesk', sans-serif; }
        .watermark3 { position: fixed; top: 75%; left: 65%; transform: rotate(-30deg); font-size: 48px; font-weight: bold; color: rgba(13, 148, 136, 0.03); pointer-events: none; font-family: 'Space Grotesk', sans-serif; }
        .header { border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 32px; }
        .header .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
        .meta { display: flex; gap: 20px; margin-top: 12px; font-size: 12px; color: #64748b; }
        .meta span { background: #f0fdfa; padding: 4px 10px; border-radius: 999px; border: 1px solid #ccfbf1; }
        .footer { margin-top: 48px; border-top: 2px solid #e2e8f0; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 11px; }
        .footer a { color: #0d9488; text-decoration: none; }
        @media print { .watermark, .watermark2, .watermark3 { position: fixed; } body { padding: 32px; } }
      </style></head><body>
        <div class="watermark">⚡ HustleAI</div>
        <div class="watermark2">⚡ HustleAI</div>
        <div class="watermark3">⚡ HustleAI</div>
        <div class="header">
          <h1>⚡ ${roadmap.hustle_title}</h1>
          <div class="subtitle">AI-Generated Roadmap by HustleAI — Your Side Hustle Blueprint</div>
          <div class="meta">
            <span>📂 ${roadmap.hustle_category}</span>
            <span>💰 ${roadmap.hustle_earnings}</span>
            <span>🏷️ ${roadmap.hustle_type}</span>
            <span>📅 ${new Date(roadmap.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div style="position:relative;z-index:1;">${content}</div>
        <div class="footer">
          <p>Generated by <a href="https://hustlaiapp.in">HustleAI</a> — AI-Powered Side Hustle Discovery Platform</p>
          <p style="margin-top:4px;">© ${new Date().getFullYear()} HustleAI — hustlaiapp.in</p>
        </div>
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 600);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/roadmap/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "🔗 Link copied!", description: "Share this roadmap link" });
  };

  const loadingTips = [
    "⚡ Patience is the key to greatness...",
    "📖 Preparing your personalized ebook...",
    "🚀 Good things take time — loading your roadmap...",
    "🧠 Great hustlers plan before they act...",
    "💡 Your blueprint to success is almost ready...",
  ];
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setTipIndex(i => (i + 1) % loadingTips.length), 3000);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading || !roadmap) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl space-y-6">
            {/* Shimmer header */}
            <div className="rounded-2xl border border-border/50 bg-card/50 p-8 md:p-12 space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-5 w-full max-w-xl" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-36" />
              </div>
            </div>
            {/* Shimmer content */}
            <div className="rounded-2xl border border-border/50 bg-card/50 p-8 md:p-12 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? "w-2/3" : i % 3 === 1 ? "w-full" : "w-4/5"}`} />
              ))}
              <Skeleton className="h-8 w-1/2 mt-4" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`b-${i}`} className={`h-4 ${i % 2 === 0 ? "w-full" : "w-3/4"}`} />
              ))}
            </div>
            {/* Tip text */}
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-muted-foreground font-medium pt-2"
            >
              {loadingTips[tipIndex]}
            </motion.p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Top Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="hover:text-primary">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-1" /> Share
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintPDF} className="hover:border-primary/50 hover:text-primary">
                <Download className="w-4 h-4 mr-1" /> Export PDF
              </Button>
            </div>
          </div>

          {/* Ebook Cover / Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 md:p-12 mb-8"
          >
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 opacity-[0.03] text-8xl font-bold font-display select-none pointer-events-none">⚡</div>
            <div className="absolute bottom-4 left-4 opacity-[0.03] text-6xl font-bold font-display select-none pointer-events-none">HustleAI</div>

            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                  <BookOpen className="w-3 h-3 mr-1" /> AI Roadmap
                </Badge>
                <Badge variant="outline" className="text-xs">{roadmap.hustle_category}</Badge>
                <Badge variant="outline" className="text-xs">{roadmap.hustle_type}</Badge>
              </div>

              <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">
                {roadmap.hustle_title}
              </h1>

              <p className="text-muted-foreground text-base max-w-2xl">{roadmap.hustle_description}</p>

              <div className="flex items-center gap-5 flex-wrap text-sm pt-2">
                <div className="flex items-center gap-1.5 text-primary">
                  <DollarSign className="w-4 h-4" />
                  <span>Startup: {roadmap.hustle_startup_cost || "$0"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-accent">
                  <TrendingUp className="w-4 h-4" />
                  <span>Earnings: {roadmap.hustle_earnings}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(roadmap.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border/30 mt-4">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Generated by <span className="text-primary font-medium">HustleAI</span> — AI-Powered Side Hustle Platform</span>
              </div>
            </div>
          </motion.div>

          {/* Ebook Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm"
          >
            {/* Subtle watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <span className="text-[120px] font-bold font-display text-primary/[0.015] rotate-[-25deg] whitespace-nowrap">
                ⚡ HustleAI
              </span>
            </div>

            <div
              ref={contentRef}
              className="relative z-10 p-8 md:p-12 prose prose-sm md:prose-base max-w-none
                prose-headings:font-display prose-headings:text-foreground
                prose-h2:text-primary prose-h2:border-b prose-h2:border-primary/10 prose-h2:pb-2 prose-h2:mt-10
                prose-h3:text-foreground/90 prose-h3:mt-6
                prose-p:text-muted-foreground prose-p:leading-relaxed
                prose-li:text-muted-foreground prose-li:leading-relaxed
                prose-strong:text-foreground
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-code:bg-primary/5 prose-code:text-primary prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm
                prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl
                prose-ul:space-y-1 prose-ol:space-y-1
                dark:prose-invert"
            >
              <ReactMarkdown>{roadmap.content}</ReactMarkdown>
            </div>

            {/* Footer inside ebook */}
            <div className="border-t border-border/30 px-8 md:px-12 py-6 text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                ⚡ Generated by <span className="text-primary font-semibold">HustleAI</span> — AI-Powered Side Hustle Discovery Platform
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                © {new Date().getFullYear()} hustlaiapp.in — This is an AI-generated document for educational purposes
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
