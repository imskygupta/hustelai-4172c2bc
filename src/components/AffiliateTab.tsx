import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Copy, Share2, TrendingUp, Users, DollarSign, Gift, CheckCircle, Search, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Referral {
  id: string;
  referral_code: string;
  status: string;
  reward_type: string;
  reward_amount: number;
  commission_percent: number;
  created_at: string;
  converted_at: string | null;
}

interface EarningLog {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export function AffiliateTab() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [earnings, setEarnings] = useState<EarningLog[]>([]);
  const [loading, setLoading] = useState(true);

  const tier = profile?.subscription_tier || "free";
  const isFree = tier === "free";
  const isPro = tier === "pro";
  const isElite = tier === "elite";
  const isInfinity = tier === "infinity";

  const referralCode = (profile as any)?.referral_code || "generating...";
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
  const totalCredits = (profile as any)?.referral_credits || 0;
  const totalEarnings = (profile as any)?.affiliate_earnings || 0;

  const commissionRate = isFree ? 0 : isPro ? 5 : isElite ? 6 : 10;
  const rewardDesc = isFree
    ? "1 bonus search credit per signup"
    : `${commissionRate}% commission on referred subscriptions`;

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [refRes, earnRes] = await Promise.all([
      supabase.from("referrals").select("*").eq("referrer_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_earnings").select("*").eq("affiliate_id", user!.id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (refRes.data) setReferrals(refRes.data as Referral[]);
    if (earnRes.data) setEarnings(earnRes.data as EarningLog[]);
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const convertedCount = referrals.filter(r => r.status === "converted").length;
  const pendingCount = referrals.filter(r => r.status === "pending").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Total Referrals", value: referrals.length, color: "text-primary" },
          { icon: CheckCircle, label: "Converted", value: convertedCount, color: "text-primary" },
          { icon: Search, label: "Search Credits", value: totalCredits, color: "text-accent" },
          { icon: IndianRupee, label: "Earnings", value: `₹${totalEarnings}`, color: "text-primary" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass rounded-xl p-4 space-y-1">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Referral Link */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">Your Referral Link</h3>
          <Badge variant="outline" className="text-[10px]">{tier.toUpperCase()}</Badge>
        </div>
        <div className="flex gap-2">
          <Input value={referralLink} readOnly className="bg-secondary/50 text-xs font-mono" />
          <Button size="sm" onClick={copyLink} className="shrink-0">
            <Copy className="w-4 h-4 mr-1" /> Copy
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Gift className="w-4 h-4 text-accent" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">Your reward:</strong> {rewardDesc}
          </span>
        </div>
      </div>

      {/* Commission tiers info */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Commission Tiers
        </h3>
        <div className="grid md:grid-cols-4 gap-3">
          {[
            { tier: "Free", rate: "1 search credit/signup", active: isFree },
            { tier: "Pro", rate: "5% commission", active: isPro },
            { tier: "Elite", rate: "6% commission + marketplace access", active: isElite },
            { tier: "Infinity", rate: "10% commission + custom % + marketplace", active: isInfinity },
          ].map(t => (
            <div key={t.tier} className={`rounded-lg p-3 border text-center space-y-1 transition-all ${t.active ? "border-primary/50 bg-primary/5" : "border-border/50"}`}>
              <p className="font-display font-semibold text-sm">{t.tier}</p>
              <p className="text-[11px] text-muted-foreground">{t.rate}</p>
              {t.active && <Badge className="bg-primary/20 text-primary text-[10px]">Current</Badge>}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Earnings */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" /> Recent Activity
        </h3>
        {earnings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No earnings yet. Share your link to start earning! 🚀
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {earnings.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{e.description || e.type}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                </div>
                <span className="font-display font-semibold text-primary text-sm">
                  {e.type === "search_credit" ? `+${e.amount} credits` : `₹${e.amount}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
