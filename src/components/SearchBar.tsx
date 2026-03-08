import { useState } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  size?: "lg" | "md";
}

const suggestions = [
  "Zero investment side hustles for students",
  "Freelancing ideas with no experience",
  "Tech side hustles under $50",
  "Creative gigs I can start today",
  "Passive income ideas for beginners",
];

export function SearchBar({ onSearch, isLoading, size = "md" }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  const isLg = size === "lg";

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative flex items-center glass rounded-xl ${isLg ? "p-2" : "p-1.5"}`}>
          <Search className={`absolute left-5 text-muted-foreground ${isLg ? "w-5 h-5" : "w-4 h-4"}`} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What kind of freelancing or side hustle are you looking for?"
            className={`border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${isLg ? "pl-12 text-lg h-14" : "pl-10 h-11"}`}
          />
          <Button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={`bg-gradient-primary text-primary-foreground font-semibold shrink-0 ${isLg ? "h-12 px-6 text-base" : "h-9 px-4"}`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Search with AI
              </>
            )}
          </Button>
        </div>
      </form>

      {isLg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap gap-2 justify-center"
        >
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s);
                onSearch(s);
              }}
              className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
