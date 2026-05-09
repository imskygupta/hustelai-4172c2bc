import { SeoLanding, RelatedLink } from "@/components/SeoLanding";

const ALL: { path: string; label: string }[] = [
  { path: "/freelancer-crm", label: "Freelancer CRM" },
  { path: "/ai-invoice-generator", label: "AI Invoice Generator" },
  { path: "/quotation-generator", label: "Quotation Generator" },
  { path: "/proposal-generator", label: "Proposal Generator" },
  { path: "/client-onboarding-software", label: "Client Onboarding Software" },
  { path: "/workspace-os", label: "Workspace OS" },
  { path: "/freelancer-workspace", label: "Freelancer Workspace" },
  { path: "/ai-document-generator", label: "AI Document Generator" },
  { path: "/client-portal-software", label: "Client Portal Software" },
  { path: "/agency-workflow-tools", label: "Agency Workflow Tools" },
  { path: "/freelancer-productivity-tools", label: "Freelancer Productivity Tools" },
  { path: "/ai-business-card-maker", label: "AI Business Card Maker" },
];

const related = (current: string): RelatedLink[] =>
  ALL.filter((p) => p.path !== current).slice(0, 6).map((p) => ({ label: p.label, to: p.path }));

const P = (text: string) => <p>{text}</p>;

/* ---------- 1. Freelancer CRM ---------- */
export const FreelancerCRMPage = () => (
  <SeoLanding
    path="/freelancer-crm"
    title="Freelancer CRM — Manage Clients, Deals & Retainers | HustleAI Workspace OS"
    description="HustleAI is the freelancer CRM built for solo operators and agencies. Track clients, pipelines, retainers and follow-ups in one AI-powered workspace."
    h1="The freelancer CRM that finally fits how you work"
    subhead="Stop juggling spreadsheets, inboxes and sticky notes. HustleAI Workspace OS gives freelancers a real CRM — pipelines, clients, retainers, follow-ups and AI assists in one place."
    bullets={["Unlimited clients on Pro", "AI follow-up drafts", "Pipelines & retainers", "Built for India 🇮🇳"]}
    sections={[
      { title: "Why freelancers need a real CRM", body: <>
        {P("Most freelancer tools either over-serve enterprise teams or under-serve solo operators with toy contact lists. HustleAI is built for the middle ground — the freelancer or 2–10 person agency that needs proper client tracking, deal pipelines and retainer management without the overhead of Salesforce or HubSpot.")}
        {P("Every conversation, proposal, invoice and file lives next to the client record. Search across everything from the command bar. Move deals through stages with a single click. Set follow-up reminders that the AI assistant can draft for you.")}
      </> },
      { title: "Pipelines, deals and forecasts", body: <>
        {P("Visualise your sales pipeline as a kanban or list. Each card shows estimated value, expected close, last touch and next step. Forecast monthly revenue without spreadsheets.")}
        {P("Move deals between Discovery, Proposal Sent, Negotiation, Won and Lost. The CRM auto-logs status changes and lets you tag clients by industry, retainer status, source and tier.")}
      </> },
      { title: "Retainers and recurring revenue", body: <>
        {P("Convert one-off projects into recurring retainers. Track monthly hours, deliverables and invoice cycles per client. Get warnings when a retainer is over-serviced.")}
      </> },
      { title: "AI assists, not AI takeover", body: <>
        {P("HustleAI's AI layer drafts follow-ups, summarises long client threads, suggests next steps and prepares proposals — but you stay in control. Connect your own Gemini or OpenAI key for unlimited assists.")}
      </> },
    ]}
    faqs={[
      { q: "Is HustleAI a CRM for freelancers only?", a: "It's built freelancer-first but works for small agencies and creator studios up to 10 seats." },
      { q: "Can I import my existing contacts?", a: "Yes. CSV import is supported and we're rolling out Google Contacts and HubSpot import." },
      { q: "Does it work offline?", a: "HustleAI is a cloud workspace; you need internet, but it works on any modern browser including mobile." },
      { q: "How is this different from Notion?", a: "Notion is a docs tool. HustleAI is a CRM with pipelines, invoices, portals, retainers and AI assists wired together." },
    ]}
    related={related("/freelancer-crm")}
  />
);

