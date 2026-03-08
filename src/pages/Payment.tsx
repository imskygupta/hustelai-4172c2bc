import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Check, Crown, Rocket, Star, Shield, Loader2 } from "lucide-react";

const plans = [
  { id: "pro", name: "Pro", price: 450, icon: Rocket, color: "text-primary", features: ["Unlimited AI searches", "Pro forums", "Resume upload", "Weekly reports"] },
  { id: "elite", name: "Elite", price: 900, icon: Crown, color: "text-accent", features: ["Everything in Pro", "AI Mentor", "Expert review", "Free tools & software"] },
  { id: "infinity", name: "Infinity", price: 2250, icon: Star, color: "text-yellow-500", features: ["Everything in Elite", "Create & sell courses", "Revenue sharing", "API access"] },
];

export default function Payment() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  // Verify payment on return
  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const paymentStatus = searchParams.get("payment");
    if (orderId && paymentStatus === "success") {
      verifyPayment(orderId);
    }
  }, [searchParams]);

  const verifyPayment = async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("cashfree-payment", {
        body: { action: "verify_payment", order_id: orderId },
      });
      if (error) throw error;
      if (data.paid) {
        toast({ title: "🎉 Payment Successful!", description: "Your plan has been upgraded!" });
        refreshProfile();
        navigate("/dashboard");
      } else {
        toast({ title: "Payment Pending", description: "Your payment is being processed.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    }
  };

  const initPayment = async (planId: string) => {
    if (!user || !profile) return;
    setProcessing(planId);
    try {
      const { data, error } = await supabase.functions.invoke("cashfree-payment", {
        body: {
          action: "create_order",
          plan: planId,
          user_id: user.id,
          user_email: profile.email,
          user_name: profile.display_name,
        },
      });
      if (error) throw error;

      // Load Cashfree SDK and open payment
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
        <div className="container mx-auto max-w-4xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <h1 className="text-3xl font-display font-bold">Upgrade Your <span className="text-gradient">Hustle Plan</span></h1>
            <p className="text-muted-foreground">Pay securely with Cashfree. Instant upgrade.</p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" /> Secure payment powered by Cashfree
            </div>
          </motion.div>

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
        </div>
      </div>
    </div>
  );
}
