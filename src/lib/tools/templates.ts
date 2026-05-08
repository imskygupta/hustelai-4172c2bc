export interface ProposalTemplate {
  id: string;
  label: string;
  scope: string;
  deliverables: string[];
  timeline: string;
  pricingNote: string;
}

export const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: "web-design",
    label: "Web Design Project",
    scope: "Design and ship a modern, conversion-focused marketing website (up to 6 pages) tailored to your brand and audience.",
    deliverables: [
      "Brand-aligned design system (colors, typography, components)",
      "Up to 6 fully designed & developed responsive pages",
      "On-page SEO setup (meta, schema, sitemap)",
      "Analytics + form tracking",
      "Two rounds of revisions",
    ],
    timeline: "4 weeks from kickoff (Week 1: discovery, Week 2-3: design, Week 4: build & launch).",
    pricingNote: "50% advance to start, 50% on launch.",
  },
  {
    id: "social-media",
    label: "Social Media Management (Monthly)",
    scope: "End-to-end social media management across Instagram, LinkedIn and X — strategy, content, posting and reporting.",
    deliverables: [
      "Monthly content calendar (16 posts + 8 stories)",
      "Static + reel-format creative production",
      "Caption + hashtag research",
      "Scheduling + community management (M-F)",
      "Monthly analytics report",
    ],
    timeline: "Rolling monthly retainer. Onboarding takes 7 days.",
    pricingNote: "Monthly retainer, billed in advance. 30-day cancellation notice.",
  },
  {
    id: "consulting",
    label: "Consulting Engagement",
    scope: "Strategic consulting engagement to diagnose, design and implement a roadmap for the focus area outlined below.",
    deliverables: [
      "Discovery workshop (3 sessions)",
      "Audit report with prioritized findings",
      "90-day action roadmap",
      "Weekly 1-hour check-ins",
      "Async support over email/Slack",
    ],
    timeline: "12-week engagement, with optional renewal.",
    pricingNote: "Retainer billed monthly in advance.",
  },
  {
    id: "video",
    label: "Video Production",
    scope: "Concept-to-delivery video production for a brand campaign or product launch.",
    deliverables: [
      "Creative concept + script",
      "1-day shoot (up to 8 hours, single location)",
      "Editing, color, sound design",
      "Two rounds of revisions",
      "Final masters in 16:9, 9:16 and 1:1",
    ],
    timeline: "3 weeks from script approval.",
    pricingNote: "60% advance, 40% on final delivery.",
  },
];

