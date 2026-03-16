import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Search, Target, Zap, TrendingUp, MessageSquare, Copy,
  ExternalLink, Loader2, Crown, Star, Filter, ChevronDown,
  Bookmark, BookmarkCheck, CheckCircle, Clock, BarChart3,
  Globe, Code, Newspaper, Briefcase, ArrowUpRight, Trash2,
} from "lucide-react";

interface Lead {
  title: string;
  source: string;
  source_identifier?: string;
  pain_point: string;
  opportunity: string;
  service_category: string;
  intent_score: number;
  intent_level: string;
  suggested_pitch: string;
  personalized_outreach: string;
  url?: string;
  author?: string;
  upvotes?: number;
  // CRM fields
  id?: string;
  status?: string;
  outreach_notes?: string;
  saved?: boolean;
}

interface TrendData {
  trending_services: { service: string; demand_score: number; growth_direction: string; post_count: number; example_problems: string[] }[];
  emerging_pain_points: { pain_point: string; frequency: number; potential_service: string }[];
  recommended_packages: { package_name: string; description: string; target_audience: string; estimated_demand: string }[];
  summary: string;
}

interface SavedLead {
  id: string;
  source: string;
  title: string;
  pain_point: string | null;
  opportunity: string | null;
  service_category: string | null;
  intent_score: number | null;
  intent_level: string | null;
  suggested_pitch: string | null;
  personalized_outreach: string | null;
  source_url: string | null;
  author: string | null;
  status: string;
  outreach_notes: string | null;
  contacted_at: string | null;
  converted_at: string | null;
  created_at: string;
}

const sourceConfig = {
  reddit: { icon: Globe, label: "Reddit", color: "text-orange-400" },
  stackoverflow: { icon: Code, label: "Stack Overflow", color: "text-yellow-400" },
  hackernews: { icon: Newspaper, label: "HackerNews", color: "text-orange-500" },
  adzuna: { icon: Briefcase, label: "Adzuna Jobs", color: "text-blue-400" },
};

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

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-500/20 text-blue-400" },
  contacted: { label: "Contacted", color: "bg-yellow-500/20 text-yellow-400" },
  replied: { label: "Replied", color: "bg-green-500/20 text-green-400" },
  converted: { label: "Converted", color: "bg-primary/20 text-primary" },
  rejected: { label: "Rejected", color: "bg-destructive/20 text-destructive" },
};

