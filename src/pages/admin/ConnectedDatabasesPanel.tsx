// Admin → Infrastructure → Connected Databases
// Static, audited summary of every Supabase project HustleAI currently uses.
// Source of truth: src/integrations/*/client.ts, supabase/functions/_shared/clients.ts,
// mem/transfer/operational-continuity.md, and Railway worker env (workers/telegram).
// Update this file when a new DB is wired or a project is migrated.
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  name: string;
  ref: string;
  owner: "Lovable Cloud (managed)" | "HustleAI self-owned" | "HustleAI (legacy account)";
  dashboardAccess: "Yes" | "No (Lovable-managed)" | "Pending key rotation";
  productionCritical: boolean;
  purpose: string;
  edgeFunctions: string[];
  frontendClients: string[];
  safeToMigrate: "Already owned" | "Yes — planned (Tier 3)" | "Yes — Tier 1 (in progress)" | "No — auth stays on Lovable Cloud" | "Yes — low risk";
  notes?: string;
};

const DBS: Row[] = [
  {
    name: "DB1 — Primary (Lovable Cloud)",
    ref: "vbnqaovxatucrgtnggea",
    owner: "Lovable Cloud (managed)",
    dashboardAccess: "No (Lovable-managed)",
    productionCritical: true,
    purpose:
      "auth.users, profiles, user_roles, subscriptions, wallets, payment_orders, feature_flags, intake (preview side), exports, telegram link tokens. Source of JWT identity for every other DB.",
    edgeFunctions: [
      "ALL functions using getPrimary/getPrimaryService (~80+)",
      "dodo-*, cashfree-payment, send-otp-email, send-welcome-email",
      "admin-utils, signup-guard, telegram-webhook, intake-api",
    ],
    frontendClients: ["@/integrations/supabase/client (default)"],
    safeToMigrate: "No — auth stays on Lovable Cloud",
    notes:
      "Migration Option A locks auth here. Tier-1 telemetry already evacuating to DB6 (owned).",
  },
  {
    name: "DB2 — Workspace / Work Hub",
    ref: "utflzmecghdtcjupgdan",
    owner: "HustleAI (legacy account)",
    dashboardAccess: "Yes",
    productionCritical: true,
    purpose:
      "Work Hub (/work/:slug), public Intake forms + analysis pipeline, workspace assets, client portals, canvas notes.",
    edgeFunctions: [
      "work-api",
      "intake-api",
      "intake-public",
      "workspace-portal",
    ],
    frontendClients: ["@/integrations/workspace/client (workspaceDb)"],
    safeToMigrate: "Yes — planned (Tier 3)",
    notes: "Anon key hardcoded in client. Move to owned org during Tier-3 product cutover.",
  },
  {
    name: "DB3 — Blog / SEO",
    ref: "ynvfxxmhowlvhtqiigfc",
    owner: "HustleAI (legacy account)",
    dashboardAccess: "Yes",
    productionCritical: true,
    purpose:
      "blog_posts, blog_categories, blog_tags, blog_authors, blog_post_revisions, blog_ai_drafts, blog_analytics_events, crawl_url_registry, crawl_log, seo_quality_checks.",
    edgeFunctions: [
      "blog-feed", "blog-post", "blog-admin", "blog-ai-draft",
      "blog-track", "blog-sitemap", "blog-seo-health", "blog-link-engine",
      "blog-scheduler", "blog-bootstrap", "blog-image-pipeline",
      "blog-intelligence", "blog-automation-audit",
      "editorial-center", "editorial-pipeline",
      "crawl-orchestrator", "indexing-dispatcher", "seo-operations",
      "authority-batch", "narrative-generate", "narrative-bootstrap",
      "knowledge-graph", "adsense-readiness",
      "hustle-templates", "tool-registry-sync", "tool-media-pipeline", "tool-matcher",
    ],
    frontendClients: ["@/integrations/blog/db (blogDb)", "@/integrations/blog/latest"],
    safeToMigrate: "Yes — planned (Tier 3)",
    notes:
      "Connected via BLOG_SUPABASE_URL + BLOG_SUPABASE_SERVICE_ROLE secrets. Migration requires re-seeding 28 edge function envs.",
  },
  {
    name: "DB4 — Community / Forum",
    ref: "qeswhaytgvosfzzgraef",
    owner: "HustleAI (legacy account)",
    dashboardAccess: "Yes",
    productionCritical: false,
    purpose:
      "forum_posts, forum_votes, community_groups, community_memberships, discord_links, mod_queue. Also currently hosts analytics fallback (analyticsDb).",
    edgeFunctions: ["discord-oauth", "discord-sync-role"],
    frontendClients: [
      "@/integrations/community/client (realtimeDb)",
      "@/integrations/analytics/client (analyticsDb)",
    ],
    safeToMigrate: "Yes — low risk",
    notes: "Analytics writes will move to DB6 once Tier-1 evacuation completes.",
  },
  {
    name: "DB5 — AI Runtime",
    ref: "larncwugkdclkhayfjle",
    owner: "HustleAI (legacy account)",
    dashboardAccess: "Yes",
    productionCritical: true,
    purpose:
      "chat_messages, ai_conversation_memory, ai_context_windows, ai_session_state. RLS-gated by primary JWT (shared sub claim).",
    edgeFunctions: [
      "ai-chatbot", "ai-search", "hustlebot pipeline",
      "any function using getAi() in _shared/clients.ts",
    ],
    frontendClients: ["@/integrations/ai/db (aiDb)"],
    safeToMigrate: "Yes — planned (Tier 3)",
    notes: "Identity is bound to DB1 auth — migration must preserve JWT signing key.",
  },
  {
    name: "DB6 — Owned Operational (self-hosted org)",
    ref: "wguuipsikboqqinqeehv",
    owner: "HustleAI self-owned",
    dashboardAccess: "Yes",
    productionCritical: true,
    purpose:
      "Phase-2 destination for Tier-1 telemetry, queues (ai_jobs, workflow_runs, notification_deliveries), DLQ/archive, audit logs, queue_health_snapshots. Worker state for Railway.",
    edgeFunctions: [
      "telemetry-router", "telemetry-evacuation-verify",
      "telemetry-autonomous-controller",
      "runtime-extraction-router", "runtime-extraction-verify",
      "production-audit", "production-incidents",
      "migration-health", "shared-link-repair",
      "any function using getOwned() in _shared/clients.ts",
    ],
    frontendClients: ["@/integrations/supabase/owned (stub — no browser writes)"],
    safeToMigrate: "Already owned",
    notes:
      "Pending: rotate OWNED_SUPABASE_SERVICE_ROLE_KEY (leaked key already invalidated). Frontend never holds credentials for this DB.",
  },
];

