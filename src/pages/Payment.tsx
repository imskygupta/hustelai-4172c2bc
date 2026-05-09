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
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Check, Crown, Rocket, Star, Shield, Loader2, Wallet, ArrowRight, Sparkles, Smartphone, Copy, Upload, CreditCard, Zap, CheckCircle2, Clock, Tag, Gift } from "lucide-react";

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

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (user) {
      loadWallet();
      loadUpiMethods();
    }
  }, [user]);

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
        description: "Admin will verify within 1–4 hours. You'll get an invoice via email once approved.",
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

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const currentTier = profile?.subscription_tier || "free";
  const primaryUpi = upiMethods.find(m => m.upi_id) || null;
  const primaryQr = upiMethods.find(m => m.qr_image_url) || null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Payment | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <h1 className="text-3xl font-display font-bold">Upgrade Your <span className="text-gradient">Hustle Plan</span></h1>
            <p className="text-muted-foreground">Pay via UPI (recommended) or instant card / netbanking checkout. UPI takes ~1–4 hr verification.</p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-emerald-500" /> UPI · Zero fees</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Card / Netbanking · Instant</span>
            </div>
          </motion.div>

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

          {/* Billing cycle toggle + Coupon */}
          {activeTab === "plans" && (
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex rounded-full border border-border bg-background/50 p-1">
                <button
                  onClick={() => setBillingCycle("month")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${billingCycle === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("year")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition flex items-center gap-1 ${billingCycle === "year" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  Yearly <Badge className="bg-emerald-500 text-white text-[9px] ml-1">-20%</Badge>
                </button>
              </div>
              {billingCycle === "month" && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Gift className="w-3 h-3 text-emerald-500" /> Pro includes a 7-day free trial · cancel anytime
                </p>
              )}
            </div>
          )}

          <div className="max-w-md mx-auto w-full">
            <div className="glass rounded-xl p-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Have a coupon? e.g. LAUNCH50"
                className="border-0 bg-transparent focus-visible:ring-0 text-sm h-8 px-1"
              />
              {appliedCoupon ? (
                <Badge className="bg-emerald-500 text-white">{appliedCoupon} ✓</Badge>
              ) : (
                <Button size="sm" variant="outline" onClick={applyCoupon} className="h-8 text-xs">Apply</Button>
              )}
            </div>
          </div>

          {activeTab === "plans" ? (
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan, i) => {
                const isCurrentOrLower = ["free", ...plans.slice(0, plans.findIndex(p => p.id === currentTier) + 1).map(p => p.id)].includes(plan.id);
                const isCurrent = plan.id === currentTier;
                const yearlyPrice = Math.round(plan.price * 12 * 0.8);
                const displayPrice = billingCycle === "year" ? yearlyPrice : plan.price;
                const cycleLabel = billingCycle === "year" ? "/year" : "/month";
                return (
                  <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className={`glass rounded-2xl p-6 space-y-5 transition-all hover:border-primary/30 ${isCurrent ? "border-primary/50 shadow-glow" : ""}`}>
                    <div className="space-y-2">
                      <plan.icon className={`w-8 h-8 ${plan.color}`} />
                      <h3 className="font-display font-bold text-xl">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-display font-bold text-gradient">₹{displayPrice}</span>
                        <span className="text-muted-foreground text-sm">{cycleLabel}</span>
                      </div>
                      {billingCycle === "year" && (
                        <p className="text-[11px] text-emerald-500 font-medium">
                          Save ₹{plan.price * 12 - yearlyPrice}/year vs monthly
                        </p>
                      )}
                      {plan.id === "pro" && billingCycle === "month" && (
                        <p className="text-[11px] text-emerald-500 font-medium">7-day free trial included</p>
                      )}
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
                      <div className="space-y-2">
                        <Button onClick={() => initPayment(plan.id)} disabled={!!processing}
                          className="w-full bg-gradient-primary text-primary-foreground">
                          {processing === plan.id ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Opening checkout…</>
                            : <><CreditCard className="w-4 h-4 mr-1" /> Pay ₹{displayPrice} via Card / UPI / Netbanking</>}
                        </Button>
                        {primaryUpi && (
                          <Button onClick={() => openUpiDialog(plan.id, "plan", displayPrice, `${plan.name} Plan`)} disabled={!!processing}
                            variant="outline" className="w-full border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600">
                            <Smartphone className="w-4 h-4 mr-1" /> Manual UPI (1–4 hr verify)
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
                    <div className="space-y-2">
                      <Button onClick={() => initWalletTopup(pack.id)} disabled={!!processing}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                        {processing === pack.id ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <><CreditCard className="w-3 h-3 mr-1" /> Buy ₹{pack.price}</>}
                      </Button>
                      {primaryUpi && (
                        <Button onClick={() => openUpiDialog(pack.id, "wallet", pack.price, `${pack.credits} Credits`)} disabled={!!processing}
                          variant="outline" size="sm"
                          className="w-full text-xs border-emerald-500/30">
                          <Smartphone className="w-3 h-3 mr-1" /> Manual UPI
                        </Button>
                      )}
                    </div>
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
  );
}
