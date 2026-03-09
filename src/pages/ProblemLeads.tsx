import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Search, Target, Zap, TrendingUp, MessageSquare, Copy,
  ExternalLink, Loader2, Crown, Star, Filter, ChevronDown,
} from "lucide-react";

interface Lead {
  title: string;
  subreddit: string;
  pain_point: string;
  opportunity: string;
  service_category: string;
  intent_level: string;
  suggested_pitch: string;
  url?: string;
  author?: string;
  upvotes?: number;
}

const defaultSubreddits = [
  "smallbusiness", "Entrepreneur", "freelance", "startups",
  "SideProject", "marketing", "webdev", "graphic_design",
];

const intentColors: Record<string, string> = {
  High: "bg-destructive/20 text-destructive",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Low: "bg-muted text-muted-foreground",
};

const categoryIcons: Record<string, string> = {
  Automation: "⚡", Design: "🎨", Writing: "✍️", Marketing: "📢",
  Development: "💻", "Data Entry": "📊", Consulting: "🧠",
  Video: "🎬", "Social Media": "📱", Other: "🔧",
};

export default function ProblemLeads() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searching, setSearching] = useState(false);
  const [providerUsed, setProviderUsed] = useState("");
  const [showSubreddits, setShowSubreddits] = useState(false);
  const [selectedSubs, setSelectedSubs] = useState<string[]>(defaultSubreddits);
  const [customSub, setCustomSub] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterIntent, setFilterIntent] = useState<string>("all");

  const isEligible = profile && ["elite", "infinity"].includes(profile.subscription_tier);

  const handleSearch = async () => {
    if (!user || !isEligible) {
      toast({ title: "Elite+ Required", description: "Upgrade to Elite or Infinity to access this feature.", variant: "destructive" });
      return;
    }

    setSearching(true);
    setLeads([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/problem-leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          query: query || undefined,
          subreddits: selectedSubs,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch leads");

      setLeads(result.leads || []);
      setProviderUsed(result.provider_used || "");
      if ((result.leads || []).length === 0) {
        toast({ title: "No leads found", description: "Try different keywords or subreddits." });
      } else {
        toast({ title: `Found ${result.leads.length} leads!`, description: `Via ${result.provider_used}` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSearching(false);
  };

  const copyPitch = (pitch: string) => {
    navigator.clipboard.writeText(pitch);
    toast({ title: "Copied!", description: "Pitch copied to clipboard." });
  };

  const addCustomSub = () => {
    const sub = customSub.trim().replace(/^r\//, "");
    if (sub && !selectedSubs.includes(sub)) {
      setSelectedSubs([...selectedSubs, sub]);
      setCustomSub("");
    }
  };

  const filteredLeads = leads.filter(l => {
    if (filterCategory !== "all" && l.service_category !== filterCategory) return false;
    if (filterIntent !== "all" && l.intent_level !== filterIntent) return false;
    return true;
  });

  const categories = [...new Set(leads.map(l => l.service_category))];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Target className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              Problem-Lead Discovery
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            AI-powered scanner that finds people on Reddit who are struggling with problems
            you can solve as a freelancer. Find high-intent leads before they post a formal job.
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge className="bg-accent/20 text-accent-foreground">
              <Crown className="w-3 h-3 mr-1" /> Elite
            </Badge>
            <Badge className="bg-yellow-500/20 text-yellow-400">
              <Star className="w-3 h-3 mr-1" /> Infinity
            </Badge>
          </div>
        </motion.div>

        {!isEligible ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl p-10 text-center max-w-lg mx-auto"
          >
            <Crown className="w-12 h-12 text-accent mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">Elite+ Feature</h2>
            <p className="text-muted-foreground mb-6">
              Upgrade to Elite or Infinity to unlock AI-powered lead discovery from Reddit.
            </p>
            <Button onClick={() => navigate("/payment")} className="bg-gradient-primary text-primary-foreground">
              Upgrade Now
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6 mb-6 space-y-4"
            >
              <div className="flex gap-3">
                <Input
                  placeholder="Focus on specific skills... e.g. 'data entry automation', 'social media management'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={searching}
                  className="bg-gradient-primary text-primary-foreground px-6"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {searching ? "Scanning..." : "Find Leads"}
                </Button>
              </div>

              {/* Subreddit Selector */}
              <div>
                <button
                  onClick={() => setShowSubreddits(!showSubreddits)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
                >
                  <Filter className="w-4 h-4" />
                  Customize subreddits ({selectedSubs.length})
                  <ChevronDown className={`w-4 h-4 transition ${showSubreddits ? "rotate-180" : ""}`} />
                </button>
                {showSubreddits && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedSubs.map((sub) => (
                        <Badge
                          key={sub}
                          variant="outline"
                          className="cursor-pointer hover:bg-destructive/20 transition"
                          onClick={() => setSelectedSubs(selectedSubs.filter(s => s !== sub))}
                        >
                          r/{sub} ✕
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add subreddit... e.g. ecommerce"
                        value={customSub}
                        onChange={(e) => setCustomSub(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCustomSub()}
                        className="max-w-xs"
                      />
                      <Button variant="outline" size="sm" onClick={addCustomSub}>Add</Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Filters */}
            {leads.length > 0 && (
              <div className="flex gap-3 mb-6 flex-wrap">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-muted rounded-lg px-3 py-2 text-sm border border-border"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{categoryIcons[c] || "🔧"} {c}</option>
                  ))}
                </select>
                <select
                  value={filterIntent}
                  onChange={(e) => setFilterIntent(e.target.value)}
                  className="bg-muted rounded-lg px-3 py-2 text-sm border border-border"
                >
                  <option value="all">All Intent Levels</option>
                  <option value="High">🔥 High Intent</option>
                  <option value="Medium">⚡ Medium Intent</option>
                  <option value="Low">💡 Low Intent</option>
                </select>
                {providerUsed && (
                  <Badge variant="outline" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" /> via {providerUsed}
                  </Badge>
                )}
              </div>
            )}

            {/* Results */}
            {searching && (
              <div className="text-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Scanning Reddit for problem posts...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take 15-30 seconds</p>
              </div>
            )}

            <div className="grid gap-4">
              {filteredLeads.map((lead, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl p-5 space-y-3 hover:border-primary/30 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-[10px]">r/{lead.subreddit}</Badge>
                        <Badge className={intentColors[lead.intent_level] || ""} variant="outline">
                          {lead.intent_level === "High" ? "🔥" : lead.intent_level === "Medium" ? "⚡" : "💡"} {lead.intent_level}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {categoryIcons[lead.service_category] || "🔧"} {lead.service_category}
                        </Badge>
                        {lead.upvotes && lead.upvotes > 5 && (
                          <Badge variant="outline" className="text-[10px]">
                            <TrendingUp className="w-3 h-3 mr-1" /> {lead.upvotes}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm">{lead.title}</h3>
                      {lead.author && (
                        <p className="text-xs text-muted-foreground">by u/{lead.author}</p>
                      )}
                    </div>
                    {lead.url && (
                      <a href={lead.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-destructive flex items-center gap-1">
                        <Target className="w-3 h-3" /> Pain Point
                      </p>
                      <p className="text-sm text-muted-foreground">{lead.pain_point}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-primary flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Opportunity
                      </p>
                      <p className="text-sm text-muted-foreground">{lead.opportunity}</p>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Suggested Pitch
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => copyPitch(lead.suggested_pitch)}>
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{lead.suggested_pitch}"</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {leads.length > 0 && filteredLeads.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No leads match current filters.</p>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
