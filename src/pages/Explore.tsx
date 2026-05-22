import { blogDb } from "@/integrations/blog/db";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SearchBar } from "@/components/SearchBar";
import { FreelanceCard } from "@/components/FreelanceCard";
import { type FreelanceResult, mapDbResult } from "@/lib/ai-search";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, X, Zap, Sparkles, ChefHat, Compass, Rocket, Activity, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SignupCTADialog } from "@/components/SignupCTADialog";
import { useRequireVerifiedEmail } from "@/components/VerifyEmailGate";
import { CategoryGrid, type CategoryDef } from "@/components/explore/CategoryGrid";
import { ActionStack } from "@/components/explore/ActionStack";
import { OperationalTools, ExecutionPipeline } from "@/components/explore/OperationalTools";
import { invokeWithTrust } from "@/lib/auth/verificationDenied";
import { runWithDeadline, TimeoutError } from "@/lib/async/timeout";

const categories = ["All", "Tech", "Creative", "Freelance", "Marketing", "Education", "Service", "E-Commerce", "Finance", "Gig Economy", "Gaming", "Admin"];
const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];
const types = ["All", "Online", "In-Person", "Hybrid"];

const popularTemplates = [
  "AI automation agency for SMBs",
  "Productized design service operations",
  "Notion systems as a digital product line",
  "Content engines for founder brands",
  "Freelance SEO retainer operations",
  "Faceless YouTube operations stack",
  "Cold outreach systems for B2B SaaS",
  "Micro SaaS operating models",
  "Done-for-you LinkedIn ghostwriting ops",
  "n8n automation pipelines for agencies",
];

