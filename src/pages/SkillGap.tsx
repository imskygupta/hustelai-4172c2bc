import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getMaxUses, getUsage, bumpUsage, awardXP } from "@/lib/tool-limits";
import {
  Brain, Loader2, TrendingUp, Target, BookOpen, Zap,
  Plus, X, ArrowRight, Sparkles, Clock, DollarSign
} from "lucide-react";

interface SkillGap {
  skill: string;
  reason: string;
  earning_boost: string;
  difficulty: string;
  time_to_learn: string;
}

interface RoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  skills: string[];
  resources: string[];
  milestone: string;
}

interface AnalysisResult {
  skill_assessment: string;
  gaps: SkillGap[];
  roadmap: RoadmapPhase[];
  earning_projection: {
    current_range: string;
    projected_range: string;
    timeline: string;
  };
  trending_combinations: string[];
}

export default function SkillGap() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const tier = profile?.subscription_tier || "free";
  const hasAccess = ["pro", "elite", "infinity"].includes(tier);
  const maxUses = getMaxUses(tier);
  const [usageCount, setUsageCount] = useState(0);
  useEffect(() => { if (user) setUsageCount(getUsage("skillgap", user.id)); }, [user]);
  const atLimit = usageCount >= maxUses;

  if (!user || !hasAccess) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="pt-32 pb-20 px-4 text-center">
            <Brain className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-display font-bold mb-2">Skill Gap Consultant</h1>
            <p className="text-muted-foreground mb-6">Available for Pro, Elite & Infinity users</p>
            <Button className="bg-gradient-primary" onClick={() => navigate("/#pricing")}>Upgrade Now</Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setSkillInput("");
    }
  };

  const analyze = async () => {
    if (atLimit) { toast({ title: `Limit reached (${maxUses}/${maxUses})`, description: "Upgrade for more uses.", variant: "destructive" }); return; }
    if (skills.length === 0) {
      toast({ title: "Add at least one skill", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("skill-gap-consultant", {
        body: { user_id: user.id, current_skills: skills, goals },
      });
      if (error) throw error;
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else if (data.result) {
        setResult(data.result);
        setUsageCount(bumpUsage("skillgap", user.id));
        awardXP(user.id, 10);
      }
    } catch {
      toast({ title: "Failed to analyze", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const difficultyColor = (d: string) => {
    if (d === "easy") return "bg-green-500/20 text-green-400 border-green-500/30";
    if (d === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-28 pb-16 px-4">
          <div className="container mx-auto max-w-4xl space-y-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
              <Badge variant="outline" className="border-primary/30 text-primary">
                <Brain className="w-3.5 h-3.5 mr-1" /> AI Career Consultant
              </Badge>
              <h1 className="text-4xl md:text-5xl font-display font-bold">
                Skill Gap <span className="text-gradient">Analyzer</span>
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Discover the next high-paying skills to learn based on market trends and your current expertise.
              </p>
            </motion.div>

            {/* Input */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Your Current Skills
              </h2>
              <div className="flex gap-2">
                <Input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  placeholder="e.g., React, Python, Figma..."
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  className="flex-1" />
                <Button variant="outline" onClick={addSkill}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <Badge key={s} variant="secondary" className="px-3 py-1.5 text-sm gap-1">
                    {s}
                    <button onClick={() => setSkills(skills.filter(x => x !== s))}><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
                {skills.length === 0 && <p className="text-sm text-muted-foreground">Add your skills above</p>}
              </div>

              <h2 className="font-display font-semibold flex items-center gap-2 pt-2">
                <Sparkles className="w-5 h-5 text-primary" /> Your Goals (optional)
              </h2>
              <Textarea value={goals} onChange={e => setGoals(e.target.value)}
                placeholder="e.g., I want to earn ₹2L/month, transition to AI/ML freelancing..."
                rows={3} />

              <Button className="bg-gradient-primary w-full" onClick={analyze} disabled={loading || skills.length === 0}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Brain className="w-4 h-4 mr-2" /> Analyze My Skills</>}
              </Button>
            </motion.div>

            {/* Results */}
            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-6">
                  {/* Assessment */}
                  <div className="glass rounded-2xl p-6 space-y-3">
                    <h2 className="font-display font-semibold flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" /> Skill Assessment
                    </h2>
                    <p className="text-sm text-muted-foreground">{result.skill_assessment}</p>
                  </div>

                  {/* Earning Projection */}
                  <div className="glass rounded-2xl p-6">
                    <h2 className="font-display font-semibold flex items-center gap-2 mb-4">
                      <DollarSign className="w-5 h-5 text-primary" /> Earning Projection
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-secondary/50 rounded-xl p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Current Range</p>
                        <p className="text-xl font-display font-bold">{result.earning_projection.current_range}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-8 h-8 text-primary" />
                      </div>
                      <div className="bg-primary/10 rounded-xl p-4 text-center border border-primary/20">
                        <p className="text-xs text-primary mb-1">Projected Range</p>
                        <p className="text-xl font-display font-bold text-primary">{result.earning_projection.projected_range}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" /> {result.earning_projection.timeline}
                    </p>
                  </div>

                  {/* Skill Gaps */}
                  <div className="glass rounded-2xl p-6 space-y-4">
                    <h2 className="font-display font-semibold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" /> Top Skills to Learn
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {result.gaps.map((gap, i) => (
                        <motion.div key={gap.skill} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-secondary/30 rounded-xl p-4 space-y-2 border border-border/50">
                          <div className="flex items-center justify-between">
                            <h3 className="font-display font-semibold">{gap.skill}</h3>
                            <Badge variant="outline" className={difficultyColor(gap.difficulty)}>{gap.difficulty}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{gap.reason}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-primary font-semibold">+{gap.earning_boost}</span>
                            <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{gap.time_to_learn}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Learning Roadmap */}
                  <div className="glass rounded-2xl p-6 space-y-4">
                    <h2 className="font-display font-semibold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" /> Learning Roadmap
                    </h2>
                    <div className="space-y-4">
                      {result.roadmap.map((phase, i) => (
                        <motion.div key={phase.phase} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className="relative pl-8 border-l-2 border-primary/30 pb-4 last:pb-0">
                          <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/20 text-primary border-primary/30" variant="outline">Phase {phase.phase}</Badge>
                              <span className="text-xs text-muted-foreground">{phase.duration}</span>
                            </div>
                            <h3 className="font-display font-semibold">{phase.title}</h3>
                            <div className="flex flex-wrap gap-1">
                              {phase.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                            </div>
                            <p className="text-xs text-muted-foreground">📚 {phase.resources.join(", ")}</p>
                            <p className="text-xs text-primary">🎯 {phase.milestone}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Trending Combos */}
                  {result.trending_combinations?.length > 0 && (
                    <div className="glass rounded-2xl p-6">
                      <h2 className="font-display font-semibold flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-primary" /> Trending Skill Combinations
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {result.trending_combinations.map(c => (
                          <Badge key={c} variant="outline" className="border-primary/30 text-primary px-3 py-1.5">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <Footer />
      </div>
    </PageTransition>
  );
}
