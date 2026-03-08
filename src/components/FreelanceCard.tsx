import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Zap } from "lucide-react";
import type { FreelanceResult } from "@/lib/ai-search";

const difficultyColors: Record<string, string> = {
  Beginner: "bg-primary/20 text-primary border-primary/30",
  Intermediate: "bg-accent/20 text-accent border-accent/30",
  Advanced: "bg-destructive/20 text-destructive border-destructive/30",
};

const categoryIcons: Record<string, string> = {
  Tech: "💻",
  Creative: "🎨",
  Writing: "✍️",
  Marketing: "📣",
  Teaching: "📚",
  Services: "🛠️",
  "E-commerce": "🛒",
  Finance: "💰",
  Other: "⚡",
};

export function FreelanceCard({ result, index }: { result: FreelanceResult; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Card className="glass hover:shadow-glow transition-all duration-300 hover:border-primary/30 group h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{categoryIcons[result.category] || "⚡"}</span>
              <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                {result.category}
              </Badge>
            </div>
            <Badge className={`text-xs border ${difficultyColors[result.difficulty] || ""}`} variant="outline">
              {result.difficulty}
            </Badge>
          </div>
          <CardTitle className="text-lg font-display mt-2 group-hover:text-gradient transition-colors">
            {result.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-primary">
              <DollarSign className="w-3.5 h-3.5" />
              <span>{result.investment}</span>
            </div>
            <div className="flex items-center gap-1 text-accent">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{result.earning_potential}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {result.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
