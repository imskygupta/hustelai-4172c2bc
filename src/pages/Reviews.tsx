import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Testimonials } from "@/components/Testimonials";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Brain, Loader2, Shield, ThumbsUp, TrendingUp, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const moreReviews = [
  { name: "Deepak Verma", role: "Video Editor", text: "HustleAI's free tier helped me explore different niches before committing. Once I went Pro, my income doubled in just one month.", rating: 5, avatar: "DV" },
  { name: "Kavitha Nair", role: "SEO Specialist", text: "The AI search is pure magic. It found me a niche no one was talking about. Now I'm the go-to person for that service!", rating: 5, avatar: "KN" },
  { name: "Amit Joshi", role: "Copywriter", text: "The Elite webinars alone are worth the ₹800/month. I've learned more in 2 months than in 2 years of watching YouTube tutorials.", rating: 5, avatar: "AJ" },
  { name: "Sneha Iyer", role: "Social Media Manager", text: "Community groups here are incredibly supportive. I got my first ₹25K client through a referral in the Pro community!", rating: 4, avatar: "SI" },
  { name: "Rahul Menon", role: "App Developer", text: "The tools & licenses in Elite saved me over ₹20K/month in subscriptions. This plan pays for itself 20x over.", rating: 5, avatar: "RM" },
  { name: "Pooja Chauhan", role: "Podcast Producer", text: "From zero to ₹1.5L/month in 4 months. The personalized recommendations are what made the difference.", rating: 5, avatar: "PC" },
];

interface ReputationResult {
  overall_score: number;
  sentiment: string;
  trust_tags: string[];
  strengths: string[];
  areas_to_improve: string[];
  trust_summary: string;
  review_highlights: { quote: string; sentiment: string; tag: string }[];
}

export default function Reviews() {
  const { toast } = useToast();
  const [reputation, setReputation] = useState<ReputationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeReputation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reputation-score", {
        body: { reviews: moreReviews },
      });
      if (error) throw error;
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else if (data.result) {
        setReputation(data.result);
      }
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sentimentColor = (s: string) => {
    if (s === "positive" || s === "very_positive") return "text-green-400";
    if (s === "negative" || s === "very_negative") return "text-red-400";
    return "text-yellow-400";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 mb-12">
            <h1 className="text-4xl md:text-6xl font-display font-bold">
              What <span className="text-gradient">Hustlers</span> Say
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Real stories from real freelancers who transformed their income with HustleAI.
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">4.9/5 from 2,400+ reviews</span>
            </div>
            <Button onClick={analyzeReputation} disabled={loading} variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> :
                <><Brain className="w-4 h-4 mr-2" /> AI Trust Score</>}
            </Button>
          </motion.div>

          {/* Reputation Score */}
          <AnimatePresence>
            {reputation && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-12 space-y-6">
                <div className="glass rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="text-center">
                      <div className="relative w-28 h-28 mx-auto">
                        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                            strokeDasharray={`${reputation.overall_score * 2.64} 264`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-display font-bold">
                          {reputation.overall_score}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">Trust Score</p>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <h3 className="font-display font-semibold">AI Trust Summary</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{reputation.trust_summary}</p>
                      <div className="flex flex-wrap gap-2">
                        {reputation.trust_tags.map(tag => (
                          <Badge key={tag} className="bg-primary/10 text-primary border-primary/20" variant="outline">
                            <ThumbsUp className="w-3 h-3 mr-1" /> {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="glass rounded-xl p-5 space-y-3">
                    <h3 className="font-display font-semibold flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-400" /> Strengths
                    </h3>
                    {reputation.strengths.map(s => (
                      <p key={s} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✓</span> {s}
                      </p>
                    ))}
                  </div>
                  <div className="glass rounded-xl p-5 space-y-3">
                    <h3 className="font-display font-semibold flex items-center gap-2 text-sm">
                      <Quote className="w-4 h-4 text-primary" /> Key Highlights
                    </h3>
                    {reputation.review_highlights?.slice(0, 3).map((h, i) => (
                      <div key={i} className="text-sm space-y-1">
                        <p className="text-muted-foreground italic">"{h.quote}"</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{h.tag}</Badge>
                          <span className={`text-[10px] ${sentimentColor(h.sentiment)}`}>{h.sentiment}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Testimonials />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {moreReviews.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="glass rounded-xl p-6 space-y-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className={`w-4 h-4 ${j < t.rating ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
