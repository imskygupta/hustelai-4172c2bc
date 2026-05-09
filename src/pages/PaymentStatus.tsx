import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, XCircle, Clock, CreditCard, Rocket, Gift, ArrowRight, PartyPopper, Wallet } from "lucide-react";

import { SEO } from "@/components/SEO";
import { UpgradeCelebrationModal } from "@/components/UpgradeCelebrationModal";
import { toast as sonnerToast } from "sonner";

const STATUS_STAGES = [
  { key: "initiated", label: "Payment Initiated", icon: CreditCard },
  { key: "processing", label: "Processing Payment", icon: Clock },
  { key: "confirmed", label: "Payment Confirmed", icon: Check },
  { key: "completed", label: "Subscription Activated", icon: Rocket },
];

export default function PaymentStatus() {
  const { user, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [paid, setPaid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [plan, setPlan] = useState("");
  const [isWallet, setIsWallet] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [bonusKits, setBonusKits] = useState<any[]>([]);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [walletCredits, setWalletCredits] = useState<number | undefined>(undefined);

  const orderId = searchParams.get("order_id");
  const type = searchParams.get("type") || "subscription";

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (orderId && user) {
      verifyPayment();
    }
  }, [orderId, user]);

  const verifyPayment = async () => {
    setVerifying(true);
    setCurrentStage(0);

    // Stage 1: Initiated
    await new Promise(r => setTimeout(r, 800));
    setCurrentStage(1);

    try {
      // Stage 2: Processing
      await new Promise(r => setTimeout(r, 600));

      const { data, error } = await supabase.functions.invoke("cashfree-payment", {
        body: { action: "verify_payment", order_id: orderId },
      });

      if (error) throw error;

      setCurrentStage(2);
      await new Promise(r => setTimeout(r, 800));

      if (data.paid) {
        setPaid(true);
        setPlan(data.plan);
        setIsWallet(data.is_wallet);
        setCurrentStage(3);
        setShowConfetti(true);
        refreshProfile();

        // Webhook-confirmed celebration UX
        const tierKey = (data.is_wallet ? "wallet" : (data.plan || "pro").toLowerCase().replace(/_yearly$/, "")) as any;
        if (data.is_wallet) {
          const credits = Number(data.credits || data.wallet_credits || 0) || undefined;
          setWalletCredits(credits);
        }
        sonnerToast.success(
          data.is_wallet ? "Wallet topped up 💰" : `${(data.plan || "Premium").toUpperCase()} unlocked 🎉`,
          { description: data.is_wallet ? "Credits added instantly." : "All premium features are live." },
        );
        setTimeout(() => setCelebrationOpen(true), 600);

        // Load bonus kits
        const { data: kits } = await supabase.from("bonus_kits" as any).select("*").eq("is_active", true);
        if (kits) setBonusKits(kits as any);

        setTimeout(() => setShowConfetti(false), 5000);
      } else {
        setFailed(true);
      }
    } catch (err: any) {
      setFailed(true);
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Payment status | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
      <Navbar />
      <UpgradeCelebrationModal
        open={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
        tier={(isWallet ? "wallet" : (plan || "pro").toLowerCase().replace(/_yearly$/, "")) as any}
        credits={walletCredits}
      />

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#f97316'][i % 6],
                }}
                initial={{ top: -20, rotate: 0, opacity: 1 }}
                animate={{
                  top: "110%",
                  rotate: Math.random() * 720 - 360,
                  opacity: 0,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-2xl">
          {/* Status Timeline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 space-y-8">
            <div className="text-center space-y-2">
              {paid ? (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }}>
                    <PartyPopper className="w-16 h-16 text-primary mx-auto" />
                  </motion.div>
                  <h1 className="text-2xl font-display font-bold">🎉 Payment Successful!</h1>
                  <p className="text-muted-foreground">
                    {isWallet ? "Your wallet has been topped up!" : `Your ${plan?.toUpperCase()} plan is now active!`}
                  </p>
                </>
              ) : failed ? (
                <>
                  <XCircle className="w-16 h-16 text-destructive mx-auto" />
                  <h1 className="text-2xl font-display font-bold">Payment Failed</h1>
                  <p className="text-muted-foreground">Something went wrong. Please try again.</p>
                </>
              ) : (
                <>
                  <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                  <h1 className="text-2xl font-display font-bold">Processing Payment...</h1>
                  <p className="text-muted-foreground">Please wait while we verify your payment</p>
                </>
              )}
            </div>

            {/* Progress stages */}
            <div className="space-y-4">
              {STATUS_STAGES.map((stage, i) => {
                const isActive = i <= currentStage;
                const isCurrent = i === currentStage && !paid && !failed;
                const StageIcon = stage.icon;
                return (
                  <motion.div
                    key={stage.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: isActive ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all ${isActive ? "bg-primary/5 border border-primary/20" : "border border-transparent"}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {isCurrent ? <Loader2 className="w-5 h-5 animate-spin" /> : <StageIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{stage.label}</p>
                    </div>
                    {isActive && i < currentStage && <Check className="w-5 h-5 text-primary shrink-0" />}
                  </motion.div>
                );
              })}
            </div>

            {/* Bonus Kits */}
            {paid && bonusKits.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="space-y-3">
                <h3 className="font-display font-bold flex items-center gap-2"><Gift className="w-5 h-5 text-primary" /> Bonus Kit 🎁</h3>
                <div className="space-y-2">
                  {bonusKits.map((kit: any) => (
                    <a key={kit.id} href={kit.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all">
                      <Gift className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{kit.title}</p>
                        {kit.description && <p className="text-xs text-muted-foreground">{kit.description}</p>}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {paid && (
                <>
                  <Button onClick={() => navigate("/profile?tab=billing")} className="flex-1 bg-gradient-primary text-primary-foreground">
                    <CreditCard className="w-4 h-4 mr-1" /> View Billing
                  </Button>
                  <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1">
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </>
              )}
              {failed && (
                <>
                  <Button onClick={() => navigate("/payment")} className="flex-1 bg-gradient-primary text-primary-foreground">
                    Try Again
                  </Button>
                  <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1">
                    Go to Dashboard
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
