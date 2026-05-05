import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SearchBar } from "@/components/SearchBar";
import { FreelanceCard } from "@/components/FreelanceCard";
import { type FreelanceResult, mapDbResult } from "@/lib/ai-search";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, X, Zap, Sparkles, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SignupCTADialog } from "@/components/SignupCTADialog";
import { useRequireVerifiedEmail } from "@/components/VerifyEmailGate";

const categories = ["All", "Tech", "Creative", "Freelance", "Marketing", "Education", "Service", "E-Commerce", "Finance", "Gig Economy", "Gaming", "Admin"];
const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];
const types = ["All", "Online", "In-Person", "Hybrid"];

const popularTemplates = [
  "How to earn money using ChatGPT and Canva?",
  "Zero investment side hustles for college students",
  "Freelancing ideas for beginners with no experience",
  "How to make money on Reddit and Twitter?",
  "Best online tutoring and teaching gigs",
  "Passive income ideas under $50 investment",
  "How to start dropshipping with no money?",
  "Content writing and blogging side hustles",
  "How to earn from YouTube without showing face?",
  "Top micro-task and survey sites that actually pay",
];

export default function Explore() {
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { requireVerified } = useRequireVerifiedEmail();
  const [results, setResults] = useState<FreelanceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiCooking, setIsAiCooking] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeDifficulty, setActiveDifficulty] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [lastQuery, setLastQuery] = useState("");
  const [trendingCards, setTrendingCards] = useState<FreelanceResult[]>([]);
  const [showSignupCTA, setShowSignupCTA] = useState(false);

  // Load top liked cards for display
  useEffect(() => {
    supabase.from("side_hustles").select("*").order("likes", { ascending: false }).limit(6)
      .then(({ data }) => { if (data) setTrendingCards(data.map(mapDbResult)); });
  }, []);

  const handleSearch = async (query: string) => {
    if (user && !requireVerified()) return;
    setIsLoading(true);
    setLastQuery(query);

    // Check sessionStorage cache
    const cacheKey = `search_${query.toLowerCase().trim()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setResults(JSON.parse(cached));
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Always search DB first
      const dbResults = await dbSearch(query);

      // Step 2: Check if DB results actually match the query keywords
      const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const matchingResults = dbResults.filter(r => {
        const text = `${r.title} ${r.description} ${r.tags.join(" ")}`.toLowerCase();
        // A result "matches" if at least half the keywords appear
        const matchCount = keywords.filter(kw => text.includes(kw)).length;
        return matchCount >= Math.max(1, Math.ceil(keywords.length / 2));
      });

      if (matchingResults.length >= 5) {
        // DB has enough good matches, sort by likes
        matchingResults.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        const finalResults = matchingResults.slice(0, 5);
        setResults(finalResults);
        sessionStorage.setItem(cacheKey, JSON.stringify(finalResults));
        setIsLoading(false);
        return;
      }

      // Step 3: Not enough matches - need AI generation (only for signed-in users)
      if (!user || !profile) {
        // Guest: show all DB results + nudge with CTA when results are sparse
        const guestResults = matchingResults.length > 0 ? matchingResults : dbResults.slice(0, 10);
        setResults(guestResults);
        setIsLoading(false);
        if (guestResults.length < 3) {
          setTimeout(() => setShowSignupCTA(true), 600);
        }
        return;
      }

      // Check search limits
      const tier = profile.subscription_tier;
      const maxSearches = tier === "free" ? 3 : tier === "pro" ? 5 : tier === "elite" ? 10 : 20;
      if (profile.search_count >= maxSearches) {
        toast({ title: "Search limit reached", description: `Upgrade to continue.`, variant: "destructive" });
        setResults(matchingResults);
        setIsLoading(false);
        return;
      }

      // Show DB results first, then cook AI results
      setResults(matchingResults);
      setIsLoading(false);
      setIsAiCooking(true);

      const needed = Math.min(3, 5 - matchingResults.length);
      try {
        const { data, error } = await supabase.functions.invoke("ai-search", {
          body: { query, limit: needed },
        });
        if (error) throw error;
        const aiResults: FreelanceResult[] = (data?.results || []).slice(0, needed);

        // Save AI results to DB
        const savedResults: FreelanceResult[] = [];
        for (const r of aiResults) {
          const insertData = {
            title: r.title,
            category: r.category,
            description: r.description,
            startup_cost: r.investment || "$0",
            earnings: r.earning_potential || "Varies",
            effort: r.difficulty === "Beginner" ? 1 : r.difficulty === "Intermediate" ? 3 : 5,
            type: r.type || "Online",
            tags: [...(r.tags || []), "new", "ai-generated"],
            is_trending: true,
            time_commitment: r.time_commitment || null,
            likes: 0,
            dislikes: 0,
          };
          const { data: inserted } = await supabase.from("side_hustles").insert(insertData as any).select("*").single();
          if (inserted) {
            savedResults.push(mapDbResult(inserted));
          } else {
            savedResults.push(r);
          }
        }

        const combined = [...matchingResults, ...savedResults].slice(0, 5);
        setResults(combined);
        sessionStorage.setItem(cacheKey, JSON.stringify(combined));
      } catch {
        // AI failed, keep DB results
      } finally {
        setIsAiCooking(false);
      }

      return;
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const dbSearch = async (query: string): Promise<FreelanceResult[]> => {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let request = supabase.from("side_hustles").select("*");
    if (keywords.length > 0) {
      const orFilters = keywords.flatMap(kw => [
        `title.ilike.%${kw}%`,
        `category.ilike.%${kw}%`,
        `description.ilike.%${kw}%`,
        `type.ilike.%${kw}%`,
      ]);
      request = request.or(orFilters.join(","));
    }
    const { data } = await request.order("likes", { ascending: false }).limit(20);
    return (data || []).map(mapDbResult);
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) handleSearch(q);
  }, []);

  const filtered = results.filter((r) => {
    if (activeCategory !== "All" && r.category !== activeCategory) return false;
    if (activeDifficulty !== "All" && r.difficulty !== activeDifficulty) return false;
    if (activeType !== "All" && r.type !== activeType) return false;
    return true;
  });

  const clearFilters = () => {
    setActiveCategory("All");
    setActiveDifficulty("All");
    setActiveType("All");
  };

  const hasActiveFilters = activeCategory !== "All" || activeDifficulty !== "All" || activeType !== "All";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SignupCTADialog open={showSignupCTA} onClose={() => setShowSignupCTA(false)} query={lastQuery} />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Search */}
          <div className="max-w-3xl mx-auto">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {/* AI Cooking Animation */}
          {isAiCooking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChefHat className="w-10 h-10 text-primary" />
              </motion.div>
              <p className="text-sm font-medium text-primary animate-pulse">
                ✨ Your secret recipe is cooking...
              </p>
              <p className="text-xs text-muted-foreground">Generating personalized ideas with AI</p>
            </motion.div>
          )}

          {/* Popular Templates - show when no results yet */}
          {!isLoading && results.length === 0 && !isAiCooking && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-display font-bold">Discover Side Hustle Ideas</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Search or pick a popular question below to get started
                </p>
              </div>

              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2 mb-4 justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Popular Searches</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {popularTemplates.map((template, i) => (
                    <motion.button
                      key={template}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleSearch(template)}
                      className="text-left px-4 py-3 rounded-xl border border-border bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
                    >
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {template}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Trending / Most Liked Section */}
              {trendingCards.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Most Popular Hustles</span>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trendingCards.map((r, i) => (
                      <FreelanceCard key={r.id} result={r} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Filters */}
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">Category:</span>
                {categories.map((c) => (
                  <Badge
                    key={c}
                    variant={activeCategory === c ? "default" : "outline"}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                      activeCategory === c ? "bg-gradient-primary text-primary-foreground" : "hover:border-primary/50 hover:text-primary"
                    }`}
                    onClick={() => setActiveCategory(c)}
                  >
                    {c}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground ml-6 mr-2">Type:</span>
                {types.map((t) => (
                  <Badge
                    key={t}
                    variant={activeType === t ? "default" : "outline"}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                      activeType === t ? "bg-gradient-primary text-primary-foreground" : "hover:border-primary/50 hover:text-primary"
                    }`}
                    onClick={() => setActiveType(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground ml-6 mr-2">Difficulty:</span>
                {difficulties.map((d) => (
                  <Badge
                    key={d}
                    variant={activeDifficulty === d ? "default" : "outline"}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                      activeDifficulty === d ? "bg-gradient-primary text-primary-foreground" : "hover:border-primary/50 hover:text-primary"
                    }`}
                    onClick={() => setActiveDifficulty(d)}
                  >
                    {d}
                  </Badge>
                ))}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    <X className="w-3 h-3 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Results */}
          {isLoading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass rounded-xl p-6 space-y-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-6 bg-muted rounded w-2/3" />
                  <div className="h-16 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="text-foreground font-medium">{filtered.length}</span> results
                  {lastQuery && <> for "<span className="text-primary">{lastQuery}</span>"</>}
                </p>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                  <Zap className="w-3 h-3 mr-1" /> {user ? "Smart Search" : "Instant Search"}
                </Badge>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filtered.map((r, i) => (
                    <FreelanceCard key={r.id} result={r} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}

          {!isLoading && results.length > 0 && filtered.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <p className="text-muted-foreground">No results match your filters.</p>
              <Button variant="outline" onClick={clearFilters}
                className="hover:border-primary/50 hover:text-primary transition-all">
                Clear Filters
              </Button>
            </div>
          )}

          {!isLoading && !user && filtered.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setShowSignupCTA(true)}
                size="lg"
                className="bg-gradient-primary text-primary-foreground font-semibold hover:shadow-glow transition-all group"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Show more (private hustles)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
