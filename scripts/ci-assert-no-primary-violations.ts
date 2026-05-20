#!/usr/bin/env -S deno run --allow-read
// Phase 8C — CI assertion: fail the build if any code path tries to read
// or write an extracted table via the primary Supabase client.
//
// Run locally:  deno run --allow-read scripts/ci-assert-no-primary-violations.ts
// Run in CI:    same command; exits non-zero on any finding.
//
// Heuristic scan:
//   1. Scan src/**.{ts,tsx} and supabase/functions/**.ts.
//   2. Skip files that ONLY use a non-primary client (aiDb / blogDb /
//      realtimeDb / communityDb / workspaceDb / getApi / getBlogs / getAdmin
//      / getRealtime / getCommunity / getWorkspace / getOwned).
//   3. Flag any literal `.from("<forbidden>")` or `.channel(...table:"<forbidden>"`
//      that is not preceded by one of the sibling client identifiers.
//
// This is intentionally simple and may have false positives; when that
// happens, refactor to use the sibling client (the correct fix) rather
// than suppressing the rule.

const PRIMARY_FORBIDDEN_TABLES = [
  "chat_messages","ai_conversation_memory","ai_context_windows","ai_session_state",
  "side_hustles","hustle_votes",
  "newsletter_subscribers","newsletter_issues","newsletter_sends",
  "newsletter_schedules","newsletter_capture_dismissals",
  "email_logs","email_templates",
  "blog_posts","blog_events","blog_categories",
  "seo_pages","seo_topics","seo_authors","seo_blog_posts","seo_redirects",
  "api_provider_health","admin_alerts","runtime_extraction_streams",
  "runtime_metrics","db_extraction_scores","db_heatmap_snapshots",
  "intelligence_alerts","runtime_projections","docs_pages",
  "forum_posts","forum_replies","forum_votes","community_groups","discord_links",
  "realtime_events","websocket_presence","live_sessions",
  "collaboration_state","event_fanout_queue",
];

const SIBLING_PREFIXES = [
  "aiDb", "blogDb", "realtimeDb", "communityDb", "workspaceDb", "ownedDb",
  "getApi", "getBlogs", "getAdmin", "getRealtime", "getCommunity",
  "getWorkspace", "getOwned", "getAsync", "getAnalytics",
];

const SKIP_FILES = new Set<string>([
  "src/integrations/supabase/primary-guard.ts",
  "supabase/functions/_shared/clients.ts",
  "scripts/ci-assert-no-primary-violations.ts",
]);

type Finding = { file: string; line: number; table: string; snippet: string };

async function walk(dir: string, out: string[]) {
  for await (const e of Deno.readDir(dir)) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      await walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      out.push(p);
    }
  }
}

function scan(file: string, src: string): Finding[] {
  const findings: Finding[] = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const t of PRIMARY_FORBIDDEN_TABLES) {
      const re = new RegExp(`\\.from\\((?:"|')${t}(?:"|')\\)`);
      if (!re.test(line)) continue;
      // Look back ~40 chars on this line for a sibling identifier.
      const head = line.slice(0, line.search(re));
      if (SIBLING_PREFIXES.some((s) => head.includes(s))) continue;
      findings.push({ file, line: i + 1, table: t, snippet: line.trim().slice(0, 200) });
    }
  }
  return findings;
}

const roots = ["src", "supabase/functions"];
const files: string[] = [];
for (const r of roots) {
  try { await walk(r, files); } catch { /* missing dir is fine */ }
}

const findings: Finding[] = [];
for (const f of files) {
  if (SKIP_FILES.has(f)) continue;
  const src = await Deno.readTextFile(f);
  findings.push(...scan(f, src));
}

if (findings.length === 0) {
  console.log("[primary-guard CI] OK — no forbidden primary access detected.");
  Deno.exit(0);
}

console.error(`[primary-guard CI] FAILED — ${findings.length} violation(s):`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  forbidden table "${f.table}"`);
  console.error(`    ${f.snippet}`);
}
console.error(
  "\nFix: route the call through the correct sibling client " +
    "(aiDb / blogDb / realtimeDb / workspaceDb) or the matching edge fn.",
);
Deno.exit(1);