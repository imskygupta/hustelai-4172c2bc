import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { blogApi, conversionApi } from "@/integrations/blog/client";
// Static bundling of owned-DB bootstrap scripts so admins can copy/paste
// straight into the owned project's SQL editor (no edge round-trip).
// eslint-disable-next-line import/no-unresolved
import asyncRuntimeSql from "../../../supabase/owned-db-bootstrap/async_runtime.sql?raw";
// eslint-disable-next-line import/no-unresolved
import productionStabilitySql from "../../../supabase/owned-db-bootstrap/production_stability.sql?raw";

type Source = {
  id: string;
  title: string;
  db: "BLOG_DB" | "PRIMARY_DB" | "COMMUNITY_DB" | "WORK_DB" | "OWNED_DB";
  description: string;
  load: () => Promise<{ sql: string }>;
};

const SOURCES: Source[] = [
  {
    id: "hustle-templates",
    title: "Hustle Templates + Phase 11 columns",
    db: "BLOG_DB",
    description: "Creates hustle_templates, authority_batches, and adds tool_matches / adsense_score columns to blog_posts.",
    load: async () => ({ sql: ((await conversionApi.templatesBootstrapSql()) as any).sql }),
  },
  {
    id: "crawl-orchestrator",
    title: "Crawl Orchestrator registry",
    db: "BLOG_DB",
    description: "Creates crawl_url_registry, crawl_log and crawl_freshness_audit.",
    load: async () => ({ sql: ((await blogApi.crawlBootstrapSql()) as any).sql }),
  },
  {
    id: "narrative-registry",
    title: "Tool Registry + Narrative Engine",
    db: "BLOG_DB",
    description: "Bootstraps the tool_registry, narrative_runs and supporting tables.",
    load: async () => ({ sql: ((await blogApi.registryBootstrapSql()) as any).sql ?? ((await blogApi.registryBootstrapSql()) as any).bootstrap }),
  },
  {
    id: "async-runtime",
    title: "Async Runtime DB (Wave 1)",
    db: "OWNED_DB",
    description: "Creates async_runtime schema: notification_deliveries, telegram_send_log, queue_archive, replay_history, retry_history, runtime_health_sweeps, incident_history + 90-day purge. Run on the owned project (wguuipsikboqqinqeehv).",
    load: async () => ({ sql: asyncRuntimeSql as unknown as string }),
  },
  {
    id: "production-stability",
    title: "Production Stability (ops schema)",
    db: "OWNED_DB",
    description: "Creates ops.production_incidents, runtime_health_sweeps, shared_link_audit, explore_dependency_traces. Run on the owned project.",
    load: async () => ({ sql: productionStabilitySql as unknown as string }),
  },
];

const DB_LABEL: Record<Source["db"], { color: string; href?: string; help: string }> = {
  BLOG_DB: { color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40", help: "Blog/SEO Supabase project — isolated from primary runtime." },
  PRIMARY_DB: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40", help: "Primary HustleAI runtime DB. Be careful." },
  COMMUNITY_DB: { color: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40", help: "Community / Discord forums DB." },
  WORK_DB: { color: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40", help: "Workspace / Work-OS DB." },
  OWNED_DB: { color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40", help: "Owned async runtime DB (wguuipsikboqqinqeehv)." },
};

export default function BootstrapSqlHub() {
  const [active, setActive] = useState<string>(SOURCES[0].id);
  const [sql, setSql] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string>("");

  const current = useMemo(() => SOURCES.find((s) => s.id === active)!, [active]);

  useEffect(() => {
    setSql("");
    setError("");
    setStatus("loading");
    current.load()
      .then((r) => { setSql(r.sql ?? ""); setStatus("ok"); })
      .catch((e) => { setError(String(e?.message ?? e)); setStatus("error"); });
  }, [active]);

  const copy = async () => {
    if (!sql) return;
    await navigator.clipboard.writeText(sql);
    toast({ title: "Copied", description: `Paste into ${current.db} SQL editor.` });
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-display font-bold">Bootstrap SQL Center</h1>
          <p className="text-muted-foreground mt-1">
            One place for every backend bootstrap script. Each card tells you which DB to paste it into.
          </p>
        </header>

        <div className="grid sm:grid-cols-3 gap-3">
          {SOURCES.map((s) => {
            const meta = DB_LABEL[s.db];
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`text-left rounded-xl border p-4 transition ${active === s.id ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{s.title}</div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${meta.color}`}>{s.db}</span>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-3">{s.description}</div>
              </button>
            );
          })}
        </div>

        <section className="rounded-xl border border-border/60 bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border/60">
            <div>
              <div className="font-medium">{current.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Target: <span className={`px-2 py-0.5 rounded border ${DB_LABEL[current.db].color}`}>{current.db}</span>
                <span className="ml-2">{DB_LABEL[current.db].help}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setActive(active)}>Reload</Button>
              <Button size="sm" onClick={copy} disabled={!sql}>Copy SQL</Button>
            </div>
          </div>

          <div className="p-4">
            {status === "loading" && <div className="text-sm text-muted-foreground">Loading…</div>}
            {status === "error" && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <div className="font-medium mb-1">Failed to load SQL</div>
                <div className="font-mono text-xs whitespace-pre-wrap">{error}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  If this is a CORS or 500 error, check that BLOG_SUPABASE_URL and BLOG_SUPABASE_SERVICE_ROLE secrets are set on the Cloud project.
                </div>
              </div>
            )}
            {status === "ok" && (
              <pre className="text-xs overflow-auto whitespace-pre-wrap max-h-[60vh] rounded bg-muted/40 p-3">{sql}</pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
