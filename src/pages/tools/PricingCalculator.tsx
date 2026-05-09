import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";

const faqs = [
  { q: "Is the AI Pricing Calculator really free?", a: "Yes. Every calculator — freelancer hourly, agency rate, profit margin and SaaS — is 100% free in the browser. No signup needed to use it. Sign up only when you want to save scenarios or sync to your HustleAI workspace." },
  { q: "Which currencies does it support?", a: "The math is currency-agnostic — type any number. The labels default to ₹ (INR), but the same formulas work for USD, GBP, EUR, AUD, CAD, AED and SGD. Freelancers in the US, UK, EU, Canada, Australia, Singapore and the UAE use it daily." },
  { q: "How is the freelance hourly rate calculated?", a: "We start from your desired monthly take-home, add tools/overhead, divide by billable hours, then gross-up by your tax + buffer percentage. The output is the minimum hourly you must charge to hit your target after taxes." },
  { q: "Is the SaaS price calculator based on real benchmarks?", a: "Yes. We use the standard LTV = ARPU × (1/churn) formula with a configurable LTV:CAC ratio (3x is the SaaS industry default). Tweak the inputs to model your own funnel." },
  { q: "Can I save my pricing scenarios?", a: "Sign up free to save unlimited pricing scenarios, share read-only links with co-founders, and convert them straight into a HustleAI proposal or invoice." },
];

/**
 * AI Pricing Calculator — pure-algo (no AI cost). 4 calculators in one tool:
 *   1. Freelancer hourly  →  desired income, hours, costs → rate
 *   2. Agency hourly      →  team cost + overhead + margin → billable rate
 *   3. Profit margin      →  revenue & costs → margin & markup
 *   4. SaaS pricing       →  CAC, churn, target LTV → price suggestion
 * Free for everyone — sign up to save scenarios.
 */
export default function PricingCalculator() {
  return (
    <ToolPageLayout
      title="AI Pricing Calculator"
      metaTitle="Free Freelance & Agency Pricing Calculator (USD, GBP, EUR, INR) | HustleAI"
      metaDescription="Free pricing calculator for freelancers, agencies and SaaS founders in the US, UK, EU, AU and India. Find your hourly rate, agency billable rate, profit margin & SaaS price in seconds."
      subtitle="Freelancer · Agency · Profit margin · SaaS — find the price you should be charging."
      icon={Calculator}
      path="/tools/pricing-calculator"
      toolKey="pricing-calculator"
      accent="from-violet-500 to-fuchsia-600"
      back={{ href: "/tools", label: "All tools" }}
      faqs={faqs}
    >
      <Card className="p-5">
          <Tabs defaultValue="freelancer">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="freelancer">Freelancer</TabsTrigger>
              <TabsTrigger value="agency">Agency</TabsTrigger>
              <TabsTrigger value="margin">Margin</TabsTrigger>
              <TabsTrigger value="saas">SaaS</TabsTrigger>
            </TabsList>
            <TabsContent value="freelancer" className="mt-5"><FreelancerCalc /></TabsContent>
            <TabsContent value="agency" className="mt-5"><AgencyCalc /></TabsContent>
            <TabsContent value="margin" className="mt-5"><MarginCalc /></TabsContent>
            <TabsContent value="saas" className="mt-5"><SaasCalc /></TabsContent>
          </Tabs>
      </Card>
    </ToolPageLayout>
  );
}

function NumField({ label, value, set, suffix }: { label: string; value: number; set: (n: number) => void; suffix?: string }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}{suffix && <span className="text-slate-400"> ({suffix})</span>}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => set(Number(e.target.value) || 0)} className="mt-1" />
    </div>
  );
}

function ResultBox({ rows }: { rows: { k: string; v: string; hl?: boolean }[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid sm:grid-cols-2 gap-3">
      {rows.map((r) => (
        <div key={r.k} className={r.hl ? "rounded-lg bg-white border border-emerald-200 p-3" : ""}>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">{r.k}</div>
          <div className={`mt-0.5 ${r.hl ? "text-2xl font-bold text-emerald-700" : "text-base font-semibold text-slate-900"}`}>{r.v}</div>
        </div>
      ))}
    </div>
  );
}

function FreelancerCalc() {
  const [income, setIncome] = useState(80000);
  const [hours, setHours] = useState(140);
  const [costs, setCosts] = useState(8000);
  const [tax, setTax] = useState(20);
  const out = useMemo(() => {
    const gross = income + costs;
    const grossWithTax = gross / (1 - tax / 100);
    const rate = hours > 0 ? Math.round(grossWithTax / hours) : 0;
    return { rate, grossWithTax: Math.round(grossWithTax) };
  }, [income, hours, costs, tax]);
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <NumField label="Desired monthly take-home" suffix="₹" value={income} set={setIncome} />
        <NumField label="Billable hours / month" value={hours} set={setHours} />
        <NumField label="Tools, software & overhead" suffix="₹" value={costs} set={setCosts} />
        <NumField label="Tax + buffer" suffix="%" value={tax} set={setTax} />
      </div>
      <ResultBox rows={[
        { k: "Hourly rate", v: `₹${out.rate.toLocaleString()}/hr`, hl: true },
        { k: "Required gross / month", v: `₹${out.grossWithTax.toLocaleString()}` },
      ]} />
    </div>
  );
}

