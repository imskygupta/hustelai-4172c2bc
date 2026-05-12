import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles, RadioTower, ArrowLeft, Activity, AlertTriangle, Wand2, Network, ShieldAlert, DollarSign, Search, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { blogApi } from "@/integrations/blog/client";

type Card = {
  id: string; slug: string; title: string; status: string;
  updated_at?: string; published_at?: string; scheduled_at?: string;
  focus_keyword?: string; words: number; inbound: number; authority: number; stage_age_days: number;
};

const STAGES: { key: string; label: string; tone: string }[] = [
  { key: "ideas",            label: "Ideas",          tone: "bg-muted/40" },
  { key: "drafting",         label: "Drafting",       tone: "bg-blue-500/10" },
  { key: "internal_review",  label: "Internal Review",tone: "bg-amber-500/10" },
  { key: "scheduled",        label: "Scheduled",      tone: "bg-violet-500/10" },
  { key: "published",        label: "Published",      tone: "bg-emerald-500/10" },
  { key: "needs_refresh",    label: "Needs Refresh",  tone: "bg-orange-500/10" },
  { key: "decaying",         label: "Decaying",       tone: "bg-red-500/10" },
];

const REFRESH_INTENTS: { key: string; label: string }[] = [
  { key: "refresh", label: "Refresh plan" },
  { key: "rewrite_intro", label: "Rewrite intro" },
  { key: "improve_title", label: "Better title" },
  { key: "regen_meta", label: "Regen meta" },
  { key: "add_faq", label: "Add FAQ" },
  { key: "expand_depth", label: "Expand depth" },
  { key: "inject_cta", label: "Inject CTA" },
];

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function EditorialCenter() {
  const location = useLocation();
  const focus = (() => {
    const p = location.pathname;
    if (p.endsWith("/pipeline")) return "pipeline";
    if (p.endsWith("/topics")) return "topics";
    if (p.endsWith("/linking")) return "linking";
    if (p.endsWith("/indexing")) return "indexing";
    return "";
  })();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(0);
  const [refreshOut, setRefreshOut] = useState<{ post: Card; intent: string; output: string } | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [indexingSlug, setIndexingSlug] = useState<string>("");
  const [indexResult, setIndexResult] = useState<any>(null);
  const [indexBusy, setIndexBusy] = useState(false);
  const [trafficCsv, setTrafficCsv] = useState("");
  const [trafficRows, setTrafficRows] = useState<any[]>([]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await blogApi.editorialOverview();
      if ((r as any)?.ok === false) throw new Error((r as any).error);
      setData(r);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!focus || loading) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`section-${focus}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, [focus, loading]);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => (p + 1) % 1000), 2400);
    return () => clearInterval(t);
  }, []);

  const runRefresh = async (post: Card, intent: string) => {
    setRefreshing(post.id + intent);
    try {
      const r: any = await blogApi.editorialAiRefresh(post.id, intent);
      if (r.ok === false) throw new Error(r.error);
      setRefreshOut({ post, intent, output: r.output });
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    } finally { setRefreshing(null); }
  };

  const runIndexing = async () => {
    if (!indexingSlug) return;
    setIndexBusy(true);
    try {
      const r = await blogApi.editorialIndexing(indexingSlug.trim().replace(/^\//, ""));
      setIndexResult(r);
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
    finally { setIndexBusy(false); }
  };

  const recrawl = async (slug: string) => {
    try {
      const r = await blogApi.editorialRecrawl(slug);
      if ((r as any).ok) toast.success(`Recrawl queued: /${slug}`);
      else toast.error("Recrawl failed");
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
  };

  const parseCsv = () => {
    const lines = trafficCsv.trim().split(/\r?\n/);
    if (!lines.length) return setTrafficRows([]);
    const header = lines[0].split(",").map(s => s.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const cells = line.split(",").map(s => s.trim());
      const obj: Record<string, string> = {};
      header.forEach((h, i) => obj[h] = cells[i] ?? "");
      return obj;
    }).filter(r => Object.values(r).some(Boolean));
    setTrafficRows(rows);
  };

  const trafficStats = useMemo(() => {
    if (!trafficRows.length) return null;
    const num = (v: any) => Number(String(v ?? "").replace(/[%,]/g, "")) || 0;
    let imp = 0, clk = 0; let topQuery = ""; let topImp = 0;
    for (const r of trafficRows) {
      imp += num(r.impressions ?? r.impr ?? r.imp);
      clk += num(r.clicks ?? r.click);
      const q = r.query ?? r.keyword ?? r.page ?? "";
      const i = num(r.impressions ?? r.impr);
      if (i > topImp) { topImp = i; topQuery = q; }
    }
    return { imp, clk, ctr: imp ? +(clk / imp * 100).toFixed(2) : 0, topQuery };
  }, [trafficRows]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/blog/operations"><ArrowLeft className="w-4 h-4 mr-1" /> Operations</Link>
            </Button>
            <div>
              <h1 className="text-lg font-display font-bold tracking-tight flex items-center gap-2">
                <RadioTower className="w-4 h-4 text-emerald-400" />
                Editorial Command Center
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                blogs.hustlaiapp.in · live signal {data?.generated_at ? `· ${timeAgo(data.generated_at)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2.4 }}
              className="w-2 h-2 rounded-full bg-emerald-400"
              key={pulse}
            />
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-4 h-4" /> {error}</div>
              <Button size="sm" variant="outline" onClick={load}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {/* Top counters */}
        {data?.counts && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { l: "Posts", v: data.counts.total },
              { l: "Published", v: data.counts.published },
              { l: "Drafts", v: data.counts.drafts },
              { l: "Orphans", v: data.counts.orphans },
              { l: "Decaying", v: data.counts.decaying },
              { l: "Clusters", v: data.counts.clusters },
            ].map(c => (
              <Card key={c.l} className="bg-card/60">
                <CardContent className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.l}</div>
                  <div className="text-2xl font-mono font-semibold">{c.v}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 1. Pipeline */}
        <Section anchor="pipeline" icon={<Activity className="w-4 h-4" />} title="Editorial Pipeline" subtitle="Stage by stage. Cards age in place.">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {STAGES.map(s => {
              const items: Card[] = data?.pipeline?.[s.key] ?? [];
              return (
                <div key={s.key} className={`rounded-lg border border-border/50 ${s.tone} p-2 min-h-[180px]`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                    <Badge variant="outline" className="font-mono text-[10px]">{items.length}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {items.slice(0, 8).map(p => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md bg-background/60 border border-border/40 p-2 text-xs"
                      >
                        <div className="font-medium line-clamp-2 leading-snug">{p.title}</div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span>{p.words}w</span>
                          <span>{p.stage_age_days === Infinity ? "—" : `${p.stage_age_days}d`}</span>
                        </div>
                      </motion.div>
                    ))}
                    {items.length > 8 && (
                      <div className="text-[10px] text-muted-foreground text-center pt-1">+{items.length - 8} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* 3. SEO Decay */}
        <Section icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} title="SEO Decay Detection" subtitle="Highest decay first. Click an action to push through the AI Refresh Engine.">
          {!data?.decay?.length ? <Empty msg="No decaying posts." /> : (
            <ScrollArea className="max-h-[420px]">
              <div className="space-y-2">
                {data.decay.map((d: any) => (
                  <div key={d.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-md border border-border/40 bg-card/40 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{d.title}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">/{d.slug} · auth {d.authority} · in {d.inbound}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {d.reasons.map((r: string) => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="font-mono" variant={d.score >= 60 ? "destructive" : "outline"}>decay {d.score}</Badge>
                      <div className="flex flex-wrap gap-1">
                        {REFRESH_INTENTS.slice(0, 4).map(i => (
                          <Button key={i.key} size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
                            onClick={() => runRefresh(d, i.key)} disabled={refreshing === d.id + i.key}>
                            {refreshing === d.id + i.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                            {i.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Section>

        {/* 4. AI Refresh output */}
        {refreshOut && (
          <Section icon={<Wand2 className="w-4 h-4 text-violet-400" />} title="AI Refresh Output" subtitle={`${refreshOut.intent} · /${refreshOut.post.slug}`}>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded-md max-h-[420px] overflow-auto">{refreshOut.output}</pre>
            <div className="flex justify-end gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(refreshOut.output).then(() => toast.success("Copied"))}>Copy</Button>
              <Button size="sm" variant="ghost" onClick={() => setRefreshOut(null)}>Close</Button>
            </div>
          </Section>
        )}

        {/* 5. Authority Layer */}
        <Section anchor="linking" icon={<Network className="w-4 h-4 text-blue-400" />} title="Authority Layer · Internal Linking" subtitle="PageRank-lite, clusters, orphans.">
          <div className="grid md:grid-cols-3 gap-3">
            <Panel title="Top Authority">
              {(data?.authority?.top ?? []).map((t: any) => (
                <RowLine key={t.slug} left={`/${t.slug}`} right={`auth ${t.score} · ←${t.inbound}`} />
              ))}
            </Panel>
            <Panel title="Orphans">
              {(data?.authority?.orphans ?? []).slice(0, 12).map((o: any) => (
                <RowLine key={o.slug} left={o.title || `/${o.slug}`} right={`${o.age_days}d`} />
              ))}
              {!data?.authority?.orphans?.length && <Empty msg="No orphans." />}
            </Panel>
            <Panel title="Topical Clusters">
              {(data?.authority?.clusters ?? []).slice(0, 8).map((c: any, i: number) => (
                <div key={i} className="text-xs mb-2">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{c.slugs.length} posts</div>
                </div>
              ))}
              {!data?.authority?.clusters?.length && <Empty msg="No clusters." />}
            </Panel>
          </div>
        </Section>

        {/* 6. Humanization */}
        <Section icon={<Wand2 className="w-4 h-4 text-pink-400" />} title="Humanization Layer" subtitle="Pre-publish AI-tone scrub. Pick a post from the pipeline and run.">
          <HumanizeTool posts={[...((data?.pipeline?.drafting) ?? []), ...((data?.pipeline?.internal_review) ?? [])]} />
        </Section>

        {/* 7. Guardrails */}
        <Section icon={<ShieldAlert className="w-4 h-4 text-red-400" />} title="Programmatic SEO Guardrails" subtitle="Catch cannibalization, stuffing, thin pages.">
          <div className="grid md:grid-cols-3 gap-3">
            <Panel title="Duplicate titles">
              {(data?.guardrails?.dupTitles ?? []).slice(0, 6).map((d: any) => (
                <div key={d.value} className="text-xs mb-2">
                  <div className="truncate">{d.value}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{d.slugs.length} pages</div>
                </div>
              ))}
              {!data?.guardrails?.dupTitles?.length && <Empty msg="None." />}
            </Panel>
            <Panel title="Cannibalization (focus kw)">
              {(data?.guardrails?.dupKw ?? []).slice(0, 6).map((d: any) => (
                <div key={d.value} className="text-xs mb-2">
                  <div className="truncate">{d.value}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{d.slugs.join(", ")}</div>
                </div>
              ))}
              {!data?.guardrails?.dupKw?.length && <Empty msg="None." />}
            </Panel>
            <Panel title="Stuffing & thin">
              {(data?.guardrails?.stuffing ?? []).slice(0, 5).map((s: any, i: number) => (
                <RowLine key={i} left={`/${s.slug}`} right={`${s.word} ${s.density}%`} />
              ))}
              {(data?.guardrails?.thin ?? []).slice(0, 5).map((s: any, i: number) => (
                <RowLine key={"t"+i} left={`/${s.slug}`} right={`${s.words}w (thin)`} />
              ))}
              {(data?.guardrails?.overOpt ?? []).slice(0, 4).map((s: any, i: number) => (
                <RowLine key={"o"+i} left={`/${s.slug}`} right={`anchor ${Math.round(s.ratio*100)}%`} />
              ))}
            </Panel>
          </div>
        </Section>

        {/* 8. Monetization */}
        <Section icon={<DollarSign className="w-4 h-4 text-emerald-400" />} title="Monetization Readiness" subtitle="Per-article ad-safe, CTA, RPM, scroll depth.">
          {!data?.monetization?.length ? <Empty msg="Publish posts to see monetization signals." /> : (
            <ScrollArea className="max-h-[360px]">
              <table className="w-full text-xs font-mono">
                <thead className="text-[10px] uppercase text-muted-foreground">
                  <tr><th className="text-left p-1">Slug</th><th className="text-right p-1">Ad-safe</th><th className="text-right p-1">CTA</th><th className="text-right p-1">RPM est</th><th className="text-right p-1">Scroll</th><th className="text-right p-1">Aff</th></tr>
                </thead>
                <tbody>
                  {data.monetization.slice(0, 30).map((m: any) => (
                    <tr key={m.id} className="border-t border-border/30">
                      <td className="p-1 truncate max-w-[260px]">/{m.slug}</td>
                      <td className="p-1 text-right">{m.ad_safe}</td>
                      <td className="p-1 text-right">{m.cta_score}</td>
                      <td className="p-1 text-right">${m.rpm_est}</td>
                      <td className="p-1 text-right">{m.scroll_depth_est}%</td>
                      <td className="p-1 text-right">{m.affiliate_blocks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </Section>

        {/* 9. Indexing Ops */}
        <Section icon={<Search className="w-4 h-4 text-cyan-400" />} title="Indexing Ops" subtitle="Probe Bing, Google, Yandex per slug. Manual recrawl via IndexNow.">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Input value={indexingSlug} onChange={e => setIndexingSlug(e.target.value)} placeholder="post-slug"
              className="max-w-[260px] h-8 font-mono text-xs" />
            <Button size="sm" onClick={runIndexing} disabled={indexBusy || !indexingSlug}>
              {indexBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Probe"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => recrawl(indexingSlug)} disabled={!indexingSlug}>Recrawl</Button>
          </div>
          {indexResult && (
            <div className="grid md:grid-cols-3 gap-3 text-xs font-mono">
              {(["bing", "google", "yandex"] as const).map(k => (
                <div key={k} className="rounded-md border border-border/40 p-3 bg-card/40">
                  <div className="uppercase text-[10px] text-muted-foreground">{k}</div>
                  <div className={indexResult[k]?.ok ? "text-emerald-400" : "text-orange-400"}>
                    {indexResult[k]?.ok ? "reachable" : "unreachable"} · {indexResult[k]?.status ?? "—"}
                  </div>
                </div>
              ))}
              <div className="md:col-span-3 text-[11px] text-muted-foreground">
                Last IndexNow ping: {indexResult.last_ping ? timeAgo(indexResult.last_ping) : "—"}
              </div>
            </div>
          )}
        </Section>

        {/* 10. Traffic Intelligence (CSV) */}
        <Section icon={<Gauge className="w-4 h-4 text-amber-400" />} title="Traffic Intelligence" subtitle="Paste GSC export rows (CSV) — parsed locally, never persisted.">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Textarea rows={8} className="font-mono text-xs"
                value={trafficCsv}
                onChange={e => setTrafficCsv(e.target.value)}
                placeholder={"query,impressions,clicks,ctr,position\nai blog tools,1240,42,3.39%,8.2"} />
              <div className="flex justify-end mt-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => { setTrafficCsv(""); setTrafficRows([]); }}>Clear</Button>
                <Button size="sm" onClick={parseCsv}>Parse</Button>
              </div>
            </div>
            <div className="rounded-md border border-border/40 bg-card/40 p-3 text-xs font-mono">
              {trafficStats ? (
                <div className="space-y-1">
                  <RowLine left="Impressions" right={trafficStats.imp.toLocaleString()} />
                  <RowLine left="Clicks" right={trafficStats.clk.toLocaleString()} />
                  <RowLine left="CTR" right={`${trafficStats.ctr}%`} />
                  <RowLine left="Top query" right={trafficStats.topQuery || "—"} />
                  <RowLine left="Rows parsed" right={String(trafficRows.length)} />
                </div>
              ) : <Empty msg="Paste CSV to compute aggregates." />}
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({ icon, title, subtitle, children, anchor }: any) {
  return (
    <Card id={anchor ? `section-${anchor}` : undefined} className="bg-card/40 border-border/50 scroll-mt-24">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          {icon}{title}
        </CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Panel({ title, children }: any) {
  return (
    <div className="rounded-md border border-border/40 bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function RowLine({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs font-mono">
      <span className="truncate">{left}</span>
      <span className="text-muted-foreground shrink-0">{right}</span>
    </div>
  );
}
function Empty({ msg }: { msg: string }) {
  return <p className="text-xs text-muted-foreground italic">{msg}</p>;
}

function HumanizeTool({ posts }: { posts: Card[] }) {
  const [pid, setPid] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string>("");

  const run = async () => {
    if (!pid) return;
    setBusy(true);
    try {
      const r: any = await blogApi.editorialHumanize({ id: pid });
      if (r.ok === false) throw new Error(r.error);
      setOut(r.humanized);
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select value={pid} onChange={e => setPid(e.target.value)}
          className="bg-background border border-border/60 rounded-md px-2 py-1 text-xs font-mono max-w-[420px]">
          <option value="">— pick a draft —</option>
          {posts.map(p => <option key={p.id} value={p.id}>{p.title.slice(0, 80)}</option>)}
        </select>
        <Button size="sm" onClick={run} disabled={busy || !pid}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />} Humanize
        </Button>
        {out && <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(out).then(() => toast.success("Copied"))}>Copy</Button>}
      </div>
      {out && (
        <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded-md max-h-[360px] overflow-auto">{out}</pre>
      )}
    </div>
  );
}