import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, Flame, Star, Crown, Rocket, Sparkles, Shield } from "lucide-react";

interface LeaderboardUser {
  user_id: string;
  display_name: string | null;
  xp_points: number;
  subscription_tier: string;
  is_verified: boolean;
  achievement_count: number;
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
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, xp_points, subscription_tier, is_verified")
      .order("xp_points", { ascending: false })
      .limit(50);

    if (data) {
      // Get achievement counts
      const userIds = data.map((d: any) => d.user_id);
      const { data: achievements } = await supabase
        .from("user_achievements")
        .select("user_id")
        .in("user_id", userIds);

      const countMap: Record<string, number> = {};
      achievements?.forEach((a: any) => {
        countMap[a.user_id] = (countMap[a.user_id] || 0) + 1;
      });

      setLeaders(data.map((d: any) => ({
        ...d,
        achievement_count: countMap[d.user_id] || 0,
      })));
    }
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
              <Flame className="w-4 h-4" /> Live Rankings
            </div>
            <h1 className="text-3xl font-display font-bold">
              <span className="text-gradient">Leaderboard</span>
            </h1>
            <p className="text-muted-foreground">Top hustlers ranked by XP points and achievements</p>
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
              {leaders.map((user, i) => {
                const TierIcon = tierIcons[user.subscription_tier] || Sparkles;
                return (
                  <motion.div key={user.user_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`glass rounded-xl p-4 flex items-center gap-4 transition-all hover:border-primary/30 ${i < 3 ? "border-primary/20" : ""}`}>
                    {getRankIcon(i)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-sm truncate">
                          {user.display_name || `u/${user.user_id.slice(0, 6)}`}
                        </span>
                        {user.is_verified && (
                          <Badge className="bg-primary/20 text-primary text-[9px]">
                            <Shield className="w-2.5 h-2.5 mr-0.5" /> Verified
                          </Badge>
                        )}
                        <TierIcon className={`w-4 h-4 ${tierColors[user.subscription_tier]}`} />
                      </div>
                      <p className="text-xs text-muted-foreground">{user.achievement_count} badges earned</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-lg text-gradient">{user.xp_points}</p>
                      <p className="text-[10px] text-muted-foreground">XP</p>
                    </div>
                  </motion.div>
                );
              })}
              {leaders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No users yet. Be the first!</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { ACHIEVEMENTS };