export interface ContractTemplate {
  id: string;
  label: string;
  intro: string;
  clauses: { title: string; body: string }[];
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "freelance",
    label: "Freelance Service Agreement",
    intro: "This Freelance Service Agreement (the \"Agreement\") is entered into between the Service Provider and the Client identified below, and governs the work described in the Scope section.",
    clauses: [
      { title: "Scope of Work", body: "The Service Provider agrees to deliver the services and deliverables described in the attached Scope. Any work outside of this scope is considered a change request and will be quoted separately." },
      { title: "Fees & Payment Terms", body: "The Client agrees to pay the Service Provider the fee specified. Invoices are payable within 7 days of issue. Late payments may attract a 2% monthly interest charge." },
      { title: "Timeline & Delays", body: "The Service Provider will use reasonable efforts to meet the agreed timeline. Delays caused by the Client (e.g. delayed feedback, missing assets) may extend the timeline." },
      { title: "Revisions", body: "Two rounds of revisions are included. Additional revisions will be billed at the Service Provider's standard hourly rate." },
      { title: "Intellectual Property", body: "All deliverables remain the property of the Service Provider until full payment is received. Upon final payment, ownership of the final deliverables transfers to the Client." },
      { title: "Confidentiality", body: "Both parties agree to keep confidential any non-public information shared during the engagement." },
      { title: "Termination", body: "Either party may terminate this Agreement with 14 days written notice. The Client agrees to pay for all work completed up to the termination date." },
      { title: "Limitation of Liability", body: "The Service Provider's total liability under this Agreement shall not exceed the total fees paid by the Client." },
      { title: "Governing Law", body: "This Agreement is governed by the laws of India. Disputes shall be resolved through arbitration in the city of the Service Provider." },
    ],
  },
  {
    id: "nda",
    label: "Mutual NDA",
    intro: "This Mutual Non-Disclosure Agreement is entered into between the Disclosing Party and the Receiving Party (each, a \"Party\" and collectively, the \"Parties\") to protect confidential information exchanged.",
    clauses: [
      { title: "Definition of Confidential Information", body: "Confidential Information means any non-public information, including business plans, financials, customer data, source code and trade secrets, disclosed by one Party to the other." },
      { title: "Obligations of Receiving Party", body: "The Receiving Party agrees to keep all Confidential Information strictly confidential and to use it solely for the purpose of evaluating or carrying out the working relationship between the Parties." },
      { title: "Exclusions", body: "Confidential Information does not include information that is publicly available, independently developed, or rightfully received from a third party." },
      { title: "Term", body: "Obligations under this Agreement remain in effect for a period of 3 years from the date of disclosure." },
      { title: "Return of Information", body: "Upon written request, the Receiving Party shall return or destroy all Confidential Information in its possession." },
      { title: "No Licence", body: "Nothing in this Agreement grants either Party any licence or rights to the other Party's intellectual property." },
      { title: "Governing Law", body: "This Agreement shall be governed by the laws of India." },
    ],
  },
  {
    id: "web-dev",
    label: "Web Development Contract",
    intro: "This Web Development Contract is entered into between the Developer and the Client and covers the development of the website described below.",
    clauses: [
      { title: "Project Scope", body: "The Developer agrees to design and develop the website specified in the Scope, including responsive layouts, content management setup and basic on-page SEO." },
      { title: "Hosting & Third-Party Costs", body: "The Client is responsible for hosting fees, domain registration, and any third-party plugins, fonts or stock assets required." },
      { title: "Payment Schedule", body: "50% of the total fee is due as an advance to start work. The remaining 50% is due upon launch." },
      { title: "Timeline", body: "The Developer commits to the timeline outlined in the Scope, contingent on the Client providing all required assets within agreed deadlines." },
      { title: "Browser & Device Support", body: "The website will be tested on the latest two versions of Chrome, Safari, Firefox and Edge, and on standard mobile devices." },
      { title: "Bug Fixes & Warranty", body: "The Developer will fix any bugs reported within 30 days of launch at no extra cost. Bugs reported after 30 days will be billed at the standard rate." },
      { title: "Ownership & Source Code", body: "Upon final payment, the Client owns the design, content and codebase delivered. The Developer retains the right to showcase the project in their portfolio." },
      { title: "Termination", body: "If the project is cancelled by the Client, all fees paid are non-refundable and any pending milestones become immediately due." },
      { title: "Governing Law", body: "This Contract is governed by the laws of India." },
    ],
  },
  {
    id: "social-media",
    label: "Social Media Agreement",
    intro: "This Social Media Management Agreement is entered into between the Agency and the Client for the services described below.",
    clauses: [
      { title: "Services", body: "The Agency agrees to manage the Client's social media presence as defined in the Scope, including content creation, scheduling, posting and community management." },
      { title: "Content Approval", body: "The Client agrees to review and approve content within 48 hours of submission. If no feedback is received, content is considered approved." },
      { title: "Brand Voice & Assets", body: "The Client will provide brand guidelines, logos and any required source assets. The Agency will adhere to the brand voice and visual identity." },
      { title: "Performance Metrics", body: "The Agency does not guarantee specific follower or engagement numbers. Monthly reports will be shared on agreed metrics." },
      { title: "Fees", body: "Monthly retainer is payable in advance on the 1st of each month. Ad spend is billed separately and paid directly by the Client." },
      { title: "Termination", body: "Either party may terminate this Agreement with 30 days written notice." },
              { title: "Governing Law", body: "This Agreement is governed by the laws of India." },
    ],
  },
];