/* ---------- 2. AI Invoice Generator ---------- */
export const AIInvoiceGeneratorPage = () => (
  <SeoLanding
    path="/ai-invoice-generator"
    title="AI Invoice Generator for Freelancers — Free & Branded | HustleAI"
    description="Generate professional invoices in seconds with AI. GST-ready, branded, sent over email and tracked inside your freelancer workspace."
    h1="AI invoice generator built for freelancers"
    subhead="Turn a project brief into a branded, GST-ready invoice in seconds. HustleAI tracks who opened it, when they paid and what's overdue."
    bullets={["GST + non-GST formats", "Branded PDF export", "Auto reminders", "Tracked in your CRM"]}
    sections={[
      { title: "From brief to invoice in under a minute", body: <>
        {P("Paste a short brief, scope or proposal. The AI extracts line items, hours and totals into a structured invoice. Edit anything, then export a branded PDF or email it directly to your client.")}
      </> },
      { title: "GST-ready for Indian freelancers", body: <>
        {P("HustleAI invoices support Indian GST formats — CGST, SGST and IGST splits — plus international templates. HSN/SAC codes are configurable per service.")}
      </> },
      { title: "Auto-reminders that don't sound robotic", body: <>
        {P("When an invoice goes overdue, the AI drafts a polite reminder in your voice. You approve, it sends. No more awkward chase emails.")}
      </> },
      { title: "Connected to your CRM", body: <>
        {P("Every invoice is tied to a client and a deal. Open the client record and see paid, pending and overdue totals at a glance.")}
      </> },
    ]}
    faqs={[
      { q: "Is the invoice generator free?", a: "Free tier includes 5 invoices/month. Pro removes limits and adds custom branding." },
      { q: "Do I get GST-compliant invoices?", a: "Yes — Indian GST formats with CGST/SGST/IGST and HSN/SAC codes." },
      { q: "Can I get paid through the invoice?", a: "Yes — UPI and Dodo Payments links can be embedded." },
    ]}
    related={related("/ai-invoice-generator")}
  />
);

/* ---------- 3. Quotation Generator ---------- */
export const QuotationGeneratorPage = () => (
  <SeoLanding
    path="/quotation-generator"
    title="Online Quotation Generator for Freelancers & Agencies | HustleAI"
    description="Create professional quotations and estimates online in minutes. Branded templates, AI suggestions and one-click conversion to invoices."
    h1="Send quotations clients actually accept"
    subhead="Build branded, persuasive quotations in minutes — then convert them into invoices the moment the client says yes."
    bullets={["AI-suggested line items", "Branded PDF & link share", "One-click → invoice", "Version history"]}
    sections={[
      { title: "Quotations that close deals", body: <>
        {P("Most quotations look like spreadsheets. HustleAI quotes look like proposals — branded, scoped, with clear deliverables, timelines and payment terms. The AI suggests line items based on the client brief and your past projects.")}
      </> },
      { title: "Share as a link or branded PDF", body: <>
        {P("Send a public quote link the client can view in-browser, or export a branded PDF. Track when it's opened and which sections they linger on.")}
      </> },
      { title: "Convert to invoice in one click", body: <>
        {P("When the client accepts, click Convert. The quote becomes an invoice with the same line items — no retyping, no copy-paste errors.")}
      </> },
    ]}
    faqs={[
      { q: "Can I customise quotation templates?", a: "Yes — themes, logo, colours and footer text are all editable per workspace." },
      { q: "Do clients need an account to view?", a: "No. Quotes are shared as public links with optional password." },
      { q: "Is there a free quotation generator?", a: "Yes. Free tier includes 3 quotes/month." },
    ]}
    related={related("/quotation-generator")}
  />
);

