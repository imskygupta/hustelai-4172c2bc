import { useMemo, useState } from "react";
import { UserCircle2, Copy, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { TemplatePicker } from "@/components/tools/TemplatePicker";
import { toast } from "sonner";

const faqs = [
  { q: "Is this bio generator really free?", a: "Yes — generate, shuffle and copy unlimited bios in your browser, free, no signup. Sign up free if you want to save bios across devices and personalise with AI." },
  { q: "Where can I use these bios?", a: "Anywhere — LinkedIn About, Twitter/X bio, Instagram bio, your portfolio site, agency homepage, freelance platform profile (Upwork, Fiverr, Toptal, Contra) and email signatures." },
  { q: "Are these bios localized?", a: "The templates are written in neutral global English that works across the US, UK, EU, Canada, Australia, Singapore and India. Tweak the wording for your region — output is fully editable." },
  { q: "How many variants do I get?", a: "Three to four variants per style (LinkedIn, Agency, Creator, Tagline). Hit Shuffle for fresh phrasing — combinations are virtually unlimited." },
  { q: "Can I add my own templates?", a: "Sign up to save your favourite phrasings as reusable snippets in your HustleAI Brand Kit so they auto-suggest the next time you write a bio." },
];

/**
 * Portfolio Bio Generator — pure-template, no AI cost.
 * 4 styles: LinkedIn / Agency / Creator / Freelancer tagline.
 */
type Style = "linkedin" | "agency" | "creator" | "tagline";

const TEMPLATES: Record<Style, (v: Vars) => string[]> = {
  linkedin: (v) => [
    `${v.name} — ${v.role} helping ${v.audience} ${v.outcome}. ${v.years}+ yrs working with ${v.clients}. Currently building ${v.project}. DMs open for ${v.cta}.`,
    `${v.role} | ${v.years}+ years | I help ${v.audience} ${v.outcome}. Past clients: ${v.clients}. ${v.project ? `Building ${v.project}. ` : ""}Open to ${v.cta}.`,
    `Hi 👋 I'm ${v.name}. I'm a ${v.role} obsessed with helping ${v.audience} ${v.outcome}. ${v.years}+ years in. ${v.clients ? `Worked with ${v.clients}. ` : ""}Let's talk about ${v.cta}.`,
  ],
  agency: (v) => [
    `${v.name} is a ${v.role} studio that helps ${v.audience} ${v.outcome}. We've delivered ${v.clients ? `for ${v.clients}` : "200+ projects"} over ${v.years}+ years.`,
    `We're ${v.name} — a small ${v.role} team turning ${v.audience}'s biggest problems into ${v.outcome}. ${v.years}+ years. ${v.cta ? `Now booking ${v.cta}.` : ""}`,
    `${v.name}: ${v.role} for ${v.audience}. We exist to ${v.outcome}. ${v.clients ? `Trusted by ${v.clients}.` : ""}`,
  ],
  creator: (v) => [
    `${v.name} · ${v.role} · ${v.years}+ yrs. I post about ${v.audience} & how to ${v.outcome}. ${v.project ? `Building ${v.project}. ` : ""}DM for ${v.cta}.`,
    `Helping ${v.audience} ${v.outcome} — one post at a time. ${v.role} since ${new Date().getFullYear() - (Number(v.years) || 1)}. ${v.cta ? `Collabs / ${v.cta} → DM.` : ""}`,
    `${v.role} 🚀 I make content for ${v.audience}. Mission: ${v.outcome}. ${v.project ? `Working on ${v.project}.` : ""}`,
  ],
  tagline: (v) => [
    `${v.role} that helps ${v.audience} ${v.outcome}.`,
    `I turn ${v.audience}'s ideas into ${v.outcome}.`,
    `Your unfair advantage in ${v.role}.`,
    `${v.outcome} — done by a ${v.role} who's done it ${v.years}+ years.`,
  ],
};

interface Vars { name: string; role: string; audience: string; outcome: string; years: string; clients: string; project: string; cta: string; }

const STYLES: { value: Style; label: string }[] = [
  { value: "linkedin", label: "LinkedIn bio" },
  { value: "agency", label: "Agency bio" },
  { value: "creator", label: "Creator bio" },
  { value: "tagline", label: "Tagline" },
];

export default function PortfolioBio() {
  const [v, setV] = useState<Vars>({
    name: "Aarav Mehta", role: "fractional product designer", audience: "early-stage SaaS founders",
    outcome: "ship clean MVPs that convert", years: "6", clients: "Razorpay, CRED, Postman",
    project: "design-system-in-a-day", cta: "design retainers",
  });
  const [style, setStyle] = useState<Style>("linkedin");
  const [seed, setSeed] = useState(0);
  const variants = useMemo(() => TEMPLATES[style](v), [style, v, seed]);

  const Field = ({ k, label }: { k: keyof Vars; label: string }) => (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="mt-1" />
    </div>
  );

  return (
    <ToolPageLayout
      title="Portfolio Bio Generator"
      metaTitle="Free LinkedIn, Agency & Creator Bio Generator | HustleAI"
      metaDescription="Free portfolio bio generator for freelancers, agencies and creators in the US, UK, EU, AU and India. LinkedIn, agency, creator and tagline styles — copy in one click."
      subtitle="LinkedIn, agency, creator and freelancer taglines — pick a style, tweak details, copy."
      icon={UserCircle2}
      path="/tools/portfolio-bio"
      toolKey="portfolio-bio"
      accent="from-sky-500 to-indigo-600"
      back={{ href: "/tools", label: "All tools" }}
      faqs={faqs}
    >
      <TemplatePicker toolKey="portfolio-bio" />
      <div className="grid lg:grid-cols-5 gap-5">
        <Card className="p-5 lg:col-span-2 space-y-3">
          <Field k="name" label="Your / brand name" />
          <Field k="role" label="What you do (role)" />
          <Field k="audience" label="Who you help" />
          <Field k="outcome" label="Outcome you deliver" />
          <div className="grid grid-cols-2 gap-3">
            <Field k="years" label="Years experience" />
            <Field k="cta" label="Call to action" />
          </div>
          <Field k="clients" label="Notable clients (optional)" />
          <Field k="project" label="Current project (optional)" />
        </Card>

        <Card className="p-5 lg:col-span-3">
          <Tabs value={style} onValueChange={(s) => setStyle(s as Style)}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <TabsList>{STYLES.map(s => <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>)}</TabsList>
              <Button size="sm" variant="outline" onClick={() => setSeed(s => s + 1)}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Shuffle
              </Button>
            </div>
            <TabsContent value={style} className="mt-4 space-y-3">
              {variants.map((text, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 group">
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</p>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{text.length} chars</span>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}>
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </ToolPageLayout>
  );
}