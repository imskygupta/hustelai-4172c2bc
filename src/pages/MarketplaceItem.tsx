import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  IndianRupee, ShoppingCart, Shield, CheckCircle, Star, ArrowLeft,
  Package, Users, Clock, CreditCard, Lock, Crown, Loader2, ExternalLink
} from "lucide-react";

interface MarketItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  item_type: string;
  is_published: boolean;
  sales_count: number;
  seller_id: string;
  created_at: string;
  download_url: string | null;
  preview_url: string | null;
  currency: string;
}

export default function MarketplaceItem() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<MarketItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (id) loadItem();
  }, [id]);

  const loadItem = async () => {
    const { data, error } = await supabase
      .from("marketplace_items")
      .select("*")
      .eq("id", id!)
      .eq("is_published", true)
      .single();
    if (data) setItem(data as MarketItem);
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!item) return;

    if (item.price === 0) {
      toast({ title: "🎉 Access Granted!", description: "This item is free. Check your downloads." });
      return;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("dodo-checkout", {
        body: { internal_key: "marketplace_" + item.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.checkout_url) throw new Error("No checkout URL returned");
      const popup = window.open(data.checkout_url, "dodo_checkout", "width=480,height=720");
      if (!popup) window.location.href = data.checkout_url;
    } catch (err: any) {
      toast({ title: "Payment Failed", description: err.message, variant: "destructive" });
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-32 gap-4">
          <Package className="w-16 h-16 text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold">Product Not Found</h1>
          <Button onClick={() => navigate("/marketplace")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const tier = profile?.subscription_tier || "free";
  const isFree = tier === "free";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Breadcrumb */}
          <button onClick={() => navigate("/marketplace")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </button>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Product Details - Left */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-3 space-y-6">
              {/* Product Image/Preview Area */}
              <div className="glass rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                {item.preview_url ? (
                  <img src={item.preview_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center space-y-3 relative z-10">
                    <Package className="w-20 h-20 text-primary/40 mx-auto" />
                    <p className="text-muted-foreground text-sm">No preview available</p>
                  </div>
                )}
                <Badge className="absolute top-4 left-4 bg-primary/90 text-primary-foreground">
                  {item.item_type}
                </Badge>
              </div>

              {/* Description */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="font-display font-bold text-lg">About this {item.item_type}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description || "No detailed description available for this product."}
                </p>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Shield, label: "Verified Seller", color: "text-primary" },
                  { icon: CreditCard, label: "Secure Payment", color: "text-primary" },
                  { icon: CheckCircle, label: "Escrow Protected", color: "text-primary" },
                ].map((badge) => (
                  <div key={badge.label} className="glass rounded-xl p-3 text-center space-y-1.5">
                    <badge.icon className={`w-5 h-5 mx-auto ${badge.color}`} />
                    <p className="text-[10px] text-muted-foreground font-medium">{badge.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Purchase Card - Right */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 space-y-4">
              <div className="glass rounded-2xl p-6 space-y-5 sticky top-24">
                <div className="space-y-2">
                  <h1 className="text-2xl font-display font-bold">{item.title}</h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{item.category || item.item_type}</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      <CheckCircle className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                  </div>
                </div>

                <div className="border-y border-border/50 py-4 space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display font-bold text-gradient flex items-center">
                      <IndianRupee className="w-7 h-7" />{item.price}
                    </span>
                    <span className="text-muted-foreground text-sm">one-time</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> {item.sales_count} sold</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Instant delivery</span>
                  </div>
                </div>

                {isFree ? (
                  <div className="space-y-3">
                    <div className="glass rounded-xl p-4 text-center space-y-2 border-primary/20">
                      <Lock className="w-6 h-6 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Upgrade to purchase marketplace items</p>
                    </div>
                    <Button className="w-full bg-gradient-primary text-primary-foreground h-12 text-base"
                      onClick={() => navigate("/payment")}>
                      <Crown className="w-5 h-5 mr-2" /> Upgrade to Buy
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button className="w-full bg-gradient-primary text-primary-foreground h-12 text-base btn-press"
                      onClick={handlePurchase} disabled={purchasing}>
                      {purchasing ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                      ) : item.price > 0 ? (
                        <><CreditCard className="w-5 h-5 mr-2" /> Buy Now — ₹{item.price}</>
                      ) : (
                        <><Package className="w-5 h-5 mr-2" /> Get Free</>
                      )}
                    </Button>
                    {item.download_url && item.price === 0 && (
                      <Button variant="outline" className="w-full" onClick={() => window.open(item.download_url!, "_blank")}>
                        <ExternalLink className="w-4 h-4 mr-2" /> Direct Download
                      </Button>
                    )}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Secured by HustleAI Escrow
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Refund within 24 hours if undelivered
                  </p>
                </div>
              </div>

              {/* Similar Items */}
              <div className="glass rounded-2xl p-5 space-y-3">
                <h3 className="font-display font-semibold text-sm">More from Marketplace</h3>
                <Button variant="outline" className="w-full text-sm" onClick={() => navigate("/marketplace")}>
                  <Package className="w-4 h-4 mr-2" /> Browse All Products
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
