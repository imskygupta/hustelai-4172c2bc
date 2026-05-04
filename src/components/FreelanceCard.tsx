import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Zap, Clock, Flame, ChevronRight, Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { FreelanceResult } from "@/lib/ai-search";

const difficultyColors: Record<string, string> = {
  Beginner: "bg-primary/20 text-primary border-primary/30",
  Intermediate: "bg-accent/20 text-accent border-accent/30",
  Advanced: "bg-destructive/20 text-destructive border-destructive/30",
};

const categoryIcons: Record<string, string> = {
  Tech: "💻", Creative: "🎨", Writing: "✍️", Marketing: "📣",
  Teaching: "📚", Service: "🛠️", "E-Commerce": "🛒", Finance: "💰",
  Education: "📚", Admin: "📋", "Gig Economy": "🚗", Gaming: "🎮",
  "Real Estate": "🏠", Health: "💪", Freelance: "✨", "Micro-tasks": "📝",
  Other: "⚡",
};

export function FreelanceCard({ result, index }: { result: FreelanceResult; index: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [userVote, setUserVote] = useState<"like" | "dislike" | null>(null);
  const [likeCount, setLikeCount] = useState(result.likes || 0);
  const [dislikeCount, setDislikeCount] = useState(result.dislikes || 0);

  useEffect(() => {
    if (!user || !result.id) return;
    supabase.from("hustle_votes").select("vote_type").eq("user_id", user.id).eq("hustle_id", result.id).maybeSingle()
      .then(({ data }) => { if (data) setUserVote(data.vote_type as "like" | "dislike"); });
  }, [user, result.id]);

  const handleClick = () => {
    if (!user) { navigate("/signup"); return; }
    navigate(`/hustle/${result.id}`);
  };

  const handleVote = async (e: React.MouseEvent, voteType: "like" | "dislike") => {
    e.stopPropagation();
    if (!user) { navigate("/signup"); return; }

    const previousVote = userVote;
    
    if (previousVote === voteType) {
      // Remove vote
      await supabase.from("hustle_votes").delete().eq("user_id", user.id).eq("hustle_id", result.id);
      setUserVote(null);
      if (voteType === "like") {
        setLikeCount(c => c - 1);
        await supabase.from("side_hustles").update({ likes: Math.max(0, likeCount - 1) } as any).eq("id", result.id);
      } else {
        setDislikeCount(c => c - 1);
        await supabase.from("side_hustles").update({ dislikes: Math.max(0, dislikeCount - 1) } as any).eq("id", result.id);
      }
    } else {
      // Upsert vote
      await supabase.from("hustle_votes").upsert({ user_id: user.id, hustle_id: result.id, vote_type: voteType } as any, { onConflict: "user_id,hustle_id" });
      setUserVote(voteType);
      
      if (voteType === "like") {
        setLikeCount(c => c + 1);
        await supabase.from("side_hustles").update({ likes: likeCount + 1 } as any).eq("id", result.id);
        if (previousVote === "dislike") {
          setDislikeCount(c => c - 1);
          await supabase.from("side_hustles").update({ dislikes: Math.max(0, dislikeCount - 1) } as any).eq("id", result.id);
        }
      } else {
        setDislikeCount(c => c + 1);
        await supabase.from("side_hustles").update({ dislikes: dislikeCount + 1 } as any).eq("id", result.id);
        if (previousVote === "like") {
          setLikeCount(c => c - 1);
          await supabase.from("side_hustles").update({ likes: Math.max(0, likeCount - 1) } as any).eq("id", result.id);
        }
      }
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/signup"); return; }
    
    const { error } = await supabase.from("saved_hustles").upsert({
      user_id: user.id,
      hustle_id: result.id,
      status: "saved",
    } as any, { onConflict: "user_id,hustle_id" });

    if (!error) {
      setIsSaved(true);
      toast({ title: "💾 Saved!", description: "Track it in My Hustles" });
      const { data: profile } = await supabase.from("profiles").select("xp_points").eq("user_id", user.id).single();
      await supabase.from("profiles").update({ xp_points: ((profile as any)?.xp_points || 0) + 5 } as any).eq("user_id", user.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className="cursor-pointer"
    >
      <Card className={`glass h-full transition-all duration-500 group relative overflow-hidden ${
        isHovered
          ? "border-primary/50 shadow-glow scale-[1.02]"
          : "hover:border-primary/20"
      }`}>
        {/* Hover gradient sheen — emerald → cyan */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 bg-gradient-to-br from-primary/10 via-transparent to-cyan-400/10 ${isHovered ? "opacity-100" : "opacity-0"}`} />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-2xl transition-transform duration-300 ${isHovered ? "scale-125" : ""}`}>
                {categoryIcons[result.category] || "⚡"}
              </span>
              <Badge variant="outline" className={`text-xs transition-colors duration-300 ${
                isHovered ? "border-primary/50 text-primary" : "text-muted-foreground border-border"
              }`}>
                {result.category}
              </Badge>
              {result.is_trending && (
                <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]" variant="outline">
                  <Flame className="w-3 h-3 mr-0.5" /> HOT
                </Badge>
              )}
            </div>
            <Badge className={`text-xs border transition-all duration-300 ${difficultyColors[result.difficulty] || ""}`} variant="outline">
              {result.difficulty}
            </Badge>
          </div>
          <CardTitle className={`text-lg font-display mt-2 transition-all duration-300 ${
            isHovered ? "text-gradient" : ""
          }`}>
            {result.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>

          <div className="flex items-center gap-4 text-xs">
            <div className={`flex items-center gap-1 transition-colors duration-300 ${isHovered ? "text-primary" : "text-muted-foreground"}`}>
              <DollarSign className="w-3.5 h-3.5" />
              <span>{result.investment}</span>
            </div>
            <div className={`flex items-center gap-1 transition-colors duration-300 ${isHovered ? "text-accent" : "text-muted-foreground"}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{result.earning_potential}</span>
            </div>
            {result.time_commitment && (
              <div className={`flex items-center gap-1 transition-colors duration-300 ${isHovered ? "text-primary/70" : "text-muted-foreground"}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{result.time_commitment}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {result.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 rounded-full text-xs transition-all duration-300 ${
                  isHovered
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Like / Dislike + Save row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleVote(e, "like")}
                className={`h-7 px-2 text-xs gap-1 ${userVote === "like" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"}`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                {likeCount > 0 && <span>{likeCount}</span>}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleVote(e, "dislike")}
                className={`h-7 px-2 text-xs gap-1 ${userVote === "dislike" ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive"}`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                {dislikeCount > 0 && <span>{dislikeCount}</span>}
              </Button>
            </div>

            {user ? (
              <Button variant="ghost" size="sm" onClick={handleSave}
                className={`h-7 px-2 text-xs ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 mr-1" /> : <Bookmark className="w-3.5 h-3.5 mr-1" />}
                {isSaved ? "Saved" : "Save"}
              </Button>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                className="flex items-center gap-1 text-xs text-primary font-semibold"
              >
                <Zap className="w-3 h-3" /> Sign up <ChevronRight className="w-3 h-3" />
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
