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
  GraduationCap, Plus, Star, Lock, BookOpen, Trash2, Eye, EyeOff,
  IndianRupee, X, Sparkles, Zap, Bot, Globe, Workflow, Crown,
  Headphones, Rocket, Palette, Key, Infinity as InfinityIcon, ShieldCheck,
  Calendar, ArrowRight,
} from "lucide-react";

type Tab = "tools" | "perks" | "courses";

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

const exclusiveTools = [
  {
    icon: InfinityIcon,
    title: "Unlimited AI assists",
    desc: "No daily caps. Drafts, replies, summaries, doc intel — fire as much as you want.",
    status: "live",
    href: "/ai-tools",
  },
  {
    icon: Key,
    title: "API access",
    desc: "Programmatic access to your workspace, clients, invoices and AI endpoints.",
    status: "soon",
    href: "/contact",
  },
  {
    icon: Palette,
    title: "White-label branding",
    desc: "Your logo, your colors, your domain on every client portal and document.",
    status: "live",
    href: "/workspaces",
  },
  {
    icon: Workflow,
    title: "Advanced automations",
    desc: "Multi-step workflows, conditional triggers and webhook chains.",
    status: "live",
    href: "/workspaces",
  },
  {
    icon: Bot,
    title: "Premium AI routing",
    desc: "Auto-route to the best model (GPT-5, Gemini Pro, Claude) per task type.",
    status: "live",
    href: "/workspaces/ai-settings",
  },
  {
    icon: Globe,
    title: "Custom domain portals",
    desc: "Host client portals on portal.yourbrand.com with one DNS record.",
    status: "live",
    href: "/workspaces",
  },
  {
    icon: ShieldCheck,
    title: "Team permissions & roles",
    desc: "Granular access control — owner, admin, member, viewer.",
    status: "live",
    href: "/workspaces",
  },
  {
    icon: Zap,
    title: "Priority compute",
    desc: "Your AI requests jump the queue. ~2-3× faster than standard tier.",
    status: "live",
  },
];

const vipPerks = [
  { icon: Headphones, title: "1:1 strategy session", desc: "30-min monthly call with the founding team to scale your practice." },
  { icon: Rocket, title: "Early access to beta", desc: "Try every new feature 4-6 weeks before public release." },
  { icon: Crown, title: "Founder's lounge", desc: "Private Slack with the team and other Infinity members." },
  { icon: Calendar, title: "Priority onboarding", desc: "White-glove migration from Notion, Trello, HoneyBook or Dubsado." },
  { icon: Sparkles, title: "Custom AI prompts library", desc: "Curated prompt packs for proposals, sales calls and client emails." },
  { icon: ShieldCheck, title: "SLA-backed uptime", desc: "99.9% guaranteed uptime with credit-back if we miss it." },
];

export default function InfinityZone() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "tools");
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // Course form
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseContent, setCourseContent] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [courseCategory, setCourseCategory] = useState("Freelancing");

  const isInfinity = profile?.subscription_tier === "infinity";

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (user && tab === "courses") loadCourses();
  }, [user, tab]);

  const loadCourses = async () => {
    const [allRes, myRes] = await Promise.all([
      supabase.from("courses").select("*").eq("is_published", true).order("created_at", { ascending: false }),
      isInfinity ? supabase.from("courses").select("*").eq("creator_id", user!.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);
    if (allRes.data) setCourses(allRes.data as Course[]);
    if (myRes.data) setMyCourses(myRes.data as Course[]);
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
      loadCourses();
    }
  };

  const deleteCourse = async (id: string) => {
    await supabase.from("courses").delete().eq("id", id);
    setMyCourses(myCourses.filter(c => c.id !== id));
    toast({ title: "Course deleted" });
  };

  const toggleCoursePublish = async (id: string, current: boolean) => {
    await supabase.from("courses").update({ is_published: !current } as any).eq("id", id);
    setMyCourses(myCourses.map(c => c.id === id ? { ...c, is_published: !current } : c));
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-primary font-display text-xl">Loading...</div>
    </div>;
  }

  if (!user || !profile) return null;

  const tabs: { id: Tab; label: string; icon: any; emoji: string }[] = [
    { id: "tools", label: "Exclusive Tools", icon: Sparkles, emoji: "✨" },
    { id: "perks", label: "VIP Perks", icon: Crown, emoji: "👑" },
    { id: "courses", label: "Courses", icon: GraduationCap, emoji: "🎓" },
  ];

  const goTool = (t: typeof exclusiveTools[number]) => {
    if (!t.href) return;
    if (t.external) window.open(t.href, "_blank", "noopener");
    else navigate(t.href);
  };

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
            <p className="text-muted-foreground max-w-xl mx-auto">
              The unfair advantage layer for power users — exclusive tools, VIP perks
              and white-glove access reserved for Infinity members.
            </p>
          </motion.div>

          {!isInfinity && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass rounded-2xl p-8 text-center space-y-4 border-yellow-500/20">
              <Lock className="w-12 h-12 text-yellow-500 mx-auto" />
              <h2 className="text-xl font-display font-bold">Infinity Access Required</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Unlock unlimited AI, white-label portals, API access, advanced automations
                and direct line to the founding team.
              </p>
              <Button className="bg-yellow-500 text-black hover:bg-yellow-400" onClick={() => navigate("/plans")}>
                Upgrade to Infinity — ₹2,250/mo
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

          {/* EXCLUSIVE TOOLS TAB */}
          {tab === "tools" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" /> Exclusive tools
                </h2>
                <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 text-[10px]">
                  {exclusiveTools.length} unlocked
                </Badge>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {exclusiveTools.map((t, i) => {
                  const Icon = t.icon;
                  const locked = !isInfinity;
                  return (
                    <motion.button
                      key={t.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => !locked && goTool(t)}
                      disabled={locked}
                      className={`text-left glass rounded-xl p-5 space-y-3 border transition-all ${
                        locked
                          ? "border-border/40 opacity-60 cursor-not-allowed"
                          : "border-yellow-500/20 hover:border-yellow-500/50 hover:shadow-glow hover:-translate-y-0.5"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-yellow-500" />
                        </div>
                        {locked ? (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" /> Live
                          </Badge>
                        )}
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-sm">{t.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.desc}</p>
                      </div>
                      {!locked && t.href && (
                        <div className="text-[11px] text-yellow-500 font-medium flex items-center gap-1">
                          Open <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* VIP PERKS TAB */}
          {tab === "perks" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" /> VIP perks
                </h2>
                {isInfinity && (
                  <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => navigate("/contact")}>
                    <Headphones className="w-3.5 h-3.5 mr-1.5" /> Book session
                  </Button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vipPerks.map((p, i) => {
                  const Icon = p.icon;
                  const locked = !isInfinity;
                  return (
                    <motion.div
                      key={p.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`glass rounded-xl p-5 space-y-3 border ${
                        locked ? "border-border/40 opacity-60" : "border-yellow-500/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-yellow-500" />
                        </div>
                        {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-sm">{p.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

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
                {showCreate && (
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
        </div>
      </div>
    </div>
  );
}