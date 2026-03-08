import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, Store, Users, Plus, Star, Lock,
  BookOpen, Package, ArrowRight, Trash2, Eye, EyeOff,
  IndianRupee, Tag, Pencil, X, ChevronDown, Sparkles
} from "lucide-react";

type Tab = "courses" | "marketplace" | "communities";

interface Course {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  content: string | null;
  price: number;
  category: string | null;
  is_published: boolean;
  enrolled_count: number;
  created_at: string;
}

interface MarketplaceItem {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  item_type: string;
  is_published: boolean;
  sales_count: number;
  created_at: string;
}

export default function InfinityZone() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [myItems, setMyItems] = useState<MarketplaceItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // Course form
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseContent, setCourseContent] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [courseCategory, setCourseCategory] = useState("Freelancing");

  // Marketplace form
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("Template");
  const [itemType, setItemType] = useState("tool");

  const isInfinity = profile?.subscription_tier === "infinity";

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, tab]);

  const loadData = async () => {
    if (tab === "courses") {
      const [allRes, myRes] = await Promise.all([
        supabase.from("courses").select("*").eq("is_published", true).order("created_at", { ascending: false }),
        isInfinity ? supabase.from("courses").select("*").eq("creator_id", user!.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      ]);
      if (allRes.data) setCourses(allRes.data as Course[]);
      if (myRes.data) setMyCourses(myRes.data as Course[]);
    } else if (tab === "marketplace") {
      const [allRes, myRes] = await Promise.all([
        supabase.from("marketplace_items").select("*").eq("is_published", true).order("created_at", { ascending: false }),
        isInfinity ? supabase.from("marketplace_items").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      ]);
      if (allRes.data) setItems(allRes.data as MarketplaceItem[]);
      if (myRes.data) setMyItems(myRes.data as MarketplaceItem[]);
    }
  };

  const createCourse = async () => {
    if (!courseTitle || !courseDesc) return;
    const { error } = await supabase.from("courses").insert({
      creator_id: user!.id,
      title: courseTitle,
      description: courseDesc,
      content: courseContent || null,
      price: parseFloat(coursePrice) || 0,
      category: courseCategory,
      is_published: true,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Course Created! 🎓" });
      setCourseTitle(""); setCourseDesc(""); setCourseContent(""); setCoursePrice("");
      setShowCreate(false);
      loadData();
    }
  };

  const createItem = async () => {
    if (!itemTitle || !itemDesc) return;
    const { error } = await supabase.from("marketplace_items").insert({
      seller_id: user!.id,
      title: itemTitle,
      description: itemDesc,
      price: parseFloat(itemPrice) || 0,
      category: itemCategory,
      item_type: itemType,
      is_published: true,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item Listed! 🏪" });
      setItemTitle(""); setItemDesc(""); setItemPrice("");
      setShowCreate(false);
      loadData();
    }
  };

  const deleteCourse = async (id: string) => {
    await supabase.from("courses").delete().eq("id", id);
    setMyCourses(myCourses.filter(c => c.id !== id));
    toast({ title: "Course deleted" });
  };

  const deleteItem = async (id: string) => {
    await supabase.from("marketplace_items").delete().eq("id", id);
    setMyItems(myItems.filter(i => i.id !== id));
    toast({ title: "Item removed" });
  };

  const toggleCoursePublish = async (id: string, current: boolean) => {
    await supabase.from("courses").update({ is_published: !current } as any).eq("id", id);
    setMyCourses(myCourses.map(c => c.id === id ? { ...c, is_published: !current } : c));
  };

  const toggleItemPublish = async (id: string, current: boolean) => {
    await supabase.from("marketplace_items").update({ is_published: !current } as any).eq("id", id);
    setMyItems(myItems.map(i => i.id === id ? { ...i, is_published: !current } : i));
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-primary font-display text-xl">Loading...</div>
    </div>;
  }

  if (!user || !profile) return null;

  const tabs: { id: Tab; label: string; icon: any; emoji: string }[] = [
    { id: "courses", label: "Courses", icon: GraduationCap, emoji: "🎓" },
    { id: "marketplace", label: "Marketplace", icon: Store, emoji: "🏪" },
    { id: "communities", label: "Communities", icon: Users, emoji: "👥" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Star className="w-8 h-8 text-yellow-500" />
              <h1 className="text-4xl md:text-5xl font-display font-bold">
                Infinity <span className="text-gradient">Zone</span>
              </h1>
              <Badge className="bg-yellow-500 text-black text-sm px-3">♾️</Badge>
            </div>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Create, sell, and build your empire. Exclusive to Infinity members.
            </p>
          </motion.div>

          {!isInfinity && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass rounded-2xl p-8 text-center space-y-4 border-yellow-500/20">
              <Lock className="w-12 h-12 text-yellow-500 mx-auto" />
              <h2 className="text-xl font-display font-bold">Infinity Access Required</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Upgrade to Infinity to create courses, sell tools, and build communities.
              </p>
              <Button className="bg-yellow-500 text-black hover:bg-yellow-400" onClick={() => navigate("/#pricing")}>
                Upgrade to Infinity — ₹2,250
              </Button>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="flex rounded-xl bg-muted/30 p-1.5 gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setShowCreate(false); }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  tab === t.id
                    ? "bg-yellow-500/20 text-yellow-400 shadow-sm border border-yellow-500/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                <span>{t.emoji}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* COURSES TAB */}
          {tab === "courses" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {isInfinity && (
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-display font-bold flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-yellow-500" /> Your Courses
                  </h2>
                  <Button onClick={() => setShowCreate(!showCreate)}
                    className="bg-yellow-500 text-black hover:bg-yellow-400" size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Create Course
                  </Button>
                </div>
              )}

              <AnimatePresence>
                {showCreate && tab === "courses" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="glass rounded-xl p-6 space-y-4 border-yellow-500/20">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold">New Course</h3>
                      <button onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Course Title</Label>
                        <Input value={courseTitle} onChange={e => setCourseTitle(e.target.value)} placeholder="e.g. Mastering AI Freelancing" />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (₹)</Label>
                        <Input value={coursePrice} onChange={e => setCoursePrice(e.target.value)} type="number" placeholder="499" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={courseDesc} onChange={e => setCourseDesc(e.target.value)} placeholder="What will students learn?" rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Course Content (Markdown)</Label>
                      <Textarea value={courseContent} onChange={e => setCourseContent(e.target.value)} placeholder="## Module 1: Getting Started..." rows={6} />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={courseCategory} onValueChange={setCourseCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Freelancing", "AI & Tech", "Marketing", "Design", "Writing", "Business", "Other"].map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createCourse} className="bg-yellow-500 text-black hover:bg-yellow-400 w-full">
                      <Sparkles className="w-4 h-4 mr-1" /> Publish Course
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* My courses */}
              {isInfinity && myCourses.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  {myCourses.map(c => (
                    <div key={c.id} className="glass rounded-xl p-5 space-y-3 border-yellow-500/10">
                      <div className="flex items-center justify-between">
                        <Badge className={c.is_published ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}>
                          {c.is_published ? "Published" : "Draft"}
                        </Badge>
                        <div className="flex gap-1">
                          <button onClick={() => toggleCoursePublish(c.id, c.is_published)} className="p-1.5 rounded-md hover:bg-muted">
                            {c.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => deleteCourse(c.id)} className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-display font-semibold">{c.title}</h3>
                      <p className="text-xs text-muted-foreground">{c.description?.slice(0, 100)}...</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{c.price}</span>
                        <span>{c.enrolled_count} enrolled</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* All published courses */}
              <div className="space-y-4">
                <h2 className="text-lg font-display font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Browse Courses
                </h2>
                {courses.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center text-muted-foreground">
                    <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No courses published yet. Be the first to create one!</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map(c => (
                      <motion.div key={c.id} whileHover={{ y: -4 }}
                        className="glass rounded-xl p-5 space-y-3 hover:border-yellow-500/30 hover:shadow-glow transition-all cursor-pointer">
                        <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                        <h3 className="font-display font-semibold">{c.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <span className="font-semibold text-sm flex items-center text-yellow-500">
                            <IndianRupee className="w-3.5 h-3.5" />{c.price}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{c.enrolled_count} students</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* MARKETPLACE TAB */}
          {tab === "marketplace" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {isInfinity && (
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-display font-bold flex items-center gap-2">
                    <Store className="w-5 h-5 text-yellow-500" /> Your Listings
                  </h2>
                  <Button onClick={() => setShowCreate(!showCreate)}
                    className="bg-yellow-500 text-black hover:bg-yellow-400" size="sm">
                    <Plus className="w-4 h-4 mr-1" /> List Item
                  </Button>
                </div>
              )}

              <AnimatePresence>
                {showCreate && tab === "marketplace" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="glass rounded-xl p-6 space-y-4 border-yellow-500/20">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold">New Listing</h3>
                      <button onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Item Title</Label>
                        <Input value={itemTitle} onChange={e => setItemTitle(e.target.value)} placeholder="e.g. Notion Freelancer Dashboard" />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (₹)</Label>
                        <Input value={itemPrice} onChange={e => setItemPrice(e.target.value)} type="number" placeholder="299" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="What does this tool/template do?" rows={3} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={itemType} onValueChange={setItemType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tool">Tool</SelectItem>
                            <SelectItem value="template">Template</SelectItem>
                            <SelectItem value="ebook">E-Book</SelectItem>
                            <SelectItem value="resource">Resource Pack</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={itemCategory} onValueChange={setItemCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Template", "Productivity", "Design", "Marketing", "AI Tools", "Other"].map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={createItem} className="bg-yellow-500 text-black hover:bg-yellow-400 w-full">
                      <Package className="w-4 h-4 mr-1" /> Publish Listing
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* My items */}
              {isInfinity && myItems.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  {myItems.map(item => (
                    <div key={item.id} className="glass rounded-xl p-5 space-y-3 border-yellow-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Badge className={item.is_published ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}>
                            {item.is_published ? "Live" : "Hidden"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{item.item_type}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => toggleItemPublish(item.id, item.is_published)} className="p-1.5 rounded-md hover:bg-muted">
                            {item.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-display font-semibold">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.description?.slice(0, 100)}...</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{item.price}</span>
                        <span>{item.sales_count} sales</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* All published items */}
              <div className="space-y-4">
                <h2 className="text-lg font-display font-bold flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" /> Browse Marketplace
                </h2>
                {items.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center text-muted-foreground">
                    <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Marketplace is empty. List your first tool or template!</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(item => (
                      <motion.div key={item.id} whileHover={{ y: -4 }}
                        className="glass rounded-xl p-5 space-y-3 hover:border-yellow-500/30 hover:shadow-glow transition-all cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{item.item_type}</Badge>
                          <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                        </div>
                        <h3 className="font-display font-semibold">{item.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <span className="font-semibold text-sm flex items-center text-yellow-500">
                            <IndianRupee className="w-3.5 h-3.5" />{item.price}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{item.sales_count} sold</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* COMMUNITIES TAB */}
          {tab === "communities" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-display font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-yellow-500" /> Community Builder
                </h2>
                {isInfinity && (
                  <Button onClick={() => navigate("/community")}
                    className="bg-yellow-500 text-black hover:bg-yellow-400" size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Manage Groups
                  </Button>
                )}
              </div>

              <div className="glass rounded-2xl p-8 space-y-6 border-yellow-500/10">
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto">
                    <Users className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h3 className="text-lg font-display font-bold">Build Your Community</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    As an Infinity member, you can create and manage community groups, moderate discussions,
                    and build your own tribe of hustlers.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { icon: "🎯", title: "Create Groups", desc: "Launch topic-specific discussion groups" },
                    { icon: "🛡️", title: "Moderate", desc: "Approve posts, manage members" },
                    { icon: "📊", title: "Grow", desc: "Track engagement & build your brand" },
                  ].map(f => (
                    <div key={f.title} className="glass rounded-xl p-4 text-center space-y-2 border-yellow-500/10">
                      <span className="text-2xl">{f.icon}</span>
                      <h4 className="font-display font-semibold text-sm">{f.title}</h4>
                      <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <Button variant="outline" onClick={() => navigate("/community")}
                    className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10">
                    <ArrowRight className="w-4 h-4 mr-1" /> Go to Community Hub
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
