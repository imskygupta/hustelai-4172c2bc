import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, Flame, Star, Crown, Rocket, Sparkles, Calendar, Gift } from "lucide-react";
import { getWeeklyLeaderboard, WEEKLY_XP_THRESHOLD, type WeeklyEntry } from "@/lib/weekly-leaderboard";

interface DisplayRow {
  key: string;
  display_name: string;
  xp_points: number;
  tier: string;
  isYou?: boolean;
}

const ACHIEVEMENTS = [
  { key: "first_search", label: "First Search", icon: "🔍", xp: 10 },
  { key: "profile_complete", label: "Profile Complete", icon: "👤", xp: 25 },
  { key: "first_post", label: "First Forum Post", icon: "💬", xp: 20 },
  { key: "resume_uploaded", label: "Resume Uploaded", icon: "📄", xp: 30 },
  { key: "verified", label: "Identity Verified", icon: "✅", xp: 50 },
  { key: "pro_subscriber", label: "Pro Subscriber", icon: "🚀", xp: 100 },
  { key: "elite_subscriber", label: "Elite Subscriber", icon: "👑", xp: 200 },
  { key: "infinity_subscriber", label: "Infinity Member", icon: "♾️", xp: 500 },
  { key: "10_searches", label: "10 Searches", icon: "🎯", xp: 30 },
  { key: "50_searches", label: "Power Searcher", icon: "⚡", xp: 75 },
  { key: "first_save", label: "First Saved Hustle", icon: "💾", xp: 15 },
  { key: "community_helper", label: "Community Helper (5 answers)", icon: "🤝", xp: 50 },
];

const tierIcons: Record<string, any> = { free: Sparkles, pro: Rocket, elite: Crown, infinity: Star };
const tierColors: Record<string, string> = {
  free: "text-muted-foreground", pro: "text-primary", elite: "text-accent", infinity: "text-yellow-500",
};

export default function Leaderboard() {
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [myXP, setMyXP] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const weekly: WeeklyEntry[] = getWeeklyLeaderboard();

    // Pull qualifying REAL users (XP ≥ threshold) — they merge into the board.
    const { data: real } = await supabase
      .from("profiles")
      .select("user_id, display_name, xp_points, subscription_tier")
      .gte("xp_points", WEEKLY_XP_THRESHOLD)
      .order("xp_points", { ascending: false })
      .limit(20);

    // Current user XP (for the "your progress" panel — we never list them publicly unless qualified).
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("profiles").select("xp_points").eq("user_id", user.id).single();
      setMyXP(((me as any)?.xp_points as number) || 0);
    }

    const realRows: DisplayRow[] = (real || []).map((r: any) => ({
      key: `r-${r.user_id}`,
      display_name: r.display_name || `Hustler#${r.user_id.slice(0, 4)}`,
      xp_points: r.xp_points,
      tier: r.subscription_tier || "pro",
      isYou: user?.id === r.user_id,
    }));
    const fakeRows: DisplayRow[] = weekly.map((w) => ({
      key: `w-${w.rank}-${w.display_name}`,
      display_name: w.display_name,
      xp_points: w.xp_points,
      tier: w.tier,
    }));

    const merged = [...realRows, ...fakeRows].sort((a, b) => b.xp_points - a.xp_points).slice(0, 15);
    setRows(merged);
    setLoading(false);
  };

  const getRankIcon = (i: number) => {
    if (i === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (i === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (i === 2) return <Award className="w-6 h-6 text-amber-700" />;
    return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{i + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm">
              <Calendar className="w-4 h-4" /> Weekly Leaderboard · Resets every Sunday
            </div>
            <h1 className="text-3xl font-display font-bold">
              <span className="text-gradient">Top Hustlers This Week</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              Earn <strong>1000+ XP</strong> in a week to qualify for the leaderboard and weekly rewards.
              Use AI tools, save hustles & complete actions to climb.
            </p>
          </motion.div>

          {/* Your progress (private, only you see this) */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
            className="glass rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Your XP this season</p>
              <p className="font-display text-2xl font-bold text-gradient">{myXP} XP</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {myXP >= WEEKLY_XP_THRESHOLD
                  ? "🎉 You qualify! Your name appears anonymously to others."
                  : `${WEEKLY_XP_THRESHOLD - myXP} XP to qualify for the leaderboard`}
              </p>
            </div>
            <div className="text-right">
              <Gift className="w-8 h-8 text-primary inline-block" />
              <p className="text-[10px] text-muted-foreground mt-1">Weekly Rewards</p>
            </div>
          </motion.div>

          {/* Achievement Badges Overview */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="glass rounded-xl p-6 space-y-3">
            <h3 className="font-display font-bold text-sm">🏆 Available Badges</h3>
            <div className="flex flex-wrap gap-2">
              {ACHIEVEMENTS.map(a => (
                <div key={a.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
                  <span>{a.icon}</span>
                  <span className="text-muted-foreground">{a.label}</span>
                  <Badge variant="outline" className="text-[9px] ml-1">+{a.xp}XP</Badge>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Leaderboard Table */}
          {loading ? (
            <div className="text-center py-12"><div className="animate-pulse text-primary font-display">Loading rankings...</div></div>
          ) : (
            <div className="space-y-2">
              {rows.map((u, i) => {
                const TierIcon = tierIcons[u.tier] || Sparkles;
                return (
                  <motion.div key={u.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`glass rounded-xl p-4 flex items-center gap-4 transition-all hover:border-primary/30 ${i < 3 ? "border-primary/20" : ""} ${u.isYou ? "ring-2 ring-primary/50" : ""}`}>
                    {getRankIcon(i)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-sm truncate">
                          {u.display_name}{u.isYou && <span className="ml-2 text-[10px] text-primary">(you)</span>}
                        </span>
                        <TierIcon className={`w-4 h-4 ${tierColors[u.tier]}`} />
                      </div>
                      <p className="text-xs text-muted-foreground">Weekly contender</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-lg text-gradient">{u.xp_points}</p>
                      <p className="text-[10px] text-muted-foreground">XP</p>
                    </div>
                  </motion.div>
                );
              })}
              {rows.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No qualifiers yet — be the first to hit 1000 XP!</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { ACHIEVEMENTS };