export default function Explore() {
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
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
  const [activeContext, setActiveContext] = useState<string>("");
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const searchSeq = useRef(0);

  // Load top liked cards for display
  useEffect(() => {
    let cancelled = false;
    runWithDeadline(
      () => blogDb.from("side_hustles").select("*").order("likes", { ascending: false }).limit(6),
      "explore.trending",
    ).then(({ data }: any) => { if (!cancelled && data) setTrendingCards(data.map(mapDbResult)); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const stop = () => {
      searchSeq.current += 1;
      setIsLoading(false);
      setIsAiCooking(false);
      setSearchNotice("AI is temporarily unavailable. Showing cached and database results instead.");
    };
    window.addEventListener("hai:verification-denied", stop);
    window.addEventListener("hai:runtime-deadlock", stop);
    return () => {
      window.removeEventListener("hai:verification-denied", stop);
      window.removeEventListener("hai:runtime-deadlock", stop);
    };
  }, []);

  // Preload from blog conversion deep-link: /explore?template=<slug>
  useEffect(() => {
    const tplSlug = searchParams.get("template");
    if (!tplSlug) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hustle-templates?action=get&slug=${encodeURIComponent(tplSlug)}`;
    let cancelled = false;
    runWithDeadline(
      (signal) => fetch(url, { signal, headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } }),
      "explore.template",
    )
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const tpl = j?.template;
        if (!tpl) return;
        const seedQuery: string = tpl.prompt_system?.prompt || tpl.title;
        toast({ title: `Loaded template: ${tpl.title}`, description: tpl.summary || "Prompt and tools pre-filled." });
        handleSearch(seedQuery);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = async (query: string) => {
    if (user && !requireVerified()) return;
    const seq = ++searchSeq.current;
    setIsLoading(true);
    setSearchNotice(null);
    setLastQuery(query);
    setActiveContext(query);

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
      const dbResults = await runWithDeadline(() => dbSearch(query), "explore.dbSearch");
      if (seq !== searchSeq.current) return;

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
        const { data, ok, denied, timedOut, error } = await invokeWithTrust<any>("ai-search", { query, limit: needed });
        if (!ok) {
          if (denied) setSearchNotice("Verify your email to unlock AI-generated opportunity expansion.");
          else if (timedOut) setSearchNotice("AI took too long. Showing database matches so the page stays responsive.");
          else setSearchNotice((error as any)?.message || "AI is unavailable. Showing database matches.");
          return;
        }
        if (seq !== searchSeq.current) return;
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
          const insertResult = await runWithDeadline<any>(
            () => blogDb.from("side_hustles").insert(insertData as any).select("*").single(),
            "explore.saveAiResult",
            { timeoutMs: 3_000 },
          ).catch(() => ({ data: null } as any));
          const inserted = insertResult?.data;
          if (inserted) {
            savedResults.push(mapDbResult(inserted));
          } else {
            savedResults.push(r);
          }
        }

        const combined = [...matchingResults, ...savedResults].slice(0, 5);
        if (seq !== searchSeq.current) return;
        setResults(combined);
        sessionStorage.setItem(cacheKey, JSON.stringify(combined));
      } catch (e) {
        // AI failed, keep DB results
        setSearchNotice(e instanceof TimeoutError ? "AI timed out. Showing database matches." : "AI is unavailable. Showing database matches.");
      } finally {
        setIsAiCooking(false);
      }

      return;
    } catch (err: any) {
      setResults([]);
      setSearchNotice(err instanceof TimeoutError ? "Search timed out. Try a narrower query." : "Search is temporarily unavailable.");
      toast({ title: "Search degraded", description: err.message || "Showing fallback state.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const dbSearch = async (query: string): Promise<FreelanceResult[]> => {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let request = blogDb.from("side_hustles").select("*");
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

      {/* Cinematic hero */}
      <section className="relative pt-24 pb-10 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[420px] rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute top-[20%] right-[5%] w-[320px] h-[320px] rounded-full bg-cyan-500/10 blur-[100px]" />
          <div className="absolute top-[30%] left-[5%] w-[280px] h-[280px] rounded-full bg-violet-500/10 blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,hsl(var(--background)))]" />
        </div>

        <div className="container relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-medium text-primary">
              <Compass className="w-3.5 h-3.5" /> Discovery → Execution Engine
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight">
              Discover opportunities you can <span className="text-gradient">actually execute</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              The intelligence layer of Workspace OS. Find digital income systems, then run the entire client engagement — proposals, agreements, intake, invoices and CRM — in one place.
            </p>

            <div className="pt-4">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} size="lg" />
            </div>

            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-emerald-500" /> Live demand signals</span>
              <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-violet-500" /> AI-classified niches</span>
              <span className="flex items-center gap-1"><Rocket className="w-3.5 h-3.5 text-cyan-500" /> Operationally ready</span>
            </div>

            <div className="pt-4">
              <ExecutionPipeline />
            </div>
          </motion.div>
        </div>
      </section>

      <div className="pb-16 px-4">
        <div className="container mx-auto max-w-6xl space-y-10">

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

          {/* Default state — opportunity browser */}
          {!isLoading && results.length === 0 && !isAiCooking && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {/* Premium category grid */}
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
                      <Compass className="w-3.5 h-3.5" /> Opportunity Systems
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold mt-1">Browse digital income systems</h2>
                    <p className="text-sm text-muted-foreground mt-1">Pick a category to load curated opportunities and a ready-to-run execution stack.</p>
                  </div>
                </div>
                <CategoryGrid onPick={(c: CategoryDef) => handleSearch(c.query)} />
              </div>

              {/* Action stack — discovery → execution moat */}
              <ActionStack />

              {/* Operational tooling — moat vs. proposal-only competitors */}
              <OperationalTools />

              {/* Trending opportunities */}
              {trendingCards.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
                        <Activity className="w-3.5 h-3.5" /> Trending Opportunities
                      </div>
                      <h2 className="text-2xl md:text-3xl font-display font-bold mt-1">Live demand signals</h2>
                      <p className="text-sm text-muted-foreground mt-1">Data-driven opportunities ranked by community traction.</p>
                    </div>
                    <Button variant="ghost" onClick={() => navigate("/saved-hustles")} className="text-primary hover:text-primary">
                      Saved hustles <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trendingCards.map((r, i) => (
                      <FreelanceCard key={r.id} result={r} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Popular operator queries */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Operator Queries</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {popularTemplates.map((template, i) => (
                    <motion.button
                      key={template}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => handleSearch(template)}
                      className="text-left px-4 py-3 rounded-xl border border-border bg-card/40 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
                    >
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {template}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
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
              {/* Action stack appears at top of any results — discovery → execution */}
              <ActionStack context={activeContext || undefined} />

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