/* ---------- 4. Proposal Generator ---------- */
export const ProposalGeneratorPage = () => (
  <SeoLanding
    path="/proposal-generator"
    title="AI Proposal Generator for Freelancers — Win More Clients | HustleAI"
    description="Draft persuasive proposals in minutes with AI. Branded templates, dynamic pricing tables and proposal tracking inside your workspace."
    h1="AI proposal generator that wins clients"
    subhead="Turn a discovery call into a compelling proposal. HustleAI drafts, prices and sends — you focus on the relationship."
    bullets={["AI first draft", "Dynamic pricing tables", "Open & view tracking", "Convert to deal"]}
    sections={[
      { title: "Proposals written by you, with AI assist", body: <>
        {P("Drop your discovery notes into HustleAI. The AI generates a structured proposal: problem statement, scope, deliverables, timeline, pricing and next steps. Edit any section, drop in case studies, send.")}
      </> },
      { title: "Track what clients actually read", body: <>
        {P("See when the client opens the proposal, which sections they spend time on, and whether they re-read pricing. Use that signal to time your follow-up.")}
      </> },
      { title: "From proposal to project", body: <>
        {P("Accepted proposals convert into deals, invoices and project workspaces with a single click — no duplicate setup.")}
      </> },
    ]}
    faqs={[
      { q: "Is the proposal generator free?", a: "Yes — 3 proposals/month free. Pro removes limits and adds AI follow-ups." },
      { q: "Can I use my own branding?", a: "Yes. Logo, colours and themes are configurable per workspace." },
      { q: "Does it support multiple currencies?", a: "Yes — INR, USD, EUR, GBP and 30+ more." },
    ]}
    related={related("/proposal-generator")}
  />
);

/* ---------- 5. Client Onboarding Software ---------- */
export const ClientOnboardingPage = () => (
  <SeoLanding
    path="/client-onboarding-software"
    title="Client Onboarding Software for Freelancers & Agencies | HustleAI"
    description="Automate client onboarding with intake forms, contracts, kickoff checklists and branded portals — all in one freelancer workspace."
    h1="Client onboarding without the chaos"
    subhead="Intake forms, contracts, kickoff checklists, branded portals — wired together so every new client feels like a premium experience."
    bullets={["Intake forms", "E-sign contracts", "Kickoff checklists", "Branded client portal"]}
    sections={[
      { title: "First impressions are operational", body: <>
        {P("Clients judge you in the first week. HustleAI gives you a repeatable, branded onboarding flow: intake form → contract → kickoff checklist → client portal access — all triggered the moment a deal is marked Won.")}
      </> },
      { title: "Custom intake forms", body: <>
        {P("Build branded intake forms per service. Required fields, file uploads, conditional logic. Responses land directly in the client record.")}
      </> },
      { title: "Branded client portals", body: <>
        {P("Give every client a private portal with project status, files, invoices and messages. Your branding, your domain, your vibe.")}
      </> },
    ]}
    faqs={[
      { q: "Can I template my onboarding flow?", a: "Yes. Save flows per service so every new client gets the same premium experience." },
      { q: "Do clients need to install anything?", a: "No — portals open in any browser, no login friction." },
      { q: "Is contract e-sign included?", a: "Yes on Pro and above." },
    ]}
    related={related("/client-onboarding-software")}
  />
);

/* ---------- 6. Workspace OS ---------- */
export const WorkspaceOSMarketingPage = () => (
  <SeoLanding
    path="/workspace-os"
    title="Workspace OS — AI-powered operating system for freelancers | HustleAI"
    description="HustleAI Workspace OS is the operating system for modern freelancers — CRM, invoices, proposals, portals and AI assists in one place."
    h1="An operating system for your freelance business"
    subhead="HustleAI Workspace OS unifies clients, deals, documents, invoices and AI assists. One tab. Zero context switching."
    bullets={["CRM + Pipelines", "Docs + Invoices", "Client Portals", "AI Layer"]}
    sections={[
      { title: "Why a Workspace OS, not another tool", body: <>
        {P("The average freelancer juggles 8+ tools — Notion, Trello, Google Docs, Excel, Razorpay, Gmail, Calendly, WhatsApp. HustleAI replaces the operational stack with a single workspace OS where clients, deals, documents and money live together.")}
      </> },
      { title: "Modules that actually integrate", body: <>
        {P("CRM, pipelines, retainers, invoices, quotations, proposals, client portals, business cards, time tracking and expenses — built natively, sharing the same data model.")}
      </> },
      { title: "AI as a layer, not a feature", body: <>
        {P("AI runs underneath every module: drafting follow-ups, summarising threads, suggesting next steps. Bring your own Gemini/OpenAI key for unlimited usage.")}
      </> },
    ]}
    faqs={[
      { q: "Is Workspace OS replacing tools like Notion?", a: "For freelancer operations — yes. For knowledge management — pair the two." },
      { q: "Can I import data from other tools?", a: "Yes. CSV import is live; HubSpot and Bonsai import are rolling out." },
      { q: "Is there a mobile app?", a: "The web app is fully responsive; native apps are on the roadmap." },
    ]}
    related={related("/workspace-os")}
  />
);

