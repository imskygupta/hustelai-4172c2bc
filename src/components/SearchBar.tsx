import { useState } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  size?: "lg" | "md";
  variant?: "default" | "light";
  placeholder?: string;
}

const suggestions = [
  "Zero investment side hustles for students",
  "Freelancing ideas with no experience",
  "Tech side hustles under $50",
  "Creative gigs I can start today",
  "Passive income ideas for beginners",
];

export function SearchBar({ onSearch, isLoading, size = "md", variant = "default", placeholder }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  const isLg = size === "lg";
  const isLight = variant === "light";

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative flex items-center rounded-xl ${
          isLight
            ? "bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgb(16,185,129,0.15)] transition-shadow"
            : "glass"
        } ${isLg ? "p-2" : "p-1.5"}`}>
          <Search className={`absolute left-5 ${isLight ? "text-slate-400" : "text-muted-foreground"} ${isLg ? "w-5 h-5" : "w-4 h-4"}`} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder || "What kind of freelancing or side hustle are you looking for?"}
            className={`border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${
              isLight ? "text-slate-900 placeholder:text-slate-400" : ""
            } ${isLg ? "pl-12 text-lg h-14" : "pl-10 h-11"}`}
          />
          <Button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={`${
              isLight
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-gradient-primary text-primary-foreground"
            } font-semibold shrink-0 ${isLg ? "h-12 px-6 text-base" : "h-9 px-4"}`}
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
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                isLight
                  ? "border border-slate-200 bg-white/60 text-slate-600 hover:border-emerald-400 hover:text-emerald-600"
                  : "border border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
