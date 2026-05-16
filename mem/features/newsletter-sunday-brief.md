---
name: Newsletter Sunday Brief
description: Unified single weekly newsletter blending app + blog, 1-per-6-days throttle, bulk subscriber add
type: feature
---
- **Format**: ONE email/week, "The Sunday Brief". 4 sections only: `feature` (90-130w + blog link), `tech_pulse` (3-5 bullets), `tool_guide` (one HustleAI tool 3-step how-to), `cta` (promo for both surfaces). Replaces old 7-section digest.
- **Throttle**: `brevo-newsletter dispatch_issue` returns `{error:"throttled"}` (HTTP 429) if any issue was sent in last 6 days. Admin UI prompts for override; only `force:true` bypasses.
- **Cron**: `weekly_cron` skips generation if any issue exists in last 6 days (`issue_already_this_week`). Still draft-only — never auto-sends.
- **Manual mode**: `create_manual_issue` action — admin pastes subject + preheader + markdown body → stored as single-section ready issue.
- **Bulk add**: `bulk_add_subscribers` action accepts CSV/comma/newline/space-separated emails. Adds new, reactivates unsubscribed, skips dupes/invalids.
- **Branded HTML**: `wrapHtml` promotes BOTH `hustlaiapp.in` and `blogs.hustlaiapp.in` with dual CTA buttons and footer links. UTM-tagged `sunday_brief`.
- **Admin UI** (`/admin/communications/newsletter`): Automation (default) / Advanced manual toggle at top, bulk-add textarea in Subscribers tab, throttle override flow on dispatch.
