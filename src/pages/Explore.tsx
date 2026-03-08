import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SearchBar } from "@/components/SearchBar";
import { FreelanceCard } from "@/components/FreelanceCard";
import { searchFreelanceIdeas, type FreelanceResult } from "@/lib/ai-search";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";

const categories = ["All", "Tech", "Creative", "Writing", "Marketing", "Teaching", "Services", "E-commerce", "Finance"];
const investments = ["All", "$0 - Free", "$1-50", "$50-200", "$200-500", "$500+"];
const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];

export default function Explore() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [results, setResults] = useState<FreelanceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeInvestment, setActiveInvestment] = useState("All");
  const [activeDifficulty, setActiveDifficulty] = useState("All");
  const [lastQuery, setLastQuery] = useState("");

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setLastQuery(query);
    try {
      const data = await searchFreelanceIdeas(query);
      setResults(data);
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
    if (activeInvestment !== "All" && r.investment !== activeInvestment) return false;
    if (activeDifficulty !== "All" && r.difficulty !== activeDifficulty) return false;
    return true;
  });

  const clearFilters = () => {
    setActiveCategory("All");
    setActiveInvestment("All");
    setActiveDifficulty("All");
  };

  const hasActiveFilters = activeCategory !== "All" || activeInvestment !== "All" || activeDifficulty !== "All";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">HustleAI</span>
          </button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>Home</Button>
          </div>
        </div>
      </nav>

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
                    className={`cursor-pointer transition-colors ${activeCategory === c ? "bg-gradient-primary text-primary-foreground" : "hover:border-primary/50"}`}
                    onClick={() => setActiveCategory(c)}
                  >
                    {c}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground ml-6 mr-2">Investment:</span>
                {investments.map((inv) => (
                  <Badge
                    key={inv}
                    variant={activeInvestment === inv ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${activeInvestment === inv ? "bg-gradient-primary text-primary-foreground" : "hover:border-primary/50"}`}
                    onClick={() => setActiveInvestment(inv)}
                  >
                    {inv}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground ml-6 mr-2">Difficulty:</span>
                {difficulties.map((d) => (
                  <Badge
                    key={d}
                    variant={activeDifficulty === d ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${activeDifficulty === d ? "bg-gradient-primary text-primary-foreground" : "hover:border-primary/50"}`}
                    onClick={() => setActiveDifficulty(d)}
                  >
                    {d}
                  </Badge>
                ))}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
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
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="text-center py-24 space-y-4">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-display font-bold">Search for freelancing ideas</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Try something like "zero investment ideas for students" or "tech freelancing for beginners"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
