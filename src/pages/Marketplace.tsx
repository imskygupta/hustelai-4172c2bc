import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Store, Search, Lock, GraduationCap, Package, Star,
  IndianRupee, ShoppingCart, Eye, TrendingUp, Filter, Crown,
  Shield, CheckCircle, Zap, ArrowRight, CreditCard, Users, Award
} from "lucide-react";
import { motion } from "framer-motion";

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
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  is_published: boolean;
  enrolled_count: number;
  creator_id: string;
  created_at: string;
}

const categories = ["All", "Template", "Tool", "E-book", "Plugin", "Design", "Course"];

const features = [
  { icon: Shield, title: "Verified Listings", desc: "Every tool and course is reviewed for quality before publishing." },
  { icon: CreditCard, title: "Seamless Payments", desc: "Integrated payment collection in INR. Instant checkout, no hassle." },
  { icon: Award, title: "Escrow Protection", desc: "Your money is safe. Funds release only after delivery confirmation." },
  { icon: CheckCircle, title: "Verified Links", desc: "All download links and resources are scanned and verified." },
  { icon: Users, title: "Creator Community", desc: "Join elite sellers who build and sell digital products." },
  { icon: TrendingUp, title: "Revenue Analytics", desc: "Track sales, earnings, and performance in your dashboard." },
];

