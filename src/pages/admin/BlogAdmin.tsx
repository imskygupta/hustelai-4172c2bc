import { useEffect, useMemo, useState } from "react";
import { blogApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Sparkles, Save, Send, CheckCircle2, Loader2, Image as ImageIcon, RefreshCw,
  RadioTower, Eye, Activity, Network, Target, Gauge, Zap, AlertTriangle, FileText,
  TrendingUp, Cpu, ChevronRight, Lightbulb, Rocket,
} from "lucide-react";

type Post = any;

const PIPELINE = [
  { key: "idea", label: "Ideas" },
  { key: "draft", label: "Drafting" },
  { key: "in_review", label: "Review" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
  { key: "indexed", label: "Indexed" },
] as const;

const AI_STAGES = [
  "researching keyword",
  "building structure",
  "generating intro",
  "injecting internal links",
  "optimizing metadata",
  "generating CTA",
  "preparing publish payload",
] as const;

const HERO_STYLES = ["editorial", "operational", "minimal", "vibrant", "cinematic"] as const;

function wordCount(s: string) { return (s ?? "").trim().split(/\s+/).filter(Boolean).length; }
function readabilityScore(body: string) {
  const w = wordCount(body); const sentences = Math.max(1, (body.match(/[.!?]+/g) ?? []).length);
  const avg = w / sentences; return Math.max(0, Math.min(100, Math.round(120 - avg * 4)));
}
function keywordScore(body: string, kw: string) {
  if (!kw) return 0; const w = wordCount(body) || 1;
  const hits = (body.toLowerCase().match(new RegExp(`\\b${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")) ?? []).length;
  const density = (hits / w) * 100; return Math.round(Math.max(0, Math.min(100, density * 35)));
}
function internalLinkCount(body: string) { return (body.match(/\]\(\/(?!http)/g) ?? []).length; }
function ctaStrength(post: Post) {
  const ctas = Array.isArray(post?.cta_blocks) ? post.cta_blocks.length : 0;
  const inline = ((post?.body_md ?? "") as string).match(/\b(try|start|launch|generate|build|book|signup)\b/gi)?.length ?? 0;
  return Math.min(100, ctas * 30 + inline * 5);
}

export default function BlogAdmin() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [editing, setEditing] = useState<Post | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiStageIdx, setAiStageIdx] = useState<number>(-1);
  const [view, setView] = useState<"split" | "edit" | "preview">("split");
  const [generatingHero, setGeneratingHero] = useState(false);
  const [heroStyle, setHeroStyle] = useState<typeof HERO_STYLES[number]>("editorial");

  const reload = async () => {
    const r = await blogApi.adminList();
    setPosts(r.posts ?? []);
    const d = await blogApi.adminDrafts();
    setDrafts(d.drafts ?? []);
  };
  useEffect(() => { reload(); }, []);

  // simulated AI activity ticker while busy generating
  useEffect(() => {
    if (aiStageIdx < 0) return;
    const t = setTimeout(() => setAiStageIdx(i => (i + 1 >= AI_STAGES.length ? -1 : i + 1)), 700);
    return () => clearTimeout(t);
  }, [aiStageIdx]);

  const open = async (id: string) => {
    const r = await blogApi.adminGet(id);
    setEditing(r.post); setIssues([]);
  };
  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try { const r = await blogApi.adminSave(editing); toast.success("Saved"); setEditing(r.post); reload(); }
    catch (e: any) { toast.error(String(e.message ?? e)); }
    finally { setBusy(false); }
  };
  const validate = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-admin?action=validate`, {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          authorization: `Bearer ${(await (await import("@/integrations/supabase/client")).supabase.auth.getSession()).data.session?.access_token ?? ""}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ post: editing }),
      }).then(r => r.json());
      setIssues(res.issues ?? []);
      if (!(res.issues ?? []).length) toast.success("Editorial checks passed");
      else toast.warning(`${res.issues.length} issues to fix`);
    } finally { setBusy(false); }
  };
  const transition = async (status: string) => {
    if (!editing?.id) { toast.error("Save first"); return; }
    setBusy(true);
    try { await blogApi.adminTransition(editing.id, status); toast.success(`Moved to ${status}`); reload(); }
    catch { toast.error("Validation failed — check editorial issues"); }
    finally { setBusy(false); }
  };
  const generate = async (topic: string) => {
    setBusy(true); setAiStageIdx(0);
    try { await blogApi.adminGenerate(topic); toast.success("Draft generated"); reload(); }
    catch (e: any) { toast.error(String(e.message ?? e)); }
    finally { setBusy(false); setAiStageIdx(-1); }
  };
  const regenerateHero = async () => {
    setGeneratingHero(true);
    try {
      // best-effort — uses any available image generator API on the blog backend
      const r: any = await (blogApi as any).adminGenerateHero?.({ id: editing?.id, style: heroStyle, prompt: editing?.title });
      if (r?.url) setEditing({ ...editing, hero_image: r.url });
      else toast.message("Hero regeneration queued");
    } catch { toast.error("Hero generation unavailable"); }
    finally { setGeneratingHero(false); }
  };

  // -------- intelligence signals --------
  const intel = useMemo(() => {
    const body = String(editing?.body_md ?? "");
    const w = wordCount(body);
    return {
      kw: keywordScore(body, editing?.focus_keyword ?? ""),
      read: readabilityScore(body),
      links: internalLinkCount(body),
      authority: Math.min(100, w / 12),
      orphan: internalLinkCount(body) === 0 && w > 200,
      cluster: editing?.category ?? "unassigned",
      indexReady: !!(editing?.title && editing?.slug && editing?.meta_title && editing?.hero_image && w >= 600),
      cta: ctaStrength(editing ?? {}),
      semantic: Math.min(100, Math.round(w / 8)),
      words: w,
    };
  }, [editing]);

  const liveStatus = useMemo(() => {
    if (!editing) return [] as { k: string; label: string; ok: boolean }[];
    return [
      { k: "draft",    label: "Drafting",          ok: !!editing.body_md },
      { k: "hero",     label: "Hero ready",        ok: !!editing.hero_image },
      { k: "seo",      label: "SEO optimized",     ok: !!editing.meta_title && !!editing.meta_description },
      { k: "links",    label: "Internal links",    ok: intel.links >= 2 },
      { k: "cluster",  label: "Cluster connected", ok: !!editing.category },
      { k: "cta",      label: "CTA injected",      ok: intel.cta >= 30 },
      { k: "indexed",  label: "Indexed",           ok: editing.status === "published" },
      { k: "publish",  label: "Ready to publish",  ok: intel.indexReady && intel.kw > 20 },
    ];
  }, [editing, intel]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top operational bar */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <RadioTower className="w-4 h-4 text-emerald-400" />
              <motion.span
                className="absolute inset-0 rounded-full bg-emerald-400/30 blur-md"
                animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ repeat: Infinity, duration: 2.4 }}
              />
            </div>
            <div className="leading-tight">
              <h1 className="font-display font-semibold text-sm tracking-tight">Editorial Operations</h1>
              <p className="text-[10px] text-muted-foreground font-mono">blogs.hustlaiapp.in · live</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild><a href="/admin/blog/editorial">Command center →</a></Button>
            <Button size="sm" variant="ghost" asChild><a href="/admin/blog/seo">SEO →</a></Button>
            <Button size="sm" variant="outline" onClick={() => generate("freelance workflow automation")} disabled={busy}>
              <Sparkles className="w-3.5 h-3.5 mr-1" /> AI draft
            </Button>
            <Button size="sm" onClick={() => setEditing({ status: "draft", body_md: "", title: "Untitled", cta_blocks: [], faq: [] })}>
              + New post
            </Button>
          </div>
        </div>

        {/* Pipeline visualization */}
        <div className="px-6 pb-3">
          <PipelineFlow currentStatus={editing?.status} />
        </div>

        {/* Live status chips */}
        {editing && (
          <div className="px-6 pb-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
            {liveStatus.map(s => <StatusChip key={s.k} ok={s.ok} label={s.label} />)}
          </div>
        )}

        {/* AI activity terminal */}
        <AnimatePresence>
          {aiStageIdx >= 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="px-6 overflow-hidden border-t border-emerald-500/20 bg-emerald-500/[0.04]"
            >
              <div className="py-2 flex items-center gap-3 text-[11px] font-mono">
                <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ scale: [1, 1.6, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                <span className="text-emerald-400">ai-engine</span>
                <span className="text-muted-foreground">$</span>
                <motion.span key={aiStageIdx} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-foreground">
                  {AI_STAGES[aiStageIdx]}
                </motion.span>
                <span className="ml-auto text-muted-foreground">{aiStageIdx + 1}/{AI_STAGES.length}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Operational metric strip */}
      <div className="px-6 pt-5 pb-3 grid grid-cols-2 md:grid-cols-6 gap-2">
        <Metric label="Posts today"      value={posts.filter(p => isToday(p.created_at)).length} />
        <Metric label="Drafts in review" value={posts.filter(p => p.status === "in_review").length} />
        <Metric label="Pending indexing" value={posts.filter(p => p.status === "published" && !p.indexed_at).length} />
        <Metric label="Queue depth"      value={drafts.length} pulse />
        <Metric label="Top cluster"      value={topCluster(posts)} small />
        <Metric label="Velocity / wk"    value={Math.round(posts.filter(p => withinDays(p.published_at, 7)).length)} />
      </div>

      {/* Main work surface */}
      <div className="grid lg:grid-cols-[260px_1fr_320px] gap-0 min-h-[calc(100vh-12rem)]">
        {/* Posts list */}
        <aside className="border-r border-border/60 overflow-y-auto bg-card/20">
          <div className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Posts · {posts.length}</div>
          {posts.map(p => (
            <button key={p.id} onClick={() => open(p.id)}
              className={`group w-full text-left px-4 py-2.5 text-sm border-l-2 transition-all hover:bg-emerald-500/[0.04] ${
                editing?.id === p.id ? "border-emerald-400 bg-emerald-500/[0.06]" : "border-transparent"
              }`}>
              <div className="truncate font-medium">{p.title}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot(p.status)}`} />
                {p.status} · /{p.slug}
              </div>
            </button>
          ))}
          {drafts.length > 0 && (
            <>
              <div className="px-4 py-3 mt-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                <Cpu className="w-3 h-3" /> AI queue · {drafts.length}
              </div>
              {drafts.map((d: any) => (
                <div key={d.id} className="px-4 py-2 text-xs text-muted-foreground border-l-2 border-transparent">
                  <div className="truncate">{d.topic}</div>
                </div>
              ))}
            </>
          )}
        </aside>

        {/* Editor + preview */}
        <main className="min-w-0">
          {!editing ? (
            <EmptyState />
          ) : (
            <div className="h-full">
              <div className="border-b border-border/40 px-5 py-2 flex items-center gap-2">
                <ViewToggle view={view} setView={setView} />
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">{intel.words} words</span>
              </div>
              <div className={`grid ${view === "split" ? "lg:grid-cols-2" : "grid-cols-1"} gap-0`}>
                {view !== "preview" && (
                  <div className="p-5 space-y-4 border-r border-border/40">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Field label="Title"><Input value={editing.title ?? ""} onChange={e => setEditing({ ...editing, title: e.target.value })} /></Field>
                      <Field label="Slug"><Input value={editing.slug ?? ""} onChange={e => setEditing({ ...editing, slug: e.target.value })} /></Field>
                      <Field label="Meta title (30–65)"><Input value={editing.meta_title ?? ""} onChange={e => setEditing({ ...editing, meta_title: e.target.value })} /></Field>
                      <Field label="Focus keyword"><Input value={editing.focus_keyword ?? ""} onChange={e => setEditing({ ...editing, focus_keyword: e.target.value })} /></Field>
                    </div>
                    <Field label="Meta description (70–165)">
                      <Textarea rows={2} value={editing.meta_description ?? ""} onChange={e => setEditing({ ...editing, meta_description: e.target.value })} />
                    </Field>
                    <Field label="Excerpt">
                      <Textarea rows={2} value={editing.excerpt ?? ""} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} />
                    </Field>

                    {/* Hero image card */}
                    <HeroCard
                      url={editing.hero_image}
                      onUrl={(v) => setEditing({ ...editing, hero_image: v })}
                      generating={generatingHero}
                      onRegenerate={regenerateHero}
                      style={heroStyle}
                      onStyle={setHeroStyle}
                    />

                    <Field label="Body (Markdown)">
                      <Textarea rows={20} className="font-mono text-sm bg-card/40" value={editing.body_md ?? ""} onChange={e => setEditing({ ...editing, body_md: e.target.value })} />
                    </Field>

                    {issues.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                        <div className="font-medium mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Editorial checks</div>
                        <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">{issues.map((i, k) => <li key={k}>{i}</li>)}</ul>
                      </motion.div>
                    )}
                  </div>
                )}

                {view !== "edit" && (
                  <div className="p-5 lg:sticky lg:top-[14rem] lg:self-start lg:max-h-[calc(100vh-15rem)] lg:overflow-auto">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-3 flex items-center gap-1.5">
                      <Eye className="w-3 h-3" /> Live preview
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur shadow-sm overflow-hidden">
                      {editing.hero_image && (
                        <img src={editing.hero_image} alt="" className="w-full aspect-[16/9] object-cover" />
                      )}
                      <div className="p-5">
                        <h1 className="font-display text-2xl font-bold tracking-tight">{editing.title || "Untitled"}</h1>
                        {editing.excerpt && <p className="mt-2 text-sm text-muted-foreground">{editing.excerpt}</p>}
                        <div className="prose prose-sm prose-invert max-w-none mt-4">
                          <ReactMarkdown>{editing.body_md || "_Start writing to see the live preview…_"}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Intelligence sidebar */}
        {editing && (
          <aside className="border-l border-border/60 bg-card/20 p-4 space-y-3 lg:sticky lg:top-[14rem] lg:self-start lg:max-h-[calc(100vh-15rem)] lg:overflow-auto">
            <SectionTitle icon={<Activity className="w-3.5 h-3.5" />}>Editorial intelligence</SectionTitle>
            <Signal label="Focus keyword"   value={intel.kw}      tone="emerald" icon={<Target className="w-3 h-3" />} />
            <Signal label="Readability"     value={intel.read}    tone="blue"    icon={<FileText className="w-3 h-3" />} />
            <Signal label="Authority"       value={intel.authority} tone="violet" icon={<TrendingUp className="w-3 h-3" />} />
            <Signal label="Semantic depth"  value={intel.semantic} tone="amber"  icon={<Network className="w-3 h-3" />} />
            <Signal label="CTA strength"    value={intel.cta}     tone="pink"    icon={<Rocket className="w-3 h-3" />} />

            <SectionTitle icon={<Network className="w-3.5 h-3.5" />}>Linking</SectionTitle>
            <KV k="Internal links" v={String(intel.links)} good={intel.links >= 2} />
            <KV k="Orphan risk" v={intel.orphan ? "high" : "low"} good={!intel.orphan} />
            <KV k="Cluster" v={intel.cluster} />

            <SectionTitle icon={<Gauge className="w-3.5 h-3.5" />}>CTA / monetization</SectionTitle>
            <KV k="Est. conversion" v={`${Math.round(intel.cta * 0.6)}%`} />
            <KV k="RPM est." v={`$${(intel.semantic / 25).toFixed(1)}`} />
            <KV k="Ad-safe" v={intel.read > 50 ? "yes" : "review"} good={intel.read > 50} />

            <SectionTitle icon={<Zap className="w-3.5 h-3.5" />}>Indexing</SectionTitle>
            <KV k="Index ready" v={intel.indexReady ? "yes" : "missing fields"} good={intel.indexReady} />

            {/* Floating publish rail */}
            <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 p-3 border-t border-border/60 bg-background/95 backdrop-blur rounded-b-xl">
              <div className="flex flex-col gap-1.5">
                <Button onClick={save} disabled={busy} className="w-full justify-start">
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={validate} disabled={busy} className="w-full justify-start">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Run editorial checks
                </Button>
                <Button variant="outline" size="sm" onClick={() => transition("in_review")} disabled={busy} className="w-full justify-start">
                  <Send className="w-3.5 h-3.5 mr-2" /> Send to review
                </Button>
                <Button onClick={() => transition("published")} disabled={busy}
                  className="w-full justify-start bg-gradient-to-r from-emerald-500 to-emerald-400 text-emerald-950 hover:from-emerald-400 hover:to-emerald-300">
                  <Rocket className="w-3.5 h-3.5 mr-2" /> Publish now
                </Button>
                <p className="text-[10px] text-muted-foreground font-mono mt-1.5 text-center">status · {editing.status}</p>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* =================== sub-components =================== */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</Label>
      {children}
    </div>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono transition-colors ${
        ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
           : "border-border/60 bg-card/40 text-muted-foreground"
      }`}
    >
      <span className="relative flex w-1.5 h-1.5">
        <span className={`absolute inset-0 rounded-full ${ok ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
        {ok && <motion.span className="absolute inset-0 rounded-full bg-emerald-400" animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }} transition={{ repeat: Infinity, duration: 2 }} />}
      </span>
      {label}
    </motion.span>
  );
}

function PipelineFlow({ currentStatus }: { currentStatus?: string }) {
  const idx = Math.max(0, PIPELINE.findIndex(p => p.key === currentStatus));
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {PIPELINE.map((p, i) => {
        const passed = i <= idx; const active = i === idx;
        return (
          <div key={p.key} className="flex items-center gap-1 shrink-0">
            <div className={`relative flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-mono transition-all ${
              active ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                     : passed ? "text-foreground" : "text-muted-foreground"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${passed ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
              {p.label}
              {active && <motion.span className="absolute -inset-px rounded-md ring-1 ring-emerald-400/40" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} />}
            </div>
            {i < PIPELINE.length - 1 && (
              <ChevronRight className={`w-3 h-3 ${i < idx ? "text-emerald-400" : "text-muted-foreground/40"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Metric({ label, value, pulse, small }: { label: string; value: any; pulse?: boolean; small?: boolean }) {
  return (
    <motion.div whileHover={{ y: -1 }}
      className="relative rounded-lg border border-border/40 bg-card/40 backdrop-blur p-3 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
        <div className={`mt-0.5 font-mono font-semibold ${small ? "text-sm truncate" : "text-xl"}`}>{value ?? "—"}</div>
        {pulse && <motion.span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.6 }} />}
      </div>
    </motion.div>
  );
}

function ViewToggle({ view, setView }: { view: string; setView: (v: any) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border/60 bg-card/40 p-0.5 text-[11px]">
      {(["edit", "split", "preview"] as const).map(v => (
        <button key={v} onClick={() => setView(v)}
          className={`px-2.5 py-1 rounded-sm font-mono capitalize transition-colors ${
            view === v ? "bg-emerald-500/15 text-emerald-300" : "text-muted-foreground hover:text-foreground"
          }`}>{v}</button>
      ))}
    </div>
  );
}

function HeroCard({
  url, onUrl, generating, onRegenerate, style, onStyle,
}: { url?: string; onUrl: (v: string) => void; generating: boolean; onRegenerate: () => void; style: string; onStyle: (s: any) => void }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur overflow-hidden">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-emerald-500/10 via-violet-500/5 to-transparent flex items-center justify-center">
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
            <ImageIcon className="w-6 h-6" /> No hero yet
          </div>
        )}
        {generating && (
          <motion.div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-xs font-mono"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-emerald-300">generating · {style}</span>
            <motion.div className="h-0.5 w-32 bg-emerald-500/20 overflow-hidden rounded-full">
              <motion.div className="h-full bg-emerald-400" animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 1.4 }} style={{ width: "40%" }} />
            </motion.div>
          </motion.div>
        )}
      </div>
      <div className="p-3 flex flex-wrap items-center gap-2 border-t border-border/40">
        <div className="flex flex-wrap gap-1">
          {HERO_STYLES.map(s => (
            <button key={s} onClick={() => onStyle(s)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                style === s ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}>{s}</button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={onRegenerate} disabled={generating} className="ml-auto">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${generating ? "animate-spin" : ""}`} /> Regenerate
        </Button>
      </div>
      <div className="px-3 pb-3">
        <Input value={url ?? ""} onChange={e => onUrl(e.target.value)} placeholder="or paste hero URL" className="text-xs" />
      </div>
    </div>
  );
}

function Signal({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-500 to-emerald-400 text-emerald-300",
    blue:    "from-blue-500 to-blue-400 text-blue-300",
    violet:  "from-violet-500 to-violet-400 text-violet-300",
    amber:   "from-amber-500 to-amber-400 text-amber-300",
    pink:    "from-pink-500 to-pink-400 text-pink-300",
  };
  const v = Math.round(Math.max(0, Math.min(100, value)));
  return (
    <div className="rounded-md border border-border/40 bg-card/30 p-2.5">
      <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
        <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
        <span className={`font-semibold ${colors[tone].split(" ").slice(-1)[0]}`}>{v}</span>
      </div>
      <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.6 }}
          className={`h-full rounded-full bg-gradient-to-r ${colors[tone].split(" text-")[0]}`} />
      </div>
    </div>
  );
}

function KV({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[11px] font-mono px-1">
      <span className="text-muted-foreground">{k}</span>
      <span className={good === undefined ? "" : good ? "text-emerald-300" : "text-amber-300"}>{v}</span>
    </div>
  );
}

function SectionTitle({ icon, children }: any) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono pt-2">
      {icon}{children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full grid place-items-center p-12">
      <div className="text-center max-w-sm">
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3 }}
          className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-violet-500/10 border border-emerald-500/20 grid place-items-center">
          <Lightbulb className="w-6 h-6 text-emerald-300" />
        </motion.div>
        <h3 className="font-display font-semibold">Pick a post or start a new one</h3>
        <p className="text-sm text-muted-foreground mt-1.5">Generate an AI draft, or hand-craft a piece. Live previews and editorial intelligence load alongside your edits.</p>
      </div>
    </div>
  );
}

/* =================== helpers =================== */

function statusDot(s?: string) {
  switch (s) {
    case "published": return "bg-emerald-400";
    case "scheduled": return "bg-violet-400";
    case "in_review": return "bg-amber-400";
    case "draft":     return "bg-blue-400";
    default:          return "bg-muted-foreground/40";
  }
}
function isToday(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
function withinDays(iso?: string, days = 7) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < days * 86400000;
}
function topCluster(posts: any[]) {
  const m = new Map<string, number>();
  posts.forEach(p => { const c = p.category || "general"; m.set(c, (m.get(c) ?? 0) + 1); });
  let best = "—", n = 0; m.forEach((v, k) => { if (v > n) { n = v; best = k; } });
  return best;
}