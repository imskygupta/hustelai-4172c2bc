# Universal Delivery Layer — Phase 1.5

Foundation for "Generate → Deliver → Track" across HustleAI. WhatsApp is a launcher (wa.me, no API). Telegram is a real integration (text + PDF via existing bot). Clients reuse the existing Work Hub `work_clients` table on DB2 — no second namespace.

**Explicitly NOT building:** Client Timeline UI, Clients CRM screens, Email channel, Slack, Client Portal, share analytics dashboard, custom quota logic.  
  
This is actually a very solid specification. I agree with about **90–95% of it**. The biggest win is that it keeps the Universal Delivery Layer focused and doesn't accidentally turn into a CRM project. The document correctly reuses DB2 and the existing Work Hub client model instead of creating another client namespace.

### What I would approve immediately

✅ Reuse `work_clients` in DB2  
✅ Add `work_deliveries` table  
✅ WhatsApp via `wa.me` (no Meta API)  
✅ Telegram text delivery  
✅ Telegram PDF delivery  
✅ Universal `<Deliver />` component  
✅ Client picker with auto-create  
✅ Red Flag Scanner integration  
✅ Proposal Generator integration  
✅ Roadmap PDF integration  
✅ Email Generator tool  
✅ Shared quota rules with existing AI tools

Those are all aligned with where HustleAI is headed.

---

## One thing I'd change

### Don't record WhatsApp delivery immediately

Current plan:

```text
User clicks WhatsApp
↓
deliver-record fires

```

Problem:

```text
User clicks
↓
WhatsApp opens
↓
User never sends

```

You still recorded a delivery.

Instead:

```text
User clicks WhatsApp
↓
Create pending delivery
↓
Open wa.me
↓
Mark channel=whatsapp_opened

```

Later you can distinguish:

```text
telegram_sent
telegram_pdf_sent
whatsapp_opened
saved_to_client

```

Much cleaner analytics.

---

## Email Generator is worth building

You mentioned:

> we do not have email generator

I think it's one of the easiest wins on the platform.

Templates I'd add:

```text
Client Follow-up
Proposal Follow-up
Invoice Reminder
Welcome Email
Project Completion
Revision Request
Cold Outreach
Partnership Pitch

```

Those are used constantly.

And because Deliver exists:

```text
Generate Email
↓
Copy
↓
WhatsApp
↓
Telegram
↓
Save to Client

```

The tool immediately has value.

---

## Future-proof naming

I would avoid:

```text
deliver-record
deliver-telegram
deliver-telegram-pdf

```

and think in terms of channels:

```text
delivery-events
delivery-whatsapp
delivery-telegram

```

because later you'll probably add:

```text
Email
Client Portal
Shared Link
Slack

```

and you won't want Telegram-specific architecture everywhere.

---

## Biggest product insight

The most valuable part of this entire feature is NOT WhatsApp.

It's this:

```text
Client enters system
↓
Proposal delivered
↓
Invoice delivered
↓
Research delivered
↓
Roadmap delivered

```

Now you automatically have:

```text
Client history

```

without ever building a CRM.

That's where the magic is.

---

## What I'd tell Lovable

**Proceed with this spec almost exactly as written.**

Only add:

1. WhatsApp deliveries recorded as `whatsapp_opened` rather than assumed sent.
2. Email Generator gets added to Tools Hub.
3. Reuse existing AI quotas (same semi-free limits as other AI tools).
4. Keep everything in DB2 / Work Hub.
5. Reuse existing `work_clients`; do not create another clients table.

After this ships, stop. Don't build Client Timeline, CRM screens, analytics dashboards, or portal delivery yet. Collect delivery data first and let the feature prove itself. The foundation is the correct size for a Phase 1.5 rollout.

---

## 1. Data model (DB2 / workspace, `utflzmecghdtcjupgdan`)

Reuse `work_clients` as-is (id, owner_id, name, email, phone, company). Add two columns + one new table:

```sql
alter table public.work_clients
  add column if not exists last_delivery_at timestamptz,
  add column if not exists delivery_count   int not null default 0;

create table if not exists public.work_deliveries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_id uuid references public.work_clients(id) on delete set null,
  tool_slug text not null,            -- 'red-flag-scanner', 'proposal-generator', 'email-generator', 'roadmap-pdf', ...
  channel text not null,              -- 'whatsapp' | 'telegram' | 'telegram-pdf' | 'copy'
  content_title text,
  content_preview text,               -- first 280 chars
  ref_kind text,                      -- 'pdf' | 'text' | 'output'
  ref_id text,                        -- workspace_outputs.id or storage key
  created_at timestamptz not null default now()
);
create index if not exists idx_work_deliveries_owner on public.work_deliveries(owner_id, created_at desc);
create index if not exists idx_work_deliveries_client on public.work_deliveries(client_id, created_at desc);
```