/* ---------- 7. Freelancer Workspace ---------- */
export const FreelancerWorkspacePage = () => (
  <SeoLanding
    path="/freelancer-workspace"
    title="Freelancer Workspace — One App for Clients, Projects & Money | HustleAI"
    description="The freelancer workspace built for solo operators and small agencies. CRM, projects, invoices and AI in one tab."
    h1="The freelancer workspace you actually open every morning"
    subhead="Clients, deals, projects, invoices, files — one tab, zero context switching."
    bullets={["Daily dashboard", "Project workspaces", "Built-in invoicing", "AI command bar"]}
    sections={[
      { title: "Designed for the way freelancers actually work", body: <>
        {P("HustleAI's daily dashboard surfaces what matters: active deals, overdue invoices, today's tasks, recent client messages. No 12-tab morning routine.")}
      </> },
      { title: "A workspace per project", body: <>
        {P("Every project gets its own workspace with files, tasks, messages and invoices. Share with the client as a portal.")}
      </> },
      { title: "AI command bar", body: <>
        {P("Hit ⌘K to draft a follow-up, summarise a thread, generate a proposal or jump to any client. The AI knows your data.")}
      </> },
    ]}
    faqs={[
      { q: "Is the freelancer workspace free?", a: "Free tier covers solo freelancers with light usage. Pro unlocks unlimited clients and AI." },
      { q: "Does it support agencies?", a: "Yes — multi-seat workspaces are available on Elite." },
    ]}
    related={related("/freelancer-workspace")}
  />
);

/* ---------- 8. AI Document Generator ---------- */
export const AIDocumentGeneratorPage = () => (
  <SeoLanding
    path="/ai-document-generator"
    title="AI Document Generator for Freelancers — Invoices, Proposals, Quotes | HustleAI"
    description="Generate invoices, quotations, proposals, contracts and business cards with AI. Branded templates, instant PDF export."
    h1="AI document generator for freelance business"
    subhead="Invoices, quotations, proposals, agreements, business cards — all generated, branded and exported in minutes."
    bullets={["Invoices & quotes", "Proposals & agreements", "Business cards", "Branded PDF export"]}
    sections={[
      { title: "One generator, every business document", body: <>
        {P("HustleAI's document engine handles every freelance document type: invoices, quotations, proposals, service agreements, statements of work, business cards. Pick a theme, fill in the brief, export branded PDF.")}
      </> },
      { title: "Themes, not templates", body: <>
        {P("Choose a theme once — every document you generate inherits the same colours, typography and brand voice.")}
      </> },
    ]}
    faqs={[
      { q: "What document types are supported?", a: "Invoices, quotations, proposals, agreements, business cards and service cards." },
      { q: "Can I edit AI-generated drafts?", a: "Yes — every generated doc is fully editable before export." },
    ]}
    related={related("/ai-document-generator")}
  />
);

/* ---------- 9. Client Portal Software ---------- */
export const ClientPortalSoftwarePage = () => (
  <SeoLanding
    path="/client-portal-software"
    title="Client Portal Software for Freelancers & Agencies | HustleAI"
    description="Branded client portals with project status, files, invoices and messages. White-label, secure and tied to your CRM."
    h1="Branded client portals — without building one"
    subhead="Give every client a secure portal with project status, files, invoices and messages. Looks like your brand. Runs on HustleAI."
    bullets={["White-label", "Project status", "Secure file share", "Invoice payments"]}
    sections={[
      { title: "Portals that look like yours", body: <>
        {P("Custom logo, colours and domain. Clients see your brand, not ours.")}
      </> },
      { title: "Everything in one place for the client", body: <>
        {P("Project status, deliverables, invoices, files and messages — no more 'where is that file?' emails.")}
      </> },
    ]}
    faqs={[
      { q: "Are portals secure?", a: "Yes — token-based access with optional password and expiry." },
      { q: "Can clients pay invoices in the portal?", a: "Yes — UPI and Dodo Payments links are embedded." },
    ]}
    related={related("/client-portal-software")}
  />
);

