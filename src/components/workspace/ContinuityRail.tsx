import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ScrollText, FileSignature, Sparkles, FileText, History, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listArtifacts, type ArtifactRow } from "@/lib/artifacts/api";

type Slot = {
  key: string;
  label: string;
  cta: string;
  href: string;
  icon: any;
  artifact: ArtifactRow | null;
};

function pick(rows: ArtifactRow[], match: (r: ArtifactRow) => boolean): ArtifactRow | null {
  return rows.find(match) || null;
}

function hrefFor(a: ArtifactRow, fallback: string): string {
  const meta: any = a.metadata || {};
  if (meta.hustle_slug && /roadmap/i.test(a.artifact_type)) return `/hustle/${meta.hustle_slug}`;
  return fallback;
}

export default function ContinuityRail() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ArtifactRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listArtifacts({ limit: 50 }).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;
  if (rows === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-2 text-sm text-foreground/70">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your continuity stream…
      </div>
    );
  }
  if (rows.length === 0) return null;

  const latestRoadmap = pick(rows, (r) => /roadmap/i.test(r.artifact_type) || /roadmap/i.test(r.source_module));
  const latestProposal = pick(rows, (r) => /proposal/i.test(r.artifact_type) || /proposal/i.test(r.source_module));
  const latestWorkspace = pick(rows, (r) => /workspace/i.test(r.source_module) || /workspace_doc/i.test(r.artifact_type));
  const latestAi = pick(rows, (r) => /hustlebot|ai_/i.test(r.source_module) || /ai_/i.test(r.artifact_type));
  const latestAny = rows[0] || null;

  const slots: Slot[] = [
    { key: "roadmap",   label: "Latest roadmap",   cta: "Reopen roadmap",     href: latestRoadmap ? hrefFor(latestRoadmap, "/explore") : "/explore", icon: ScrollText,    artifact: latestRoadmap },
    { key: "proposal",  label: "Latest proposal",  cta: "Continue proposal",  href: "/work/proposals",                                                icon: FileSignature, artifact: latestProposal },
    { key: "workspace", label: "Workspace",        cta: "Resume workspace",   href: "/workspace",                                                     icon: FileText,      artifact: latestWorkspace },
    { key: "ai",        label: "AI workflow",      cta: "Continue with AI",   href: "/hustlebot",                                                     icon: Sparkles,      artifact: latestAi },
    { key: "any",       label: "Latest artifact",  cta: "Open latest",        href: "/settings/exports",                                              icon: History,       artifact: latestAny },
  ].filter((s) => s.artifact);

  if (!slots.length) return null;

  return (
    <section aria-label="Continue where you left off" className="rounded-xl border border-border bg-card p-4">
      <header className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <History className="h-4 w-4 text-primary" /> Continue where you left off
          </h3>
          <p className="text-xs text-foreground/65 mt-0.5">Your recent operational outputs — pick up the workflow.</p>
        </div>
        <Link to="/settings/exports" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
          All artifacts <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((s, idx) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
          >
            <Link
              to={s.href}
              className="group flex items-start gap-3 rounded-lg border border-border bg-background hover:bg-muted/40 hover:border-primary/40 p-3 transition"
            >
              <div className="h-9 w-9 rounded-md bg-primary/15 text-primary ring-1 ring-primary/25 flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-foreground/60">{s.label}</div>
                <div className="text-sm font-medium text-foreground truncate">{s.artifact!.title}</div>
                <div className="text-[11px] text-foreground/65 truncate">
                  {new Date(s.artifact!.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {" · "}{s.artifact!.source_module}
                </div>
              </div>
              <div className="text-primary opacity-0 group-hover:opacity-100 transition self-center">
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
            <div className="mt-1 px-1 text-[10px] text-foreground/55">{s.cta}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}