function AgencyCalc() {
  const [team, setTeam] = useState(3);
  const [salary, setSalary] = useState(60000);
  const [overheadPct, setOverheadPct] = useState(40);
  const [marginPct, setMarginPct] = useState(35);
  const [hours, setHours] = useState(120);
  const out = useMemo(() => {
    const teamCost = team * salary;
    const overhead = teamCost * (overheadPct / 100);
    const totalCost = teamCost + overhead;
    const billable = team * hours;
    const breakEven = billable > 0 ? totalCost / billable : 0;
    const rate = breakEven / (1 - marginPct / 100);
    return { breakEven: Math.round(breakEven), rate: Math.round(rate), totalCost: Math.round(totalCost) };
  }, [team, salary, overheadPct, marginPct, hours]);
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <NumField label="Team size" value={team} set={setTeam} />
        <NumField label="Avg fully-loaded salary" suffix="₹/mo" value={salary} set={setSalary} />
        <NumField label="Overhead (rent, tools, etc.)" suffix="%" value={overheadPct} set={setOverheadPct} />
        <NumField label="Target profit margin" suffix="%" value={marginPct} set={setMarginPct} />
        <NumField label="Billable hours / person / month" value={hours} set={setHours} />
      </div>
      <ResultBox rows={[
        { k: "Billable hourly rate", v: `₹${out.rate.toLocaleString()}/hr`, hl: true },
        { k: "Break-even rate", v: `₹${out.breakEven.toLocaleString()}/hr` },
        { k: "Monthly cost base", v: `₹${out.totalCost.toLocaleString()}` },
      ]} />
    </div>
  );
}

function MarginCalc() {
  const [revenue, setRevenue] = useState(100000);
  const [costs, setCosts] = useState(40000);
  const out = useMemo(() => {
    const profit = revenue - costs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const markup = costs > 0 ? (profit / costs) * 100 : 0;
    return { profit, margin: margin.toFixed(1), markup: markup.toFixed(1) };
  }, [revenue, costs]);
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <NumField label="Revenue" suffix="₹" value={revenue} set={setRevenue} />
        <NumField label="Total cost (COGS)" suffix="₹" value={costs} set={setCosts} />
      </div>
      <ResultBox rows={[
        { k: "Profit margin", v: `${out.margin}%`, hl: true },
        { k: "Markup", v: `${out.markup}%` },
        { k: "Profit", v: `₹${out.profit.toLocaleString()}` },
      ]} />
    </div>
  );
}

function SaasCalc() {
  const [cac, setCac] = useState(2400);
  const [churn, setChurn] = useState(5);
  const [targetLtv, setTargetLtv] = useState(3);
  const out = useMemo(() => {
    const lifetimeMonths = churn > 0 ? 100 / churn : 0;
    const minArpu = lifetimeMonths > 0 ? (cac * targetLtv) / lifetimeMonths : 0;
    return {
      lifetime: Math.round(lifetimeMonths),
      arpu: Math.round(minArpu),
      ltv: Math.round(minArpu * lifetimeMonths),
    };
  }, [cac, churn, targetLtv]);
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <NumField label="Customer acquisition cost (CAC)" suffix="₹" value={cac} set={setCac} />
        <NumField label="Monthly churn" suffix="%" value={churn} set={setChurn} />
        <NumField label="Target LTV / CAC ratio" suffix="x" value={targetLtv} set={setTargetLtv} />
      </div>
      <ResultBox rows={[
        { k: "Suggested monthly price", v: `₹${out.arpu.toLocaleString()}/mo`, hl: true },
        { k: "Avg customer lifetime", v: `${out.lifetime} months` },
        { k: "Implied LTV", v: `₹${out.ltv.toLocaleString()}` },
      ]} />
    </div>
  );
}