GRANTs follow the same `anon_all` pattern used by other `work_*` tables (RLS scoped by `owner_id` from app). Append-only.

## 2. Edge functions

- `**deliver-record**` (verify_jwt=true): validates payload, upserts client by `(owner_id, phone|email)` if new, increments `delivery_count`/`last_delivery_at`, inserts `work_deliveries` row via `getWorkspace()` service client. Returns `{ client_id, delivery_id }`.
- `**deliver-telegram**` (verify_jwt=true): sends text to user's own connected Telegram chat. Reuses `notification_integrations` lookup pattern from `useTelegramConnection`. Calls `deliver-record` internally.
- `**deliver-telegram-pdf**` (verify_jwt=true): accepts either a public URL or a base64 PDF blob; uploads via Telegram `sendDocument` through the Telegram connector gateway. Records delivery.

WhatsApp is pure client-side `wa.me` — no edge function for sending, but `deliver-record` is still called when the user confirms "Opened in WhatsApp".

## 3. Universal `<Deliver />` component

Single React component used by all generators.

```text
[ Copy ] [ Deliver ▾ ]
            ├─ WhatsApp Client
            ├─ Send to Telegram
            ├─ Send PDF to Telegram   (only if pdf prop provided)
            └─ Save to Client
```

Props:

```ts
type DeliverProps = {
  toolSlug: string;
  title: string;
  text: string;                    // plain text payload for WA/Telegram
  pdf?: { url?: string; blob?: Blob; filename: string };
  defaultClientId?: string;
};
```

Behavior:

- **Client picker first** — searchable dropdown of existing `work_clients` (name/phone/company). "+ New client" inline form (name + WhatsApp number; email/company optional). New client is created on first deliver, then sticky in dropdown.
- **WhatsApp**: builds `https://wa.me/<digits>?text=<encoded text+signature>`, opens in new tab, fires `deliver-record` on click.
- **Telegram (text)**: calls `deliver-telegram`. If user has no Telegram connection, shows inline "Connect Telegram" CTA linking to `/settings/telegram`.
- **Telegram (PDF)**: only renders if `pdf` prop supplied. Uploads blob → `deliver-telegram-pdf`.
- **Save to Client**: skips channel, just records a delivery with `channel='copy'` so the client gets logged.

Location: `src/components/delivery/Deliver.tsx` + `useClientPicker.ts` + `useDeliver.ts`.

## 4. Wiring (this pass)

Mount `<Deliver />` in:

- **Red Flag Scanner** (`src/pages/RedFlagScanner.tsx`) — text output.
- **Proposal Generator** — text + PDF (uses existing PDF export path; pass blob).
- **Email Generator** — NEW lightweight tool (see §5) — text only.
- **Roadmap PDF viewer** — PDF channel only.

All other generators get `<Deliver />` in later passes — out of scope here.

## 5. New tool: Email Generator (`/tools/email-generator`)

Lightweight. Reuses existing AI quota middleware — no new gating logic.

- Template chips: Follow-up · Proposal · Invoice reminder · Welcome · Project completion · Cold outreach
- Single textarea: "Describe the situation"
- Tone selector: Friendly · Formal · Direct
- Generates subject + body via Lovable AI Gateway (default: `google/gemini-2.5-flash`).
- Output card uses `<Deliver toolSlug="email-generator" />`.
- Added to `ToolsHub.tsx` grid.

## 6. Memory updates

After ship: add `mem://features/delivery-layer.md` documenting the contract (component API, channel list, DB2 location, client-reuse rule) so future generators know to mount `<Deliver />` instead of inventing their own share buttons.

---

## Technical notes

- Phone normalization: strip non-digits, prepend country code default `91` if missing leading `+`. Stored as digits-only on `work_clients.phone`.
- Client dedupe on insert: match by `(owner_id, phone)` first, then `(owner_id, lower(email))`.
- Telegram PDF size cap: 50 MB (Telegram limit) — show toast if larger.
- All deliveries scoped by `owner_id` from `auth.uid()` in the edge function; frontend never trusts the client's `owner_id` field.
- No new env vars. Uses existing `TELEGRAM_API_KEY` / `LOVABLE_API_KEY` + `WORKSPACE_SUPABASE_SERVICE_ROLE_KEY`.

## Shipping order

1. Migration (work_clients alter + work_deliveries).
2. Edge functions: `deliver-record`, `deliver-telegram`, `deliver-telegram-pdf`.
3. `<Deliver />` component + client picker.
4. Wire into Red Flag Scanner + Proposal Generator + Roadmap PDF.
5. Build Email Generator + add to ToolsHub.
6. Save memory file.