/**
 * Editorial Operating System — unified command center for the BLOG admin.
 *
 * Goals:
 *  - One coherent surface to operate the entire blog/SEO pipeline.
 *  - Grouped operational nav (Content Ops / SEO & Discovery / Product
 *    Knowledge / Traffic & Analytics / Systems).
 *  - Visual 7-step pipeline so operators always know "what's next".
 *  - Cmd+K command palette for instant module jumps.
 *  - Calm gradient surfaces, structured cards, editorial warmth — feels
 *    like Linear/Notion, not a dev dashboard.
 *
 * Lives entirely on BLOG_DB. Primary DB untouched.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity, AlertCircle, ArrowRight, BookOpen, CheckCircle2, Command,
  Compass, Database, FileText, Flag, Gauge, Globe, Layers, ListChecks,
  Network, Radio, Search, Share2, ShieldCheck, Sparkles, Workflow, Zap,
  Wand2, TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { pipelineApi } from "@/integrations/blog/client";

type ModuleDef = {
  href: string;
  label: string;
  desc: string;
  icon: any;
  keywords?: string;
};

type GroupDef = {
  id: string;
  label: string;
  blurb: string;
  tone: string; // tailwind gradient classes
  icon: any;
  items: ModuleDef[];
};

const GROUPS: GroupDef[] = [
  {
    id: "content",
    label: "Content Operations",
    blurb: "Author, queue, and orchestrate editorial output.",
    tone: "from-emerald-500/15 via-emerald-400/5 to-transparent",
    icon: BookOpen,
    items: [
      { href: "/admin/blog/editorial", label: "Editorial Dashboard", desc: "Live newsroom + post status.", icon: Activity, keywords: "editorial newsroom posts" },
      { href: "/admin/blog/pipeline", label: "Content Pipeline", desc: "Unified queued → indexed timeline + auto-fix.", icon: Workflow, keywords: "pipeline timeline stages auto-fix" },
      { href: "/admin/blog", label: "Draft Queue", desc: "Drafts, review, scheduled.", icon: ListChecks, keywords: "drafts queue posts" },
      { href: "/admin/blog/authority-batch", label: "Authority Batch", desc: "Mass-generate balanced clusters.", icon: Sparkles, keywords: "authority batch generator" },
      { href: "/admin/blog/narrative", label: "Narrative Ops", desc: "Generation feed + narrative engine.", icon: Workflow, keywords: "narrative engine live feed" },
      { href: "/admin/blog/queue", label: "AI Publishing Queue", desc: "Pending automated drops.", icon: ListChecks, keywords: "ai queue publishing" },
    ],
  },
  {
    id: "seo",
    label: "SEO & Discovery",
    blurb: "Index, distribute, and earn authority.",
    tone: "from-sky-500/15 via-sky-400/5 to-transparent",
    icon: Compass,
    items: [
      { href: "/admin/blog/crawl", label: "Crawl Orchestrator", desc: "IndexNow queue, sitemap freshness, pings.", icon: Radio, keywords: "crawl indexnow sitemap" },
      { href: "/admin/blog/indexing", label: "Indexing Ops", desc: "Bing / Google / Yandex submissions.", icon: Radio, keywords: "indexing bing google" },
      { href: "/admin/blog/adsense", label: "AdSense Readiness", desc: "Per-post monetization scoring.", icon: ShieldCheck, keywords: "adsense readiness ads" },
      { href: "/admin/blog/seo", label: "SEO Health", desc: "Sitemap, metadata, structured data.", icon: Gauge, keywords: "seo health sitemap" },
      { href: "/admin/blog/linking", label: "Internal Linking", desc: "Orphans, hubs, authority flow.", icon: Share2, keywords: "internal links orphans" },
      { href: "/admin/blog/topics", label: "Topic Intelligence", desc: "Clusters, keywords, opportunity gaps.", icon: Layers, keywords: "topics clusters keywords" },
    ],
  },
  {
    id: "knowledge",
    label: "Product Knowledge",
    blurb: "Map products into editorial conversion.",
    tone: "from-violet-500/15 via-violet-400/5 to-transparent",
    icon: Network,
    items: [
      { href: "/admin/blog/registry", label: "Tool Registry", desc: "Products, slugs, taglines, capabilities.", icon: Database, keywords: "tools registry product" },
      { href: "/admin/blog/graph", label: "Knowledge Graph", desc: "Tool ↔ topic ↔ post relationships.", icon: Share2, keywords: "graph relationships clusters" },
      { href: "/admin/blog/hustle-templates", label: "Hustle Templates", desc: "Deep-link presets into Explore.", icon: Workflow, keywords: "hustle templates preset" },
      { href: "/admin/blog/tool-media", label: "Tool Media Library", desc: "Auto-captured screenshots, WebP.", icon: FileText, keywords: "tool media screenshots" },
    ],
  },
  {
    id: "traffic",
    label: "Traffic & Analytics",
    blurb: "Watch acquisition, CTR and funnel health.",
    tone: "from-amber-500/15 via-amber-400/5 to-transparent",
    icon: Globe,
    items: [
      { href: "/admin/blog/traffic", label: "Traffic Intelligence", desc: "Yandex Metrica, regional, bounce.", icon: Activity, keywords: "yandex traffic metrica" },
      { href: "/admin/blog/seo", label: "Search Console", desc: "GSC integration + queries.", icon: Compass, keywords: "search console queries" },
      { href: "/admin/blog/adsense", label: "Monetization", desc: "Ad-readiness rolled up.", icon: ShieldCheck, keywords: "adsense monetization" },
    ],
  },
  {
    id: "systems",
    label: "Systems",
    blurb: "Schemas, queues, diagnostics.",
    tone: "from-rose-500/15 via-rose-400/5 to-transparent",
    icon: Database,
    items: [
      { href: "/admin/blog/bootstrap", label: "Bootstrap Center", desc: "All BLOG_DB schemas in one place.", icon: Database, keywords: "bootstrap sql schema blog db" },
      { href: "/admin/blog/operations", label: "Queue Status", desc: "Job runs, regeneration, errors.", icon: ListChecks, keywords: "queue jobs operations" },
      { href: "/admin/feature-flags", label: "Feature Flags", desc: "Toggle modules per tier.", icon: Flag, keywords: "feature flags toggles" },
    ],
  },
];

type StepDef = {
  step: number;
  title: string;
  href: string;
  blurb: string;
  status: "idle" | "ready" | "running" | "ok" | "warn";
};

const STEPS: StepDef[] = [
  { step: 1, title: "Sync Tool Registry", href: "/admin/blog/registry", blurb: "Pull current product list into BLOG_DB.", status: "ready" },
  { step: 2, title: "Generate Authority Batch", href: "/admin/blog/authority-batch", blurb: "20 cluster-balanced articles.", status: "ready" },
  { step: 3, title: "Run Tool Matching", href: "/admin/blog/graph", blurb: "Inject 2–5 tools per draft.", status: "ready" },
  { step: 4, title: "Capture Screenshots", href: "/admin/blog/tool-media", blurb: "Auto WebP per tool.", status: "ready" },
  { step: 5, title: "Run AdSense Check", href: "/admin/blog/adsense", blurb: "Score ≥ 70 to publish.", status: "ready" },
  { step: 6, title: "Review & Publish", href: "/admin/blog/editorial", blurb: "Editorial sign-off + go live.", status: "ready" },
  { step: 7, title: "Submit to Indexing", href: "/admin/blog/crawl", blurb: "IndexNow + sitemap ping.", status: "ready" },
];

const STATUS_TONE: Record<StepDef["status"], string> = {
  idle:    "bg-muted text-muted-foreground",
  ready:   "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  running: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  ok:      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  warn:    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

function useCmdK(open: boolean, setOpen: (v: boolean) => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);
}

export default function EditorialOS() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useCmdK(paletteOpen, setPaletteOpen);

  async function handleAutoFixAll() {
    setBusy("autofix");
    try {
      const r = await pipelineApi.autoFix({});
      toast({ title: "Auto-fix complete", description: `Processed ${r.processed} article(s).` });
    } catch (e: any) {
      toast({ title: "Auto-fix failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }
  async function handleRepairRoutes() {
    setBusy("reconcile");
    try {
      const r = await pipelineApi.reconcileRoutes();
      toast({
        title: "Routes reconciled",
        description: `${r.total_published ?? 0} published · ${r.duplicate_slugs?.length ?? 0} dup · ${r.broken_internal_refs?.length ?? 0} broken refs`,
      });
    } catch (e: any) {
      toast({ title: "Reconcile failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }

  const allModules = useMemo(() => GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))), []);

  const filteredGroups = useMemo(() => {
    if (!filter.trim()) return GROUPS;
    const q = filter.toLowerCase();
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) =>
        i.label.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q) ||
        (i.keywords ?? "").toLowerCase().includes(q)
      ),
    })).filter((g) => g.items.length > 0);
  }, [filter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Calm gradient header */}
      <div className="relative border-b border-border/60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-sky-500/5 to-violet-500/8 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            <Link to="/admin" className="hover:text-foreground">Admin</Link>
            <span>/</span>
            <span className="text-foreground/80">Editorial OS</span>
            <span className="ml-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> BLOG_DB live
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
                Editorial Operating System
              </h1>
              <p className="mt-2 text-muted-foreground max-w-2xl">
                One surface for content, indexing, product knowledge, and acquisition.
                Operate the publication like a workflow — not a directory of pages.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPaletteOpen(true)} className="gap-2">
                <Command className="h-3.5 w-3.5" /> Command palette
                <kbd className="ml-1 hidden sm:inline-flex items-center rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
              </Button>
              <Button variant="outline" onClick={handleRepairRoutes} disabled={busy === "reconcile"} className="gap-2">
                <TimerReset className="h-3.5 w-3.5" /> Repair routes
              </Button>
              <Button variant="outline" onClick={handleAutoFixAll} disabled={busy === "autofix"} className="gap-2">
                <Wand2 className="h-3.5 w-3.5" /> Auto-fix editorial
              </Button>
              <Button variant="secondary" onClick={() => navigate("/admin/blog/pipeline")} className="gap-2">
                <Workflow className="h-3.5 w-3.5" /> Open pipeline
              </Button>
              <Button onClick={() => navigate("/admin/blog/authority-batch")} className="gap-2">
                <Sparkles className="h-3.5 w-3.5" /> New batch
              </Button>
            </div>
          </div>

          {/* Quick stat strip */}
          <div className="mt-7 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Pipeline modules", value: GROUPS.reduce((a, g) => a + g.items.length, 0), tone: "text-emerald-600 dark:text-emerald-400" },
              { label: "Active steps", value: STEPS.length, tone: "text-sky-600 dark:text-sky-400" },
              { label: "Primary DB", value: "untouched", tone: "text-violet-600 dark:text-violet-400" },
              { label: "Storage", value: "BLOG_DB", tone: "text-amber-600 dark:text-amber-400" },
              { label: "Mode", value: "Live", tone: "text-rose-600 dark:text-rose-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{s.label}</div>
                <div className={`mt-1 text-lg font-semibold ${s.tone}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* OPERATIONAL STEP FLOW */}
        <section>
          <header className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Editorial Pipeline</h2>
              <p className="text-xl font-display font-semibold mt-1">From registry sync to indexed in seven steps</p>
            </div>
          </header>
          <ol className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {STEPS.map((s, i) => (
              <li key={s.step} className="relative">
                <Link
                  to={s.href}
                  className="group block h-full rounded-xl border border-border/60 bg-card hover:bg-accent/40 transition-colors p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[s.status]}`}>
                      Step {s.step}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="mt-3 text-sm font-semibold leading-snug">{s.title}</div>
                  <div className="mt-1 text-[12px] text-muted-foreground leading-snug">{s.blurb}</div>
                </Link>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-1.5 h-px w-3 bg-border/60" />
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* INLINE FILTER */}
        <section>
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter modules — try ‘adsense’, ‘crawl’, ‘registry’…"
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-9"
            />
            <kbd className="hidden sm:inline-flex items-center rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K opens palette</kbd>
          </div>
        </section>

        {/* GROUPED OPERATIONAL NAV */}
        <section className="space-y-10">
          {filteredGroups.map((g) => (
            <div key={g.id}>
              <div className={`relative rounded-2xl border border-border/60 overflow-hidden bg-gradient-to-br ${g.tone}`}>
                <div className="px-5 pt-5 pb-2 flex items-center gap-3">
                  <div className="rounded-lg bg-background/70 backdrop-blur border border-border/60 p-2">
                    <g.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{g.id}</div>
                    <h3 className="font-display text-lg font-semibold">{g.label}</h3>
                    <p className="text-sm text-muted-foreground">{g.blurb}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
                  {g.items.map((m) => (
                    <Link
                      key={m.href + m.label}
                      to={m.href}
                      className="group rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm p-4 hover:border-foreground/30 transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="rounded-md bg-muted/60 p-1.5 shrink-0"><m.icon className="h-3.5 w-3.5" /></div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold leading-tight truncate">{m.label}</div>
                            <div className="text-[12px] text-muted-foreground leading-snug mt-0.5">{m.desc}</div>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0 mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-muted-foreground">
              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
              No modules match “{filter}”. Try a different keyword or open ⌘K.
            </div>
          )}
        </section>

        {/* FOOTER NOTE */}
        <section className="rounded-xl border border-border/60 bg-card/60 p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">
              All editorial infra (queues, screenshots, embeddings, indexing) lives on <code className="text-foreground">BLOG_DB</code>. Primary DB is read-only here.
            </span>
          </div>
          <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground">← Back to Admin</Link>
        </section>
      </main>

      {/* COMMAND PALETTE */}
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Jump to module, action, or system…" />
        <CommandList>
          <CommandEmpty>No matching module.</CommandEmpty>
          {GROUPS.map((g) => (
            <CommandGroup key={g.id} heading={g.label}>
              {g.items.map((m) => (
                <CommandItem
                  key={m.href + m.label}
                  value={`${m.label} ${m.desc} ${m.keywords ?? ""}`}
                  onSelect={() => { setPaletteOpen(false); navigate(m.href); }}
                >
                  <m.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{m.label}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground truncate max-w-[55%]">{m.desc}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}

/* Re-export the canonical module map so 404 helpers can suggest closest match. */
export const EDITORIAL_OS_MODULES = GROUPS.flatMap((g) => g.items);