export default function Marketplace() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"tools" | "courses">("tools");
  const [loading, setLoading] = useState(true);

  const tier = profile?.subscription_tier || "free";
  const isFree = tier === "free";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [itemsRes, coursesRes] = await Promise.all([
      supabase.from("marketplace_items").select("*").eq("is_published", true).order("sales_count", { ascending: false }),
      supabase.from("courses").select("*").eq("is_published", true).order("enrolled_count", { ascending: false }),
    ]);
    if (itemsRes.data) setItems(itemsRes.data as MarketItem[]);
    if (coursesRes.data) setCourses(coursesRes.data as Course[]);
    setLoading(false);
  };

  const filtered = activeTab === "tools"
    ? items.filter(i => {
        const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase());
        const matchCat = activeCategory === "All" || i.category === activeCategory || i.item_type === activeCategory.toLowerCase();
        return matchSearch && matchCat;
      })
    : courses.filter(c => {
        const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
        const matchCat = activeCategory === "All" || c.category === activeCategory || activeCategory === "Course";
        return matchSearch && matchCat;
      });

  const visibleLimit = isFree ? 2 : filtered.length;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Hero */}
        <section className="pt-32 pb-16 px-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-20 w-72 h-72 bg-accent/8 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          </div>
          <div className="container mx-auto max-w-5xl text-center relative z-10 space-y-6">
            <ScrollReveal>
              <Badge variant="outline" className="border-primary/30 text-primary px-4 py-1.5">
                <Store className="w-3.5 h-3.5 mr-1.5" /> HustleAI Marketplace
              </Badge>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h1 className="text-4xl md:text-6xl font-display font-bold">
                Tools, Courses & <span className="text-gradient">Resources</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover premium digital products created by verified hustlers. Seamless payments, escrow protection, and verified resources.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground"
                  onClick={() => document.getElementById("marketplace-grid")?.scrollIntoView({ behavior: "smooth" })}>
                  <Store className="w-5 h-5 mr-2" /> Browse Now
                </Button>
                {!user && (
                  <Button size="lg" variant="outline" onClick={() => navigate("/signup")}>
                    <Crown className="w-5 h-5 mr-2" /> Join Premium Guild
                  </Button>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4 border-t border-border/50">
          <div className="container mx-auto max-w-6xl">
            <ScrollReveal>
              <h2 className="text-3xl font-display font-bold text-center mb-4">
                Why Our <span className="text-gradient">Marketplace</span>?
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
                Built for hustlers, by hustlers. Every feature designed for trust and growth.
              </p>
            </ScrollReveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <ScrollReveal key={f.title} delay={i * 0.08}>
                  <div className="glass rounded-xl p-6 space-y-3 hover:border-primary/30 hover:shadow-glow transition-all duration-500 h-full">
                    <f.icon className="w-8 h-8 text-primary" />
                    <h3 className="font-display font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Marketplace Grid */}
        <section id="marketplace-grid" className="py-12 px-4">
          <div className="container mx-auto max-w-5xl space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2">
                <Button variant={activeTab === "tools" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("tools")}>
                  <Package className="w-4 h-4 mr-1" /> Tools & Templates
                </Button>
                <Button variant={activeTab === "courses" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("courses")}>
                  <GraduationCap className="w-4 h-4 mr-1" /> Courses
                </Button>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search marketplace..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-10 bg-secondary/50" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Button key={cat} variant={activeCategory === cat ? "default" : "ghost"} size="sm"
                  className="text-xs h-7" onClick={() => setActiveCategory(cat)}>
                  {cat}
                </Button>
              ))}
            </div>

            {/* Items */}
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">Loading marketplace...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <Store className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No items found. Check back soon!</p>
                {(tier === "elite" || tier === "infinity") && (
                  <Button onClick={() => navigate("/infinity-zone?tab=marketplace")} className="bg-gradient-primary text-primary-foreground">
                    List Your Own Item
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map((item, i) => {
                    const isLocked = i >= visibleLimit;
                    const isItem = activeTab === "tools";
                    const it = item as any;
                    return (
                      <motion.div key={it.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`glass rounded-xl overflow-hidden transition-all duration-300 ${isLocked ? "opacity-40 blur-[1px]" : "hover:border-primary/30 hover:shadow-glow"}`}>
                        <div className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px]">
                              {isItem ? (it as MarketItem).item_type : "Course"}
                            </Badge>
                            {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                            {!isLocked && it.price === 0 && <Badge className="bg-primary/20 text-primary text-[10px]">Free</Badge>}
                          </div>
                          <h3 className="font-display font-semibold">{it.title}</h3>
                          {it.description && <p className="text-xs text-muted-foreground line-clamp-2">{it.description}</p>}
                          <div className="flex items-center justify-between pt-2">
                            <span className="font-display font-bold text-lg flex items-center">
                              {it.price > 0 ? <><IndianRupee className="w-4 h-4" />{it.price}</> : "Free"}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {isItem ? <><ShoppingCart className="w-3 h-3" /> {(it as MarketItem).sales_count} sales</> 
                                      : <><Eye className="w-3 h-3" /> {(it as Course).enrolled_count} enrolled</>}
                            </div>
                          </div>
                          {!isLocked && (
                            <Button size="sm" className="w-full bg-gradient-primary text-primary-foreground">
                              {it.price > 0 ? "Buy Now" : "Get Free"}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {isFree && filtered.length > visibleLimit && (
                  <div className="text-center mt-8 space-y-3">
                    <p className="text-muted-foreground text-sm">Upgrade to unlock all marketplace items</p>
                    <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/payment")}>
                      <Crown className="w-4 h-4 mr-2" /> Upgrade Now
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* CTA: Join Premium Guild */}
        <section className="py-20 px-4 border-t border-border/50">
          <div className="container mx-auto max-w-4xl">
            <ScrollReveal direction="scale">
              <div className="glass rounded-2xl p-10 text-center space-y-6 border-accent/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <div className="relative z-10 space-y-5">
                  <Crown className="w-14 h-14 text-primary mx-auto" />
                  <h2 className="text-3xl md:text-4xl font-display font-bold">
                    Join the <span className="text-gradient">Premium Guild</span>
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Unlock full marketplace access, sell your own products, earn affiliate commissions, 
                    and get escrow-protected transactions. Elite creators build here.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    {["Sell courses & tools", "Escrow payments", "Verified badges", "Revenue analytics"].map(f => (
                      <span key={f} className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-primary" /> {f}
                      </span>
                    ))}
                  </div>
                  <Button size="lg" className="bg-gradient-primary text-primary-foreground text-lg px-10 h-14"
                    onClick={() => navigate(user ? "/payment" : "/signup")}>
                    <Zap className="w-5 h-5 mr-2" /> {user ? "Upgrade Now" : "Get Started"} <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Sell CTA for eligible users */}
        {user && (tier === "elite" || tier === "infinity") && (
          <section className="pb-20 px-4">
            <div className="container mx-auto max-w-5xl">
              <ScrollReveal>
                <div className="glass rounded-2xl p-8 text-center space-y-4 border-accent/20">
                  <Star className="w-10 h-10 text-yellow-500 mx-auto" />
                  <h2 className="text-2xl font-display font-bold">Start Selling on Marketplace</h2>
                  <p className="text-muted-foreground text-sm">
                    {tier === "elite" ? "List 1 course, 1 tool, and 1 additional item." : "List up to 5 courses, 5 tools, and 5 additional items."}
                  </p>
                  <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/infinity-zone?tab=marketplace")}>
                    Go to Seller Dashboard
                  </Button>
                </div>
              </ScrollReveal>
            </div>
          </section>
        )}

        <Footer />
      </div>
    </PageTransition>
  );
}
