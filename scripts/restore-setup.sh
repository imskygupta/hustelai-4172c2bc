#!/usr/bin/env bash
# ============================================================
# HustleAI — Project restore / transfer checklist
# Use this when migrating the Lovable project to a new workspace
# so you don't lose deploy + DB + integration wiring.
# ============================================================
set -e

cat <<'NOTE'
==========================================================
HustleAI restore checklist  (read top → bottom)
==========================================================

1) GITHUB REPOSITORY  (deploys are wired to GitHub → Vercel)
   Original repo (workspace #1):  imskyguptas-projects/hustelai
   Current repo  (workspace #2):  imskygupta/hustelai-8517f2d6   ← active
   Default branch:                main
   Vercel project name:           hustelai-066dc9ff
   Vercel domains:                hustlaiapp.in, www.hustlaiapp.in

   ⚠ KNOWN GOTCHA — workspace transfers ALWAYS create a fresh GitHub repo.
   Lovable's GitHub OAuth install is per-workspace, so the old repo cannot
   be re-linked from a new workspace. After every transfer you MUST repoint
   Vercel at the new repo:
     1. Vercel → hustelai-066dc9ff → Settings → Git → Disconnect
     2. Connect → pick the new repo shown above → branch: main
     3. Domain (hustlaiapp.in) stays attached — no DNS change needed
     4. Trigger a redeploy from the latest commit

2) PRIMARY SUPABASE  (Lovable Cloud — auth, profiles, billing)
   Project ref:       vbnqaovxatucrgtnggea
   URL:               https://vbnqaovxatucrgtnggea.supabase.co
   Anon key (.env):   VITE_SUPABASE_PUBLISHABLE_KEY (auto-injected by Lovable)
   This is automatic — Lovable Cloud rewires .env on workspace transfer.

3) SECONDARY SUPABASE  (workspace + Work Hub data)
   Project URL:       https://utflzmecghdtcjupgdan.supabase.co
   Anon key:          hard-coded in src/integrations/workspace/client.ts
   Tables required:   work_invoices, work_checklists, work_daily_logs,
                      work_clients, work_time_entries, work_files,
                      work_notes, work_expenses, work_comm_logs,
                      work_deadlines, work_portals, workspace_clients,
                      canvas_notes, intake_forms, intake_submissions,
                      workspace_assets, client_portal_links
   Storage buckets:   intake-uploads (private)
   Setup SQL:         src/lib/work-sql.ts (WORK_SETUP_SQL, CANVAS_SETUP_SQL,
                      WORKSPACES_SETUP_SQL) — already exposed in
                      /admin-dashboard → SQL Setup tab (copy + paste in
                      hustl-production SQL editor).

4) TERTIARY SUPABASE  (community + forum + Discord links)
   Project URL:       https://qeswhaytgvosfzzgraef.supabase.co
   Anon key:          hard-coded in src/integrations/community/client.ts
   Tables required:   forum_posts, forum_votes, community_groups,
                      community_memberships, discord_links, mod_queue
   Used by edge fns:  discord-oauth, discord-sync-role

5) RUNTIME SECRETS  (re-add via Lovable → Connectors → Secrets)
   Already configured (do NOT delete on transfer):
     - LOVABLE_API_KEY              (managed)
     - SUPABASE_SERVICE_ROLE_KEY    (primary)
     - SUPABASE_DB_URL / JWKS / ANON / PUBLISHABLE / SECRET_KEYS
     - RESEND_API_KEY
     - SMTP_SUPPORT_EMAIL  / SMTP_SUPPORT_PASSWORD
     - SMTP_CONTACT_EMAIL  / SMTP_CONTACT_PASSWORD
     - SMTP_SKYCART_EMAIL  / SMTP_SKYCART_PASSWORD
     - CASHFREE_APP_ID     / CASHFREE_SECRET_KEY
     - ADZUNA_APP_ID       / ADZUNA_API_KEY
     - LONGCAT_API_KEY     / ZHIPU_API_KEY
     - DISCORD_BOT_TOKEN   / DISCORD_CLIENT_SECRET / DISCORD_GUILD_ID
     - INNGEST_API_KEY     / INNGEST_SIGNING_KEY  (managed)
     - SENTRY_DSN
   Storage buckets: resumes, kyc-documents, payment-proofs, payment-qr
                    workspace-files

6) VERIFY AFTER TRANSFER
   • Visit hustlaiapp.in           → Vercel rebuilds within ~2 min of next push
   • /admin-dashboard → System Health → "Run all checks" — all rows green
   • /work                          → KPI card loads (DB #2 reachable)
   • /community                     → forum loads     (DB #3 reachable)
   • /hustlebot                     → AI replies      (LOVABLE_API_KEY wired)
   • ₹1 test on /plans              → Cashfree end-to-end
==========================================================
NOTE

# quick local sanity checks
echo
echo "── git remote ──"
git remote -v 2>/dev/null || echo "(run inside the repo)"
echo
echo "── env file ──"
[ -f .env ] && grep -E "VITE_SUPABASE_(URL|PROJECT_ID)" .env || echo "(no .env yet — Lovable will create it)"