/* ---------- 10. Agency Workflow Tools ---------- */
export const AgencyWorkflowToolsPage = () => (
  <SeoLanding
    path="/agency-workflow-tools"
    title="Agency Workflow Tools — Operations OS for Small Agencies | HustleAI"
    description="Run a small agency on HustleAI Workspace OS — pipelines, retainers, multi-seat workspaces, branded client portals and AI assists."
    h1="Workflow tools for the modern small agency"
    subhead="Pipelines, retainers, multi-seat workspaces, branded portals and AI — built for 2–10 person agencies that don't want enterprise overhead."
    bullets={["Multi-seat workspaces", "Retainer management", "Team pipelines", "White-label portals"]}
    sections={[
      { title: "Built for the messy middle", body: <>
        {P("Agencies between 2 and 10 people are the worst-served by software — too big for solo tools, too small for HubSpot. HustleAI is the operations OS for that exact band.")}
      </> },
      { title: "Team pipelines and retainers", body: <>
        {P("Assign deals and retainers across teammates. Track utilization, monthly delivery and renewal risk.")}
      </> },
    ]}
    faqs={[
      { q: "How many seats are included?", a: "Elite includes up to 5 seats; Infinity scales further." },
      { q: "Can I white-label portals?", a: "Yes — Elite and above." },
    ]}
    related={related("/agency-workflow-tools")}
  />
);

/* ---------- 11. Freelancer Productivity Tools ---------- */
export const FreelancerProductivityToolsPage = () => (
  <SeoLanding
    path="/freelancer-productivity-tools"
    title="Freelancer Productivity Tools — AI Assists, Time, Tasks | HustleAI"
    description="The freelancer productivity stack — AI assists, time tracking, tasks, invoices and CRM in one workspace OS."
    h1="Productivity tools that match how freelancers actually work"
    subhead="AI assists, time tracking, daily tasks, deadlines, invoices and CRM — one workspace, one focus mode."
    bullets={["AI command bar", "Time tracking", "Daily focus", "Deadlines"]}
    sections={[
      { title: "Productivity = fewer tabs", body: <>
        {P("Every productivity tool you bolt on is another tab. HustleAI replaces the stack so your morning routine is one tab and one focus mode.")}
      </> },
      { title: "Time, tasks and deadlines", body: <>
        {P("Native time tracking per client and project. Daily task list. Deadline radar. No third-party plugin.")}
      </> },
    ]}
    faqs={[
      { q: "Does HustleAI replace Toggl/Clockify?", a: "For most freelancers — yes. Time tracking is built in and tied to invoices." },
      { q: "Is there a Pomodoro timer?", a: "Yes — focus mode is included in the daily dashboard." },
    ]}
    related={related("/freelancer-productivity-tools")}
  />
);

/* ---------- 12. AI Business Card Maker ---------- */
export const AIBusinessCardMakerPage = () => (
  <SeoLanding
    path="/ai-business-card-maker"
    title="AI Business Card Maker — Branded Digital Cards in Minutes | HustleAI"
    description="Generate beautiful digital and print-ready business cards with AI. Pick a theme, fill your details, export PDF."
    h1="AI business card maker for freelancers and creators"
    subhead="Pick a theme. Fill your details. Get a branded, print-ready and digital business card in minutes."
    bullets={["Print-ready PDF", "Digital share link", "Branded themes", "QR + vCard"]}
    sections={[
      { title: "Print-ready and digital", body: <>
        {P("Export print-ready PDF for offline cards or share a digital card link with QR + vCard for instant contact saving.")}
      </> },
      { title: "Themes, not generic templates", body: <>
        {P("Choose from minimalist, editorial, brutalist and gradient themes. Each one looks designed, not generated.")}
      </> },
    ]}
    faqs={[
      { q: "Are digital cards free?", a: "Yes — free tier includes 1 card. Pro unlocks unlimited and custom branding." },
      { q: "Can I add a QR code?", a: "Yes — every digital card auto-generates a QR linking to your vCard." },
    ]}
    related={related("/ai-business-card-maker")}
  />
);