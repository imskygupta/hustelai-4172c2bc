import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SearchBar } from "@/components/SearchBar";
import { FreelanceCard } from "@/components/FreelanceCard";
import { searchFreelanceIdeas, type FreelanceResult } from "@/lib/ai-search";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, X, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categories = ["All", "Tech", "Creative", "Freelance", "Marketing", "Education", "Service", "E-Commerce", "Finance", "Gig Economy", "Gaming", "Admin"];
const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];
const types = ["All", "Online", "In-Person", "Hybrid"];

export default function Explore() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [results, setResults] = useState<FreelanceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeDifficulty, setActiveDifficulty] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [lastQuery, setLastQuery] = useState("");

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setLastQuery(query);
    try {
      const data = await searchFreelanceIdeas(query);
      setResults(data);
      
      // Track search count for logged-in users
      if (user && profile) {
        const tier = profile.subscription_tier;
        const maxSearches = tier === "free" ? 3 : tier === "pro" ? 15 : 999;
        if (profile.search_count >= maxSearches) {
          toast({ title: "Search limit reached", description: `You've used all ${maxSearches} searches. Upgrade to continue.`, variant: "destructive" });
        }
      }
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Search */}
          <div className="max-w-3xl mx-auto">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

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
              {Array.from({ length: 6 }).map((_, i) => (
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
                  <Zap className="w-3 h-3 mr-1" /> Instant Search
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

          {!isLoading && results.length === 0 && (
            <div className="text-center py-24 space-y-4">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-display font-bold">Search for side hustle ideas</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Try "zero investment ideas for students" or "tech freelancing for beginners"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
