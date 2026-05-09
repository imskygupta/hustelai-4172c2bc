import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Check, Crown, Rocket, Star, Shield, Loader2, Wallet, ArrowRight, Sparkles, Smartphone, Copy, Upload, CreditCard, Zap, CheckCircle2, Clock, Tag, Gift, Info, FileText, RefreshCw, Receipt, Lock, Banknote, HelpCircle } from "lucide-react";

import { SEO } from "@/components/SEO";

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

interface PaymentMethod {
  id: string;
  method_type: string;
  label: string;
  upi_id: string | null;
  qr_image_url: string | null;
  display_name: string | null;
  priority: number;
}

export default function Payment() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plans" | "wallet">(
    searchParams.get("type") === "wallet" ? "wallet" : "plans"
  );
  const [walletBalance, setWalletBalance] = useState(0);
  const [upiMethods, setUpiMethods] = useState<PaymentMethod[]>([]);
  const [upiDialog, setUpiDialog] = useState<{ open: boolean; itemId: string; itemType: "plan" | "wallet"; amount: number; label: string }>({ open: false, itemId: "", itemType: "plan", amount: 0, label: "" });
  const [utr, setUtr] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submittingUpi, setSubmittingUpi] = useState(false);
  const [selectedUpiId, setSelectedUpiId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"month" | "year">("month");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<"live" | "test" | "unknown">("unknown");
  const [paymentLock, setPaymentLock] = useState<{
    payments_locked: boolean;
    subscription_checkout_locked: boolean;
    wallet_topup_locked: boolean;
    payment_maintenance_message: string;
  }>({
    payments_locked: false,
    subscription_checkout_locked: false,
    wallet_topup_locked: false,
    payment_maintenance_message: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (user) {
      loadWallet();
      loadUpiMethods();
      loadPaymentControls();
    }
  }, [user]);

  const loadPaymentControls = async () => {
    try {
      const { data } = await supabase
        .from("api_runtime_config")
        .select("key, value")
        .in("key", [
          "payments_locked",
          "subscription_checkout_locked",
          "wallet_topup_locked",
          "payment_maintenance_message",
        ]);
      const m: any = {};
      for (const r of data || []) m[(r as any).key] = (r as any).value;
      setPaymentLock({
        payments_locked: m.payments_locked === true,
        subscription_checkout_locked: m.subscription_checkout_locked === true,
        wallet_topup_locked: m.wallet_topup_locked === true,
        payment_maintenance_message: typeof m.payment_maintenance_message === "string"
          ? m.payment_maintenance_message : "",
      });
    } catch {}
  };

  const loadWallet = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      setWalletBalance((data as any)?.balance || 0);
    } catch {}
  };

  const loadUpiMethods = async () => {
    const { data } = await supabase.from("payment_methods")
      .select("*").eq("is_active", true).order("priority", { ascending: false });
    if (data) {
      setUpiMethods(data as PaymentMethod[]);
      const firstUpi = (data as PaymentMethod[]).find(m => m.upi_id);
      if (firstUpi?.upi_id) setSelectedUpiId(firstUpi.upi_id);
    }
  };

  const openUpiDialog = (itemId: string, itemType: "plan" | "wallet", amount: number, label: string) => {
    if (upiMethods.length === 0) {
      toast({ title: "UPI not configured", description: "Please use card checkout or contact admin", variant: "destructive" });
      return;
    }
    setUpiDialog({ open: true, itemId, itemType, amount, label });
    setUtr("");
    setScreenshotFile(null);
  };

  const submitUpiPayment = async () => {
    if (!user || !utr.trim()) {
      toast({ title: "UTR required", description: "Enter your UPI transaction ID", variant: "destructive" });
      return;
    }
    setSubmittingUpi(true);
    try {
      let screenshot_url = null;
      if (screenshotFile) {
        const ext = screenshotFile.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs")
          .upload(filePath, screenshotFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("payment-proofs").getPublicUrl(filePath);
        screenshot_url = pub.publicUrl;
      }

      const { data, error } = await supabase.functions.invoke("upi-payment", {
        body: {
          action: "submit",
          payment_type: upiDialog.itemType,
          plan: upiDialog.itemType === "plan" ? upiDialog.itemId : null,
          wallet_pack: upiDialog.itemType === "wallet" ? upiDialog.itemId : null,
          utr_number: utr.trim(),
          screenshot_url,
          upi_id_used: selectedUpiId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "✅ Payment submitted!",
        description: "Your payment is being verified by our team. This usually takes less than 1 minute. You'll receive an invoice via email once approved.",
      });
      setUpiDialog({ ...upiDialog, open: false });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingUpi(false);
    }
  };

  const copyUpi = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    toast({ title: "✓ UPI ID copied", description: upiId });
  };

  const initPayment = async (planId: string) => {
    if (!user || !profile) return;
    if (paymentLock.payments_locked || paymentLock.subscription_checkout_locked) {
      toast({ title: "Payments paused", description: paymentLock.payment_maintenance_message || "Subscriptions are temporarily disabled.", variant: "destructive" });
      return;
    }
    setProcessing(planId);
    try {
      const { data, error } = await supabase.functions.invoke("dodo-checkout", {
        body: {
          internal_key: planId,
          billing_interval: billingCycle,
          coupon_code: appliedCoupon || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.checkout_url) throw new Error("No checkout URL returned");
      if (data?.mode) setPaymentMode(data.mode);
      // Production guardrail: warn if checkout came back as TEST on the live host.
      if (data?.mode === "test" && typeof window !== "undefined" && window.location.hostname === "hustlaiapp.in") {
        toast({
          title: "⚠️ Test mode detected on production",
          description: "Payments are still configured in TEST mode. Contact admin — do not complete real payment.",
          variant: "destructive",
        });
      }
      // Try to open as overlay popup; fall back to redirect if blocked
      const popup = window.open(data.checkout_url, "dodo_checkout", "width=480,height=720");
      if (!popup) window.location.href = data.checkout_url;
    } catch (err: any) {
      toast({ title: "Payment Failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const initWalletTopup = async (packId: string) => {
    if (!user) return;
    if (paymentLock.payments_locked || paymentLock.wallet_topup_locked) {
      toast({ title: "Wallet top-ups paused", description: paymentLock.payment_maintenance_message || "Wallet top-ups are temporarily disabled.", variant: "destructive" });
      return;
    }
    setProcessing(packId);
    try {
      const { data, error } = await supabase.functions.invoke("dodo-checkout", {
        body: {
          internal_key: packId,
          coupon_code: appliedCoupon || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.checkout_url) throw new Error("No checkout URL returned");
      if (data?.mode) setPaymentMode(data.mode);
      const popup = window.open(data.checkout_url, "dodo_checkout", "width=480,height=720");
      if (!popup) window.location.href = data.checkout_url;
    } catch (err: any) {
      toast({ title: "Payment Failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const { data } = await supabase.from("dodo_coupons" as any)
      .select("code,description,discount_type,value,applies_to,valid_until,is_active")
      .eq("code", code).maybeSingle();
    if (!data || !(data as any).is_active) {
      toast({ title: "Invalid coupon", description: "That code doesn't exist or has expired.", variant: "destructive" });
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon(code);
    toast({ title: `🎉 ${code} applied`, description: (data as any).description || "Discount will appear at checkout." });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-6xl space-y-8">
            {/* Hero skeleton */}
            <div className="text-center space-y-4">
              <Skeleton className="h-10 w-3/4 max-w-xl mx-auto" />
              <Skeleton className="h-5 w-2/3 max-w-md mx-auto" />
              <div className="flex justify-center gap-3 pt-2">
                <Skeleton className="h-9 w-32 rounded-full" />
                <Skeleton className="h-9 w-32 rounded-full" />
              </div>
            </div>
            {/* Plan cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="glass rounded-2xl p-6 space-y-4 border border-border/50"
                >
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-12 w-32" />
                  <div className="space-y-2 pt-2">
                    {[0, 1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                  <Skeleton className="h-11 w-full rounded-xl mt-4" />
                </div>
              ))}
            </div>
            {/* Wallet strip skeleton */}
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const currentTier = profile?.subscription_tier || "free";
  const primaryUpi = upiMethods.find(m => m.upi_id) || null;
  const primaryQr = upiMethods.find(m => m.qr_image_url) || null;
  const annualSavings = plans.reduce((acc, p) => acc + (p.price * 12 - Math.round(p.price * 12 * 0.8)), 0);

  return (
    <TooltipProvider delayDuration={150}>
    <div className="min-h-screen bg-background">
      <SEO title="Payment | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl space-y-10">
          {/* Payment lock / maintenance banner */}
          {(paymentLock.payments_locked || paymentLock.subscription_checkout_locked || paymentLock.wallet_topup_locked) && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-amber-600 dark:text-amber-400">
                  {paymentLock.payments_locked
                    ? "Payments are temporarily paused"
                    : paymentLock.subscription_checkout_locked
                      ? "Subscription checkout is paused"
                      : "Wallet top-ups are paused"}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {paymentLock.payment_maintenance_message
                    || "We're performing maintenance on our payment provider. Existing subscriptions are unaffected. Please check back shortly."}
                </p>
              </div>
            </div>
          )}

          {/* Mode badge — only shown when non-live */}
          {paymentMode === "test" && (
            <div className="flex justify-center">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40">
                ⚠ TEST MODE — payments are not real
              </Badge>
            </div>
          )}

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-4 max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary">
              <Sparkles className="w-3 h-3" /> Pricing
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
              Pick the plan that<br className="hidden sm:block" /> fits your <span className="text-gradient">hustle</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Cancel anytime. Instant activation. GST-compliant invoices delivered to your inbox.
            </p>
          </motion.div>

          {/* Trust strip */}
          <div className="mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-wider text-muted-foreground/80">
            <span className="inline-flex items-center gap-1.5"><Lock className="w-3 h-3 text-emerald-500" /> 256-bit secure checkout</span>
            <span className="inline-flex items-center gap-1.5"><Receipt className="w-3 h-3 text-emerald-500" /> GST invoices</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="w-3 h-3 text-emerald-500" /> Instant activation</span>
            <span className="inline-flex items-center gap-1.5"><Shield className="w-3 h-3 text-emerald-500" /> Powered by Dodo Payments</span>
          </div>

          {/* Priority 1 UPI Banner */}
          {primaryUpi && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-2 border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-emerald-500" />
                <h3 className="font-display font-bold text-lg">Pay via UPI — Recommended</h3>
                <Badge className="bg-emerald-500 text-white text-[10px]">PRIORITY</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Send to our UPI ID, then submit your transaction ID. Activated within 1–4 hours. No transaction fees.
              </p>
              <div className="flex items-center gap-2 p-3 bg-background/60 rounded-lg border border-emerald-500/20">
                <code className="flex-1 text-sm font-mono text-emerald-500 font-bold">{primaryUpi.upi_id}</code>
                <Button size="sm" variant="ghost" onClick={() => copyUpi(primaryUpi.upi_id!)}>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
              </div>
              {primaryUpi.display_name && (
                <p className="text-xs text-muted-foreground mt-2">Account: <span className="font-semibold">{primaryUpi.display_name}</span></p>
              )}
            </motion.div>
          )}

          {/* Tab Toggle — segmented control */}
          <div className="flex flex-col items-center gap-4">
            <div className="inline-flex rounded-full border border-border bg-card/50 p-1 shadow-sm">
              <button
                onClick={() => setActiveTab("plans")}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${activeTab === "plans" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <Sparkles className="w-3.5 h-3.5" /> Subscription
              </button>
              <button
                onClick={() => setActiveTab("wallet")}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${activeTab === "wallet" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <Wallet className="w-3.5 h-3.5" /> Pay-as-you-go
              </button>
            </div>

            {/* Billing cycle toggle (subscription only) */}
            {activeTab === "plans" && (
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex rounded-full border border-border bg-background p-1">
                  <button
                    onClick={() => setBillingCycle("month")}
                    className={`px-4 py-1.5 text-[11px] font-semibold rounded-full transition ${billingCycle === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle("year")}
                    className={`px-4 py-1.5 text-[11px] font-semibold rounded-full transition flex items-center gap-1.5 ${billingCycle === "year" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    Yearly
                    <span className="rounded-full bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 text-[9px] font-bold">SAVE 20%</span>
                  </button>
                </div>
                {billingCycle === "year" ? (
                  <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Save up to ₹{annualSavings.toLocaleString()}/yr across plans
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Gift className="w-3 h-3 text-emerald-500" /> Pro includes a 7-day free trial · cancel anytime
                  </p>
                )}
              </div>
            )}

            {/* Coupon input — pill */}
            <div className="w-full max-w-sm">
              <div className="glass rounded-full p-1.5 pl-4 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Coupon code (e.g. LAUNCH50)"
                  className="border-0 bg-transparent focus-visible:ring-0 text-xs h-7 px-0"
                />
                {appliedCoupon ? (
                  <Badge className="bg-emerald-500 text-white rounded-full text-[10px]">{appliedCoupon} ✓</Badge>
                ) : (
                  <Button size="sm" variant="default" onClick={applyCoupon} className="h-7 rounded-full text-[11px] px-3">
                    Apply
                  </Button>
                )}
              </div>
            </div>
          </div>

          {activeTab === "plans" ? (
            <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
              {plans.map((plan, i) => {
                const isCurrentOrLower = ["free", ...plans.slice(0, plans.findIndex(p => p.id === currentTier) + 1).map(p => p.id)].includes(plan.id);
                const isCurrent = plan.id === currentTier;
                const yearlyPrice = Math.round(plan.price * 12 * 0.8);
                const displayPrice = billingCycle === "year" ? yearlyPrice : plan.price;
                const cycleLabel = billingCycle === "year" ? "/year" : "/month";
                const isPopular = plan.id === "elite";
                const isBestValue = plan.id === "infinity" && billingCycle === "year";
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`relative glass rounded-2xl p-6 sm:p-7 flex flex-col gap-5 transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                      isPopular ? "border-primary/40 shadow-glow ring-1 ring-primary/20" : "hover:border-primary/30"
                    } ${isCurrent ? "border-primary/50 shadow-glow" : ""}`}
                  >
                    {/* Ribbons */}
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold bg-gradient-primary text-primary-foreground shadow-lg uppercase tracking-wider">
                        Most Popular
                      </div>
                    )}
                    {isBestValue && (
                      <div className="absolute -top-3 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-lg uppercase tracking-wider">
                        Best Value
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <plan.icon className={`w-7 h-7 ${plan.color}`} />
                        {isCurrent && (
                          <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-2xl">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {plan.id === "pro" && "For solo creators getting started"}
                          {plan.id === "elite" && "For serious operators scaling income"}
                          {plan.id === "infinity" && "For agencies & power-creators"}
                        </p>
                      </div>
                      <div className="flex items-baseline gap-1.5 pt-1">
                        <span className="text-4xl font-display font-bold tracking-tight">₹{displayPrice.toLocaleString()}</span>
                        <span className="text-muted-foreground text-sm">{cycleLabel}</span>
                      </div>
                      {billingCycle === "year" ? (
                        <p className="text-[11px] text-emerald-500 font-medium">
                          You save ₹{(plan.price * 12 - yearlyPrice).toLocaleString()} vs monthly
                        </p>
                      ) : plan.id === "pro" ? (
                        <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                          <Gift className="w-3 h-3" /> 7-day free trial included
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Billed monthly · cancel anytime</p>
                      )}
                    </div>

                    <div className="h-px bg-border/50" />

                    <ul className="space-y-2.5 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <Badge className="w-full justify-center py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10">
                        ✓ Active Plan
                      </Badge>
                    ) : isCurrentOrLower ? (
                      <Button disabled variant="outline" className="w-full opacity-60">
                        Already Included
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          onClick={() => initPayment(plan.id)}
                         disabled={!!processing || paymentLock.payments_locked || paymentLock.subscription_checkout_locked}
                          size="lg"
                          className={`w-full ${isPopular ? "bg-gradient-primary text-primary-foreground shadow-lg" : ""}`}
                          variant={isPopular ? "default" : "outline"}
                        >
                          {processing === plan.id ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening checkout…</>
                          ) : (
                            <>Upgrade to {plan.name} <ArrowRight className="w-4 h-4 ml-1.5" /></>
                          )}
                        </Button>
                        {primaryUpi && (
                          <Button onClick={() => openUpiDialog(plan.id, "plan", displayPrice, `${plan.name} Plan`)} disabled={!!processing}
                            variant="outline" className="w-full border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600">
                            <Smartphone className="w-3.5 h-3.5 mr-1.5" /> Pay via UPI manually
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wallet Balance — premium card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent"
              >
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,hsl(160_84%_42%_/_0.15),transparent_60%)]" />
                <div className="relative flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Credit balance</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="opacity-60 hover:opacity-100"><Info className="w-3 h-3" /></button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">1 credit = 1 AI search across any tool. Credits never expire.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-3xl font-display font-bold tracking-tight mt-0.5">
                        {walletBalance.toLocaleString()} <span className="text-base text-muted-foreground font-normal">credits</span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[10px] uppercase tracking-wider">
                    All tools unlocked
                  </Badge>
                </div>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {walletPacks.map((pack, i) => {
                  const isPopularPack = pack.id === "pack_50";
                  return (
                    <motion.div
                      key={pack.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`relative glass rounded-2xl p-5 flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                        isPopularPack ? "border-emerald-500/40 ring-1 ring-emerald-500/20" : "hover:border-emerald-500/30"
                      }`}
                    >
                      {isPopularPack && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white uppercase tracking-wider">
                          Best deal
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{pack.label}</p>
                        <h3 className="font-display font-bold text-2xl">{pack.credits}<span className="text-sm text-muted-foreground font-normal ml-1">credits</span></h3>
                        <p className="text-xl font-display font-bold text-emerald-500">₹{pack.price}</p>
                        <p className="text-[11px] text-muted-foreground">₹{(pack.price / pack.credits).toFixed(0)} per search</p>
                      </div>
                      <div className="space-y-2 mt-auto">
                        <Button
                          onClick={() => initWalletTopup(pack.id)}
                         disabled={!!processing || paymentLock.payments_locked || paymentLock.wallet_topup_locked}
                          className={`w-full text-xs ${isPopularPack ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                          variant={isPopularPack ? "default" : "outline"}
                          size="sm"
                        >
                          {processing === pack.id ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <>Top up ₹{pack.price}</>}
                        </Button>
                        {primaryUpi && (
                          <Button onClick={() => openUpiDialog(pack.id, "wallet", pack.price, `${pack.credits} Credits`)} disabled={!!processing}
                            variant="ghost" size="sm"
                            className="w-full text-[11px] text-emerald-600 hover:bg-emerald-500/10">
                            <Smartphone className="w-3 h-3 mr-1" /> UPI
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compare drawer + payment methods strip + FAQ */}
          <div className="space-y-8 pt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-8">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="w-3.5 h-3.5" /> Compare features in detail
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Plan comparison</SheetTitle>
                    <SheetDescription>Every feature side-by-side. Tap a plan above to upgrade.</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left py-2 font-medium">Feature</th>
                          <th className="text-center font-medium">Pro</th>
                          <th className="text-center font-medium">Elite</th>
                          <th className="text-center font-medium">Infinity</th>
                        </tr>
                      </thead>
                      <tbody className="[&>tr]:border-b [&>tr]:border-border/50 [&>tr>td]:py-3">
                        <tr><td>AI searches/day</td><td className="text-center">5</td><td className="text-center">10</td><td className="text-center">20</td></tr>
                        <tr><td>All AI tools</td><td className="text-center"><Check className="w-4 h-4 text-emerald-500 inline" /></td><td className="text-center"><Check className="w-4 h-4 text-emerald-500 inline" /></td><td className="text-center"><Check className="w-4 h-4 text-emerald-500 inline" /></td></tr>
                        <tr><td>HustleBot AI Mentor</td><td className="text-center text-muted-foreground">—</td><td className="text-center"><Check className="w-4 h-4 text-emerald-500 inline" /></td><td className="text-center"><Check className="w-4 h-4 text-emerald-500 inline" /></td></tr>
                        <tr><td>Lead Discovery</td><td className="text-center text-muted-foreground">—</td><td className="text-center"><Check className="w-4 h-4 text-emerald-500 inline" /></td><td className="text-center"><Check className="w-4 h-4 text-emerald-500 inline" /></td></tr>
                        <tr><td>Create & sell courses</td><td className="text-center text-muted-foreground">—</td><td className="text-center text-muted-foreground">—</td><td className="text-center">5 / month</td></tr>
                        <tr><td>API access</td><td className="text-center text-muted-foreground">—</td><td className="text-center text-muted-foreground">—</td><td className="text-center"><Check className="w-4 h-4 text-emerald-500 inline" /></td></tr>
                        <tr><td>Affiliate commission</td><td className="text-center">5%</td><td className="text-center">6%</td><td className="text-center">10%+</td></tr>
                        <tr><td>Priority support</td><td className="text-center text-muted-foreground">—</td><td className="text-center"><Check className="w-4 h-4 text-emerald-500 inline" /></td><td className="text-center"><Check className="w-4 h-4 text-emerald-500 inline" /></td></tr>
                      </tbody>
                    </table>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Payment methods strip */}
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>We accept</span>
                <div className="flex items-center gap-2">
                  {["VISA", "MC", "UPI", "RuPay", "Net"].map(m => (
                    <span key={m} className="px-2 py-1 rounded border border-border bg-card text-[10px] font-mono font-semibold text-foreground/70">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <HelpCircle className="w-3 h-3" /> Frequently asked
                </div>
                <h2 className="font-display font-bold text-2xl mt-2">Questions before you upgrade</h2>
              </div>
              <Accordion type="single" collapsible className="glass rounded-2xl px-6 divide-y divide-border/50">
                <AccordionItem value="q1" className="border-0">
                  <AccordionTrigger className="text-sm font-medium">How does the 7-day Pro free trial work?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Start Pro and we won't charge for the first 7 days. Cancel any time inside Settings → Billing — no questions asked, no charge.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2" className="border-0">
                  <AccordionTrigger className="text-sm font-medium">Do I get a GST invoice?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Yes. A GST-compliant invoice is auto-generated and emailed within minutes of every successful payment, and is also available under Settings → Billing → Invoices.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3" className="border-0">
                  <AccordionTrigger className="text-sm font-medium">Can I cancel or downgrade anytime?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Yes. Cancellations take effect at the end of your current billing cycle — you keep access until then. Downgrades happen at renewal.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q4" className="border-0">
                  <AccordionTrigger className="text-sm font-medium">What's the refund policy?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Digital subscriptions and wallet credits are non-refundable once issued. The 7-day Pro trial exists so you can try risk-free. For accidental duplicate charges, write to us within 24 hours.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q5" className="border-0">
                  <AccordionTrigger className="text-sm font-medium">Subscription vs wallet credits — which should I pick?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Pick a subscription if you use AI tools daily. Pick wallet credits if your usage is bursty — credits never expire and unlock every tool.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q6" className="border-0">
                  <AccordionTrigger className="text-sm font-medium">Is my payment secure?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Payments are processed by Dodo Payments over a 256-bit TLS connection. Card details never touch our servers. Webhook-confirmed activation means your plan goes live the instant payment clears.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      {/* UPI Payment Dialog */}
      <Dialog open={upiDialog.open} onOpenChange={(o) => setUpiDialog({ ...upiDialog, open: o })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-500" />
              Pay ₹{upiDialog.amount} for {upiDialog.label}
            </DialogTitle>
            <DialogDescription>Step 1: Pay → Step 2: Submit your UPI transaction ID</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* QR Code */}
            {primaryQr?.qr_image_url && (
              <div className="text-center p-4 bg-white rounded-xl">
                <img src={primaryQr.qr_image_url} alt="UPI QR" className="w-48 h-48 mx-auto object-contain" />
                <p className="text-xs text-muted-foreground mt-2">Scan with any UPI app</p>
              </div>
            )}

            {/* UPI ID selector */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Or send to UPI ID</Label>
              <div className="space-y-2">
                {upiMethods.filter(m => m.upi_id).map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                    <input type="radio" checked={selectedUpiId === m.upi_id} onChange={() => setSelectedUpiId(m.upi_id!)} />
                    <code className="flex-1 text-sm font-mono text-emerald-600 font-bold">{m.upi_id}</code>
                    <Button type="button" size="sm" variant="ghost" onClick={() => copyUpi(m.upi_id!)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="utr">UPI Transaction ID (UTR) *</Label>
                <Input id="utr" value={utr} onChange={(e) => setUtr(e.target.value)}
                  placeholder="e.g. 412345678901" maxLength={30} />
                <p className="text-[11px] text-muted-foreground">Found in your UPI app's payment confirmation</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="screenshot">Payment Screenshot (optional but recommended)</Label>
                <Input id="screenshot" type="file" accept="image/*"
                  onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-2 text-xs">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Verification within 1–4 hours. Plan activates automatically + invoice emailed to you.</span>
              </div>

              <Button onClick={submitUpiPayment} disabled={submittingUpi || !utr.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {submittingUpi ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting...</>
                  : <><CheckCircle2 className="w-4 h-4 mr-1" /> Submit Payment Proof</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
