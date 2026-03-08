import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Chatbot } from "@/components/Chatbot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Search, Crown, Rocket, Sparkles, Users, Video, Wrench,
  BookOpen, TrendingUp, MessageCircle, Gift, Lock
} from "lucide-react";

const eliteTools = [
  { name: "Canva Pro License", desc: "Design anything, anywhere", icon: "🎨" },
  { name: "Grammarly Premium", desc: "Write like a pro", icon: "✍️" },
  { name: "SEMrush Access", desc: "SEO & marketing research", icon: "📊" },
  { name: "Notion Pro", desc: "Organize your freelance biz", icon: "📋" },
  { name: "Figma Pro", desc: "UI/UX design toolkit", icon: "🖌️" },
  { name: "ChatGPT Plus", desc: "AI writing assistant", icon: "🤖" },
];

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-display text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const tier = profile.subscription_tier;
  const isElite = tier === "elite";
  const isPro = tier === "pro" || isElite;

  const TierBadge = () => (
    <Badge
      className={`${
        isElite
          ? "bg-gradient-accent text-accent-foreground"
          : isPro
          ? "bg-gradient-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {isElite ? <Crown className="w-3 h-3 mr-1" /> : isPro ? <Rocket className="w-3 h-3 mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-bold">
                  Welcome, {profile.display_name || "Hustler"}!
                </h1>
                <TierBadge />
              </div>
              <p className="text-muted-foreground text-sm">
                {isElite
                  ? "You have full access to all Elite features including AI Mentor, tools & webinars."
                  : isPro
                  ? "Upgrade to Elite for AI Mentor, webinars & exclusive tools."
                  : `You've used ${profile.search_count}/4 free searches today. Upgrade for unlimited.`}
              </p>
            </div>
            {!isElite && (
              <Button className="bg-gradient-primary text-primary-foreground shrink-0" onClick={() => navigate("/#pricing")}>
                Upgrade Plan
              </Button>
            )}
          </motion.div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Search, label: "AI Search", desc: isPro ? "Unlimited" : `${4 - profile.search_count} left`, action: () => navigate("/explore"), locked: false },
              { icon: Users, label: "Community", desc: isElite ? "Elite Groups" : isPro ? "Pro Groups" : "Basic Access", action: () => {}, locked: false },
              { icon: Video, label: "Live Webinars", desc: "Expert guidance", action: () => {}, locked: !isElite },
              { icon: MessageCircle, label: "AI Mentor", desc: "Personal chatbot", action: () => {}, locked: !isElite },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={item.locked ? undefined : item.action}
                className={`glass rounded-xl p-5 space-y-2 transition-all duration-300 ${
                  item.locked ? "opacity-50" : "cursor-pointer hover:shadow-glow hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <item.icon className="w-8 h-8 text-primary" />
                  {item.locked && <Lock className="w-4 h-4 text-muted-foreground" />}
                </div>
                <h3 className="font-display font-semibold">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Elite Tools & Software */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Free Tools & Software</h2>
              {!isElite && <Badge variant="outline" className="text-xs">Elite Only</Badge>}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eliteTools.map((tool, i) => (
                <div
                  key={tool.name}
                  className={`glass rounded-xl p-4 flex items-center gap-4 transition-all ${
                    isElite ? "hover:border-primary/30" : "opacity-40"
                  }`}
                >
                  <span className="text-3xl">{tool.icon}</span>
                  <div>
                    <p className="font-display font-semibold text-sm">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.desc}</p>
                  </div>
                  {!isElite && <Lock className="w-4 h-4 text-muted-foreground ml-auto" />}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hacks & Methods (Elite) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-display font-bold">Hacks & Methods Library</h2>
              {!isElite && <Badge variant="outline" className="text-xs">Elite Only</Badge>}
            </div>
            <div className={`glass rounded-xl p-6 ${!isElite ? "opacity-40" : ""}`}>
              {isElite ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    "Cold Email Templates That Convert",
                    "LinkedIn Growth Hacking Playbook",
                    "Upwork Profile Optimization Guide",
                    "Pricing Strategy Calculator",
                    "Client Retention Blueprint",
                    "Portfolio Website Checklist",
                  ].map((hack) => (
                    <div key={hack} className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{hack}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Upgrade to Elite to unlock exclusive hacks & methods</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Trending */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Trending This Week</h2>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "AI Prompt Engineering — $2K-8K/mo",
                  "Short-Form Video Editing — $1K-5K/mo",
                  "Notion Template Sales — $500-3K/mo",
                  "Technical Writing — $3K-10K/mo",
                ].map((trend) => (
                  <div key={trend} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{trend}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Chatbot only for Elite */}
      {isElite && <Chatbot />}
    </div>
  );
}
