import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Check, Crown, Rocket, Star, Shield, Loader2, Wallet, ArrowRight, Sparkles } from "lucide-react";

const plans = [
  { id: "pro", name: "Pro", price: 450, icon: Rocket, color: "text-primary", features: ["5 AI searches/day", "All AI tools access", "Pro forums", "Resume upload", "Weekly reports", "5% affiliate"] },
  { id: "elite", name: "Elite", price: 900, icon: Crown, color: "text-accent", features: ["10 AI searches/day", "Everything in Pro", "HustleBot AI Mentor", "Lead Discovery", "Live webinars", "1-on-1 sessions", "6% affiliate"] },
  { id: "infinity", name: "Infinity", price: 2250, icon: Star, color: "text-yellow-500", features: ["20 AI searches/day", "Everything in Elite", "Create & sell courses (5)", "Revenue sharing", "Priority coaching", "API access", "10%+ affiliate"] },
];

const walletPacks = [
  { id: "pack_10", credits: 10, price: 100, label: "Starter" },
  { id: "pack_20", credits: 20, price: 200, label: "Popular" },
  { id: "pack_50", credits: 50, price: 500, label: "Power User" },
  { id: "pack_100", credits: 100, price: 1000, label: "Pro Pack" },
];

export default function Payment() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plans" | "wallet">(
    searchParams.get("type") === "wallet" ? "wallet" : "plans"
  );
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (user) loadWallet();
  }, [user]);

  const loadWallet = async () => {
    try {
      const { data } = await supabase.functions.invoke("cashfree-payment", {
        body: { action: "get_wallet" },
      });
      if (data) setWalletBalance(data.balance || 0);
    } catch {}
  };

  const initPayment = async (planId: string) => {
    if (!user || !profile) return;
    setProcessing(planId);
    try {
      const { data, error } = await supabase.functions.invoke("cashfree-payment", {
        body: {
          action: "create_order",
          plan: planId,
          user_email: profile.email,
          user_name: profile.display_name,
        },
      });
      if (error) throw error;

      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.onload = () => {
        const cashfree = (window as any).Cashfree({ mode: "production" });
        cashfree.checkout({
          paymentSessionId: data.payment_session_id,
          redirectTarget: "_self",
        });
      };
      document.body.appendChild(script);
    } catch (err: any) {
      toast({ title: "Payment Failed", description: err.message, variant: "destructive" });
      setProcessing(null);
    }
  };

  const initWalletTopup = async (packId: string) => {
    if (!user) return;
    setProcessing(packId);
    try {
      const { data, error } = await supabase.functions.invoke("cashfree-payment", {
        body: { action: "create_wallet_order", pack: packId },
      });
      if (error) throw error;

      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.onload = () => {
        const cashfree = (window as any).Cashfree({ mode: "production" });
        cashfree.checkout({
          paymentSessionId: data.payment_session_id,
          redirectTarget: "_self",
        });
      };
      document.body.appendChild(script);
    } catch (err: any) {
      toast({ title: "Payment Failed", description: err.message, variant: "destructive" });
      setProcessing(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const currentTier = profile?.subscription_tier || "free";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <h1 className="text-3xl font-display font-bold">Upgrade Your <span className="text-gradient">Hustle Plan</span></h1>
            <p className="text-muted-foreground">Pay securely with Cashfree. Instant upgrade.</p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" /> Secure payment powered by Cashfree
            </div>
          </motion.div>

          {/* Tab Toggle */}
          <div className="flex justify-center gap-2">
            <Button variant={activeTab === "plans" ? "default" : "outline"} onClick={() => setActiveTab("plans")}
              className={activeTab === "plans" ? "bg-gradient-primary text-primary-foreground" : ""}>
              <Sparkles className="w-4 h-4 mr-1" /> Subscription Plans
            </Button>
            <Button variant={activeTab === "wallet" ? "default" : "outline"} onClick={() => setActiveTab("wallet")}
              className={activeTab === "wallet" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}>
              <Wallet className="w-4 h-4 mr-1" /> Pay-As-You-Go
            </Button>
          </div>

          {/* View All Features Link */}
          <div className="text-center">
            <Button variant="link" onClick={() => navigate("/plans")} className="text-primary">
              View all features & compare plans <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          {activeTab === "plans" ? (
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan, i) => {
                const isCurrentOrLower = ["free", ...plans.slice(0, plans.findIndex(p => p.id === currentTier) + 1).map(p => p.id)].includes(plan.id);
                const isCurrent = plan.id === currentTier;
                return (
                  <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className={`glass rounded-2xl p-6 space-y-5 transition-all hover:border-primary/30 ${isCurrent ? "border-primary/50 shadow-glow" : ""}`}>
                    <div className="space-y-2">
                      <plan.icon className={`w-8 h-8 ${plan.color}`} />
                      <h3 className="font-display font-bold text-xl">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-display font-bold text-gradient">₹{plan.price}</span>
                        <span className="text-muted-foreground text-sm">/month</span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-primary shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <Badge className="w-full justify-center py-2 bg-primary/20 text-primary">Current Plan</Badge>
                    ) : isCurrentOrLower ? (
                      <Button disabled className="w-full opacity-50">Already Included</Button>
                    ) : (
                      <Button onClick={() => initPayment(plan.id)} disabled={!!processing}
                        className={`w-full ${plan.id === "infinity" ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "bg-gradient-primary text-primary-foreground"}`}>
                        {processing === plan.id ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processing...</> : `Upgrade to ${plan.name}`}
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wallet Balance */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-2xl p-6 text-center space-y-2 border-emerald-500/20">
                <Wallet className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm text-muted-foreground">Your Credit Balance</p>
                <p className="text-4xl font-display font-bold text-emerald-500">{walletBalance}</p>
                <p className="text-xs text-muted-foreground">credits remaining (₹10/search, all tools unlocked)</p>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {walletPacks.map((pack, i) => (
                  <motion.div key={pack.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="glass rounded-xl p-5 space-y-4 hover:border-emerald-500/30 transition-all">
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-xs">{pack.label}</Badge>
                      <h3 className="font-display font-bold text-lg">{pack.credits} Credits</h3>
                      <p className="text-2xl font-display font-bold text-emerald-500">₹{pack.price}</p>
                      <p className="text-xs text-muted-foreground">₹{(pack.price / pack.credits).toFixed(0)}/search</p>
                    </div>
                    <Button onClick={() => initWalletTopup(pack.id)} disabled={!!processing}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      {processing === pack.id ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processing...</> : "Buy Now"}
                    </Button>
                  </motion.div>
                ))}
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Each credit gives you 1 AI search with all tools unlocked — no subscription required.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