export function ConnectedDatabasesPanel() {
  return (
    <div className="space-y-4">
      <Card className="p-4 border-border bg-muted/30">
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">Six Supabase projects</strong> power HustleAI today.
          DB1 is Lovable-managed (no dashboard access). DB2–DB5 live in the legacy HustleAI Supabase
          account. DB6 is the self-owned org receiving Phase-2 operational extraction.
          Update <code className="text-xs">ConnectedDatabasesPanel.tsx</code> when wiring changes.
        </div>
      </Card>

      <Card className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Database</TableHead>
              <TableHead>Project Ref</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Dashboard</TableHead>
              <TableHead>Critical</TableHead>
              <TableHead>Migrate to Owned Org</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DBS.map((d) => (
              <TableRow key={d.ref}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell><code className="text-xs">{d.ref}</code></TableCell>
                <TableCell className="text-xs">
                  <Badge variant={d.owner === "HustleAI self-owned" ? "default" : d.owner.includes("Lovable") ? "destructive" : "secondary"}>
                    {d.owner}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  <Badge variant={d.dashboardAccess === "Yes" ? "default" : "outline"}>{d.dashboardAccess}</Badge>
                </TableCell>
                <TableCell>
                  {d.productionCritical
                    ? <Badge variant="destructive">critical</Badge>
                    : <Badge variant="secondary">operational</Badge>}
                </TableCell>
                <TableCell className="text-xs">{d.safeToMigrate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DBS.map((d) => (
          <Card key={d.ref} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{d.name}</div>
                <code className="text-xs text-muted-foreground">{d.ref}</code>
              </div>
              {d.productionCritical && <Badge variant="destructive">production-critical</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">{d.purpose}</div>
            <div className="text-xs">
              <div className="font-medium text-foreground mb-1">Frontend clients</div>
              <ul className="space-y-0.5">
                {d.frontendClients.map((c) => <li key={c}>• <code className="text-[10px]">{c}</code></li>)}
              </ul>
            </div>
            <div className="text-xs">
              <div className="font-medium text-foreground mb-1">Edge functions ({d.edgeFunctions.length})</div>
              <ul className="space-y-0.5 max-h-32 overflow-auto">
                {d.edgeFunctions.map((fn) => <li key={fn}>• <code className="text-[10px]">{fn}</code></li>)}
              </ul>
            </div>
            <div className="text-xs grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <div><span className="text-muted-foreground">Owner: </span>{d.owner}</div>
              <div><span className="text-muted-foreground">Dashboard: </span>{d.dashboardAccess}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Migration: </span>{d.safeToMigrate}</div>
            </div>
            {d.notes && (
              <div className="text-xs p-2 rounded bg-muted/50 text-muted-foreground">{d.notes}</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}