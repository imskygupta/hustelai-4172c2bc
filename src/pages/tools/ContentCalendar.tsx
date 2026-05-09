import { useMemo, useState } from "react";
import { CalendarRange, Copy, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { TierLockOverlay } from "@/components/tools/TierLockOverlay";
import { useAuth } from "@/hooks/useAuth";
import type { Tier } from "@/lib/feature-flags";
import { toast } from "sonner";

/**
 * Social Media Content Calendar Generator — pure-template, no AI cost.
 * 4-week plan, 5 posts/week mapped to creator-economy frameworks.
 */

const PILLARS = ["Authority / how-to", "Personal story", "Hot take / opinion", "Resource / list", "Behind-the-scenes"];
const PROMPTS: Record<string, string[]> = {
  "Authority / how-to": [
    "How I do {topic} in under 30 minutes",
    "3 mistakes {audience} make with {topic}",
    "The ${topic} workflow I use every week",
    "A teardown of how {brand} ships {topic}",
  ],
  "Personal story": [
    "What I wish I knew about {topic} 5 years ago",
    "The week I almost quit {audience} work — and what saved me",
    "From 0 to first ₹1L with {topic}",
  ],
  "Hot take / opinion": [
    "Unpopular take: most {audience} get {topic} wrong",
    "Why {topic} is overrated — and what to do instead",
    "The 1 thing every {audience} should stop doing in 2026",
  ],
  "Resource / list": [
    "10 tools I use weekly for {topic}",
    "5 free templates every {audience} needs",
    "The exact stack I use to ship {topic}",
  ],
  "Behind-the-scenes": [
    "A day in the life as a {audience}",
    "Live build: setting up {topic} from scratch",
    "What's inside my {topic} workspace",
  ],
};

function pick<T>(arr: T[], seed: number) { return arr[Math.abs(seed) % arr.length]; }

export default function ContentCalendar() {
  const { profile } = useAuth();
  const tier = ((profile?.subscription_tier as Tier) || "free");
  const [niche, setNiche] = useState("freelance design");
  const [audience, setAudience] = useState("solo founders");
  const [brand, setBrand] = useState("HustleAI");

  const calendar = useMemo(() => {
    const out: { week: number; day: string; pillar: string; idea: string }[] = [];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    for (let w = 1; w <= 4; w++) {
      for (let d = 0; d < days.length; d++) {
        const pillar = PILLARS[d % PILLARS.length];
        const seed = w * 7 + d * 13;
        const tpl = pick(PROMPTS[pillar], seed);
        const idea = tpl
          .split("{topic}").join(niche)
          .split("{audience}").join(audience)
          .split("{brand}").join(brand);
        out.push({ week: w, day: days[d], pillar, idea });
      }
    }
    return out;
  }, [niche, audience, brand]);

  const exportCsv = () => {
    const rows = ["Week,Day,Pillar,Idea", ...calendar.map(r => `${r.week},${r.day},"${r.pillar}","${r.idea.split('"').join('""')}"`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `content-calendar-${niche.replace(/\s+/g, "-")}.csv`;
    a.click();
    toast.success("CSV downloaded");
  };

  return (
    <ToolPageLayout
      title="Social Content Calendar Generator"
      subtitle="Generate a 4-week, 5-posts-per-week content plan in seconds. Export as CSV."
      icon={CalendarRange}
      path="/tools/content-calendar"
      accent="from-rose-500 to-pink-600"
      back={{ href: "/tools", label: "All tools" }}
    >
      <Card className="p-5 mb-5 grid sm:grid-cols-3 gap-3">
        <div><Label className="text-xs">Topic / niche</Label><Input value={niche} onChange={e => setNiche(e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Audience</Label><Input value={audience} onChange={e => setAudience(e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Brand name</Label><Input value={brand} onChange={e => setBrand(e.target.value)} className="mt-1" /></div>
      </Card>

      <TierLockOverlay toolName="Content Calendar export" requiredTier="pro" userTier={tier}>
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="text-xs font-semibold text-slate-700">4-week plan · {calendar.length} ideas</div>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5 mr-1" /> Export CSV</Button>
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4].map(week => (
              <div key={week} className="p-4">
                <div className="text-[10px] uppercase tracking-wider font-bold text-rose-600 mb-2">Week {week}</div>
                <div className="grid sm:grid-cols-5 gap-2">
                  {calendar.filter(r => r.week === week).map((r, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 group hover:border-rose-300 transition">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500">{r.day}</span>
                        <button onClick={() => { navigator.clipboard.writeText(r.idea); toast.success("Copied"); }} className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-slate-700">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] text-rose-600 font-semibold mb-1 truncate">{r.pillar}</div>
                      <div className="text-xs text-slate-800 leading-snug">{r.idea}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TierLockOverlay>
    </ToolPageLayout>
  );
}