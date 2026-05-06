import { Badge } from "@/components/ui/badge";
import { Activity, Bot, Clock, TrendingUp } from "lucide-react";
import type { FreelanceResult } from "@/lib/ai-search";

// Deterministic signals derived from existing fields — no extra DB writes.
function difficultyScore(d: string) { return d === "Beginner" ? 1 : d === "Intermediate" ? 2 : 3; }
function demandScore(r: FreelanceResult) {
  const likes = r.likes || 0;
  if (r.is_trending || likes > 50) return "High";
  if (likes > 10) return "Medium";
  return "Emerging";
}
function aiCompat(r: FreelanceResult) {
  const t = `${r.title} ${r.description} ${r.tags.join(" ")}`.toLowerCase();
  if (/(ai|gpt|automation|prompt|chat|agent|llm|n8n|zapier)/.test(t)) return "Native";
  if (/(content|writing|video|design|marketing|seo|social)/.test(t)) return "Boosted";
  return "Manual";
}
function setupTime(r: FreelanceResult) {
  const d = difficultyScore(r.difficulty);
  return d === 1 ? "1–3 days" : d === 2 ? "1–2 weeks" : "3–6 weeks";
}
function monetization(r: FreelanceResult) {
  const t = `${r.title} ${r.tags.join(" ")}`.toLowerCase();
  if (/(saas|subscription|membership|retainer)/.test(t)) return "Recurring";
  if (/(course|ebook|template|product|digital)/.test(t)) return "Digital Product";
  if (/(ad|youtube|content|affiliate)/.test(t)) return "Audience";
  return "Service";
}

export function OpportunitySignals({ result }: { result: FreelanceResult }) {
  const demand = demandScore(result);
  const ai = aiCompat(result);
  const setup = setupTime(result);
  const mon = monetization(result);

  const demandTone = demand === "High" ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
    : demand === "Medium" ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
    : "text-muted-foreground border-border";
  const aiTone = ai === "Native" ? "text-violet-500 border-violet-500/30 bg-violet-500/10"
    : ai === "Boosted" ? "text-cyan-500 border-cyan-500/30 bg-cyan-500/10"
    : "text-muted-foreground border-border";

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      <Badge variant="outline" className={`text-[10px] gap-1 ${demandTone}`}>
        <TrendingUp className="w-3 h-3" /> Demand: {demand}
      </Badge>
      <Badge variant="outline" className={`text-[10px] gap-1 ${aiTone}`}>
        <Bot className="w-3 h-3" /> AI: {ai}
      </Badge>
      <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
        <Clock className="w-3 h-3" /> Setup: {setup}
      </Badge>
      <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
        <Activity className="w-3 h-3" /> {mon}
      </Badge>
    </div>
  );
}