export default function ProblemLeads() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSubreddits, setShowSubreddits] = useState(false);
  const [selectedSubs, setSelectedSubs] = useState<string[]>(defaultSubreddits);
  const [customSub, setCustomSub] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterIntent, setFilterIntent] = useState<string>("all");
  const [selectedSources, setSelectedSources] = useState<string[]>(["reddit"]);
  const [activeTab, setActiveTab] = useState("discover");

  // CRM state
  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [crmFilter, setCrmFilter] = useState("all");

  // Trends state
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);

  const isEligible = profile && ["elite", "infinity"].includes(profile.subscription_tier);

  useEffect(() => {
    if (user && isEligible) loadSavedLeads();
  }, [user, isEligible]);

  const loadSavedLeads = async () => {
    setLoadingSaved(true);
    const { data } = await supabase
      .from("problem_leads")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setSavedLeads((data as SavedLead[]) || []);
    setLoadingSaved(false);
  };

  const toggleSource = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const handleSearch = async () => {
    if (!user || !isEligible) {
      toast({ title: "Elite+ Required", description: "Upgrade to access this feature.", variant: "destructive" });
      return;
    }
    if (selectedSources.length === 0) {
      toast({ title: "Select Sources", description: "Pick at least one source to scan.", variant: "destructive" });
      return;
    }
    setSearching(true);
    setLeads([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/problem-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ query: query || undefined, subreddits: selectedSubs, sources: selectedSources, mode: "leads" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch leads");
      setLeads(result.leads || []);
      if ((result.leads || []).length === 0) {
        toast({ title: "No leads found", description: "Try different keywords or sources." });
      } else {
        toast({ title: `Found ${result.leads.length} leads!`, description: `Scanned ${result.total_posts_analyzed} posts from ${result.sources_scanned?.join(", ")}` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSearching(false);
  };

  const handleTrendScan = async () => {
    if (!user || !isEligible) return;
    setLoadingTrends(true);
    setTrends(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/problem-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ query: query || undefined, subreddits: selectedSubs, sources: selectedSources.length ? selectedSources : ["reddit", "stackoverflow", "hackernews"], mode: "trends" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed");
      setTrends(result);
      // Save trend snapshot
      await supabase.from("lead_trends").insert({
        user_id: user.id,
        trend_data: result,
        analysis: result.summary,
        scanned_sources: result.sources_scanned || [],
        total_posts_analyzed: result.total_posts_analyzed || 0,
      });
      toast({ title: "Trend analysis complete!", description: `Analyzed ${result.total_posts_analyzed} posts` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoadingTrends(false);
  };

  const saveLead = async (lead: Lead) => {
    if (!user) return;
    const { error } = await supabase.from("problem_leads").insert({
      user_id: user.id,
      source: lead.source,
      source_url: lead.url || null,
      title: lead.title,
      author: lead.author || null,
      pain_point: lead.pain_point,
      opportunity: lead.opportunity,
      service_category: lead.service_category,
      intent_score: lead.intent_score,
      intent_level: lead.intent_level,
      suggested_pitch: lead.suggested_pitch,
      personalized_outreach: lead.personalized_outreach,
      status: "new",
    });
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lead saved!", description: "Added to your CRM pipeline." });
      loadSavedLeads();
    }
  };

  const updateLeadStatus = async (id: string, status: string) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === "contacted") updates.contacted_at = new Date().toISOString();
    if (status === "converted") updates.converted_at = new Date().toISOString();
    await supabase.from("problem_leads").update(updates).eq("id", id);
    loadSavedLeads();
    toast({ title: "Status updated" });
  };

  const deleteSavedLead = async (id: string) => {
    await supabase.from("problem_leads").delete().eq("id", id);
    loadSavedLeads();
    toast({ title: "Lead removed" });
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

  const filteredSavedLeads = savedLeads.filter(l => crmFilter === "all" || l.status === crmFilter);
  const categories = [...new Set(leads.map(l => l.service_category))];

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!user) { navigate("/login"); return null; }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Target className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-display font-bold">Problem-Lead Discovery</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            AI-powered multi-source scanner that finds high-intent leads from Reddit, Stack Overflow, HackerNews & Adzuna Jobs. Save leads, track outreach, and discover market trends.
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge className="bg-accent/20 text-accent-foreground"><Crown className="w-3 h-3 mr-1" /> Elite</Badge>
            <Badge className="bg-yellow-500/20 text-yellow-400"><Star className="w-3 h-3 mr-1" /> Infinity</Badge>
          </div>
        </motion.div>

        {!isEligible ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-10 text-center max-w-lg mx-auto">
            <Crown className="w-12 h-12 text-accent mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">Elite+ Feature</h2>
            <p className="text-muted-foreground mb-6">Upgrade to Elite or Infinity to unlock AI-powered multi-source lead discovery.</p>
            <Button onClick={() => navigate("/payment")} className="bg-gradient-primary text-primary-foreground">Upgrade Now</Button>
          </motion.div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6 w-full max-w-md mx-auto">
              <TabsTrigger value="discover"><Search className="w-4 h-4 mr-1" /> Discover</TabsTrigger>
              <TabsTrigger value="pipeline"><Bookmark className="w-4 h-4 mr-1" /> Pipeline ({savedLeads.length})</TabsTrigger>
              <TabsTrigger value="trends"><BarChart3 className="w-4 h-4 mr-1" /> Trends</TabsTrigger>
            </TabsList>

            {/* ── DISCOVER TAB ── */}
            <TabsContent value="discover">
              {/* Source Selector */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 mb-5 space-y-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(sourceConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const active = selectedSources.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleSource(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                      >
                        <Icon className={`w-4 h-4 ${active ? cfg.color : ""}`} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <Input
                    placeholder="Focus on: 'data entry automation', 'next.js migration', 'social media'..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={searching} className="bg-gradient-primary text-primary-foreground px-6">
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {searching ? "Scanning..." : "Find Leads"}
                  </Button>
                </div>

                {selectedSources.includes("reddit") && (
                  <div>
                    <button onClick={() => setShowSubreddits(!showSubreddits)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
                      <Filter className="w-4 h-4" /> Subreddits ({selectedSubs.length})
                      <ChevronDown className={`w-4 h-4 transition ${showSubreddits ? "rotate-180" : ""}`} />
                    </button>
                    {showSubreddits && (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {selectedSubs.map(sub => (
                            <Badge key={sub} variant="outline" className="cursor-pointer hover:bg-destructive/20 transition" onClick={() => setSelectedSubs(selectedSubs.filter(s => s !== sub))}>
                              r/{sub} ✕
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input placeholder="Add subreddit..." value={customSub} onChange={(e) => setCustomSub(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomSub()} className="max-w-xs" />
                          <Button variant="outline" size="sm" onClick={addCustomSub}>Add</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Filters */}
              {leads.length > 0 && (
                <div className="flex gap-3 mb-5 flex-wrap">
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-muted rounded-lg px-3 py-2 text-sm border border-border">
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{categoryIcons[c] || "🔧"} {c}</option>)}
                  </select>
                  <select value={filterIntent} onChange={(e) => setFilterIntent(e.target.value)} className="bg-muted rounded-lg px-3 py-2 text-sm border border-border">
                    <option value="all">All Intent</option>
                    <option value="High">🔥 High</option>
                    <option value="Medium">⚡ Medium</option>
                    <option value="Low">💡 Low</option>
                  </select>
                </div>
              )}

              {/* Scanning state */}
              {searching && (
                <div className="text-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Scanning {selectedSources.map(s => sourceConfig[s as keyof typeof sourceConfig]?.label).join(", ")}...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take 15-30 seconds</p>
                </div>
              )}

              {/* Lead Cards */}
              <div className="grid gap-4">
                {filteredLeads.map((lead, i) => (
                  <LeadCard key={i} lead={lead} index={i} onCopy={copyPitch} onSave={() => saveLead(lead)} />
                ))}
              </div>
              {leads.length > 0 && filteredLeads.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No leads match current filters.</p>
              )}
            </TabsContent>

            {/* ── PIPELINE TAB ── */}
            <TabsContent value="pipeline">
              <div className="flex gap-2 mb-5 flex-wrap">
                {["all", ...Object.keys(statusConfig)].map(s => (
                  <button
                    key={s}
                    onClick={() => setCrmFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${crmFilter === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    {s === "all" ? "All" : statusConfig[s].label} {s !== "all" && `(${savedLeads.filter(l => l.status === s).length})`}
                  </button>
                ))}
              </div>

              {loadingSaved ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
              ) : filteredSavedLeads.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No saved leads yet. Discover and save leads to build your pipeline.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredSavedLeads.map(lead => (
                    <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className="text-[10px]">{lead.source}</Badge>
                            <Badge className={statusConfig[lead.status]?.color || ""} variant="outline">
                              {statusConfig[lead.status]?.label || lead.status}
                            </Badge>
                            {lead.intent_score && (
                              <Badge variant="outline" className="text-[10px]">Score: {lead.intent_score}/10</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm">{lead.title}</h3>
                          {lead.pain_point && <p className="text-xs text-muted-foreground mt-1">{lead.pain_point}</p>}
                        </div>
                        <div className="flex gap-1">
                          {lead.source_url && (
                            <a href={lead.source_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-3.5 h-3.5" /></Button>
                            </a>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSavedLead(lead.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {lead.personalized_outreach && (
                        <div className="bg-muted/30 rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">Personalized Outreach</span>
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copyPitch(lead.personalized_outreach!)}>
                              <Copy className="w-3 h-3 mr-1" /> Copy
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground italic">"{lead.personalized_outreach}"</p>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={() => updateLeadStatus(lead.id, key)}
                            className={`text-xs px-2 py-1 rounded transition ${lead.status === key ? cfg.color + " font-medium" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── TRENDS TAB ── */}
            <TabsContent value="trends">
              <div className="glass rounded-2xl p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display font-bold text-lg">Trend Discovery</h3>
                    <p className="text-xs text-muted-foreground">AI analyzes hundreds of posts to find high-demand freelance services</p>
                  </div>
                  <Button onClick={handleTrendScan} disabled={loadingTrends} className="bg-gradient-primary text-primary-foreground">
                    {loadingTrends ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <BarChart3 className="w-4 h-4 mr-1" />}
                    {loadingTrends ? "Analyzing..." : "Scan Trends"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sourceConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const active = selectedSources.includes(key);
                    return (
                      <button key={key} onClick={() => toggleSource(key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition border ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${active ? cfg.color : ""}`} /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {loadingTrends && (
                <div className="text-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Analyzing market trends across all sources...</p>
                </div>
              )}

              {trends && (
                <div className="space-y-5">
                  {/* Summary */}
                  <div className="glass rounded-xl p-5">
                    <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Market Summary</h3>
                    <p className="text-sm text-muted-foreground">{trends.summary}</p>
                  </div>

                  {/* Trending Services */}
                  <div className="glass rounded-xl p-5">
                    <h3 className="font-bold text-sm mb-3">🔥 Trending Services</h3>
                    <div className="grid gap-3">
                      {trends.trending_services?.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{s.service}</span>
                              <Badge variant="outline" className={`text-[10px] ${s.growth_direction === "rising" ? "text-green-400" : s.growth_direction === "declining" ? "text-destructive" : "text-muted-foreground"}`}>
                                {s.growth_direction === "rising" ? "↑" : s.growth_direction === "declining" ? "↓" : "→"} {s.growth_direction}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{s.example_problems?.slice(0, 2).join(" • ")}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">{s.demand_score}/10</div>
                            <p className="text-[10px] text-muted-foreground">{s.post_count} posts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Emerging Pain Points */}
                  <div className="glass rounded-xl p-5">
                    <h3 className="font-bold text-sm mb-3">🆕 Emerging Pain Points</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {trends.emerging_pain_points?.map((p, i) => (
                        <div key={i} className="p-3 bg-muted/20 rounded-lg">
                          <p className="text-sm font-medium mb-1">{p.pain_point}</p>
                          <p className="text-xs text-muted-foreground">
                            <ArrowUpRight className="w-3 h-3 inline mr-1" />
                            Potential: {p.potential_service} ({p.frequency} mentions)
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Packages */}
                  <div className="glass rounded-xl p-5">
                    <h3 className="font-bold text-sm mb-3">📦 Recommended Service Packages</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {trends.recommended_packages?.map((pkg, i) => (
                        <div key={i} className="p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{pkg.package_name}</span>
                            <Badge variant="outline" className={`text-[10px] ${pkg.estimated_demand === "high" ? "text-green-400" : pkg.estimated_demand === "medium" ? "text-yellow-400" : "text-muted-foreground"}`}>
                              {pkg.estimated_demand} demand
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{pkg.description}</p>
                          <p className="text-[10px] text-muted-foreground">Target: {pkg.target_audience}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!trends && !loadingTrends && (
                <div className="text-center py-16 text-muted-foreground">
                  <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Click "Scan Trends" to analyze market demand patterns across sources.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
}

// ── Lead Card Component ──

function LeadCard({ lead, index, onCopy, onSave }: { lead: Lead; index: number; onCopy: (s: string) => void; onSave: () => void }) {
  const [showOutreach, setShowOutreach] = useState(false);
  const srcCfg = sourceConfig[lead.source as keyof typeof sourceConfig] || sourceConfig.reddit;
  const SrcIcon = srcCfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass rounded-xl p-5 space-y-3 hover:border-primary/30 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className="text-[10px]">
              <SrcIcon className={`w-3 h-3 mr-1 ${srcCfg.color}`} />
              {lead.source_identifier || lead.source}
            </Badge>
            <Badge className={intentColors[lead.intent_level] || ""} variant="outline">
              {lead.intent_level === "High" ? "🔥" : lead.intent_level === "Medium" ? "⚡" : "💡"} {lead.intent_level}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {categoryIcons[lead.service_category] || "🔧"} {lead.service_category}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-bold">
              Score: {lead.intent_score}/10
            </Badge>
          </div>
          <h3 className="font-semibold text-sm">{lead.title}</h3>
          {lead.author && <p className="text-xs text-muted-foreground">by {lead.author}</p>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onSave} title="Save to pipeline">
            <Bookmark className="w-4 h-4" />
          </Button>
          {lead.url && (
            <a href={lead.url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="shrink-0"><ExternalLink className="w-4 h-4" /></Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-destructive flex items-center gap-1"><Target className="w-3 h-3" /> Pain Point</p>
          <p className="text-sm text-muted-foreground">{lead.pain_point}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-primary flex items-center gap-1"><Zap className="w-3 h-3" /> Opportunity</p>
          <p className="text-sm text-muted-foreground">{lead.opportunity}</p>
        </div>
      </div>

      {/* Generic Pitch */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Quick Pitch</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onCopy(lead.suggested_pitch)}><Copy className="w-3 h-3 mr-1" /> Copy</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowOutreach(!showOutreach)}>
              {showOutreach ? "Hide" : "✨ Personalized"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground italic">"{lead.suggested_pitch}"</p>
      </div>

      {/* Personalized Outreach */}
      {showOutreach && lead.personalized_outreach && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium flex items-center gap-1 text-primary">✨ Personalized Outreach</p>
            <Button variant="ghost" size="sm" onClick={() => onCopy(lead.personalized_outreach)}><Copy className="w-3 h-3 mr-1" /> Copy</Button>
          </div>
          <p className="text-sm text-muted-foreground">{lead.personalized_outreach}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
