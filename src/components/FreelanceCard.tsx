import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Zap, Clock, Flame, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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

  const handleClick = () => {
    if (!user) {
      navigate("/signup");
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
      <Card className={`glass h-full transition-all duration-500 group ${
        isHovered
          ? "border-primary/50 shadow-glow scale-[1.02]"
          : "hover:border-primary/20"
      }`}>
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

          {/* CTA for non-logged in */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: isHovered ? 1 : 0, height: isHovered ? "auto" : 0 }}
              className="flex items-center gap-1 text-xs text-primary font-semibold overflow-hidden"
            >
              <Zap className="w-3 h-3" /> Sign up to learn more <ChevronRight className="w-3 h-3" />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
