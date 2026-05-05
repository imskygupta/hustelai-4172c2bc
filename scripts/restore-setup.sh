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
   Connected repo (owner/name):  imskyguptas-projects/hustelai
   Default branch:               main
   Vercel project name:          hustelai-066dc9ff
   Vercel domains:               hustlaiapp.in, www.hustlaiapp.in
   Re-link in new Lovable workspace:
     • Lovable → Connectors → GitHub → Connect → pick the SAME repo above
     • Vercel auto-rebuilds on push to main
   ⚠ Do NOT create a new repo — keep the one Vercel is already pointing at.

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
                      canvas_notes
   Setup SQL:         src/lib/work-sql.ts (WORK_SETUP_SQL, CANVAS_SETUP_SQL,
                      WORKSPACES_SETUP_SQL) — already exposed in
                      /admin-dashboard → SQL Setup tab (copy + paste in
                      hustl-production SQL editor).

4) RUNTIME SECRETS  (re-add via Lovable → Connectors → Secrets)
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
   Storage buckets: resumes, kyc-documents, payment-proofs, payment-qr

5) VERIFY AFTER TRANSFER
   • git remote -v        → should still point to imskyguptas-projects/hustelai
   • Visit hustlaiapp.in  → Vercel rebuilds within ~2 min of next push
   • /work                → KPI card loads (proves secondary DB reachable)
   • /admin-dashboard     → SQL Setup tab visible
   • /hustlebot           → proves LOVABLE_API_KEY wired
==========================================================
NOTE

# quick local sanity checks
echo
echo "── git remote ──"
git remote -v 2>/dev/null || echo "(run inside the repo)"
echo
echo "── env file ──"
[ -f .env ] && grep -E "VITE_SUPABASE_(URL|PROJECT_ID)" .env || echo "(no .env yet — Lovable will create it)"
