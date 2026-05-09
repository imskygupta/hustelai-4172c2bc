import { useMemo, useState } from "react";
import { Calculator, Sparkles, Loader2, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { TemplatePicker } from "@/components/tools/TemplatePicker";
import { SignupCTADialog } from "@/components/SignupCTADialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
      <TemplatePicker toolKey="pricing-calculator" />
      <AiPricingPrompt />
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

type AiTier = { name: string; price: number; delivery_days: number; what_you_get: string[]; best_for: string };
type AiResult = { currency: string; tiers: AiTier[]; rationale: string; psych_tip: string };

function AiPricingPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [desc, setDesc] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [market, setMarket] = useState("Indian freelance market");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);

  const run = async () => {
    if (desc.trim().length < 10) {
      toast.error("Tell us a bit more about your business (10+ characters).");
      return;
    }
    if (!user) {
      setSignupOpen(true);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("gig-price-calculator", {
        body: { service_description: desc, experience_level: level, target_market: market },
      });
      if (error) {
        const msg = (error as any)?.context?.responseText || error.message || "";
        if (msg.includes("limit") || msg.includes("Free tier")) {
          toast("AI quota reached", {
            description: "Upgrade to Pro for unlimited AI pricing suggestions.",
            action: { label: "Upgrade", onClick: () => navigate("/plans") },
          });
        } else {
          toast.error("AI pricing failed. Please try again.");
        }
        return;
      }
      if (data?.result) setResult(data.result);
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="p-5 mb-4 border-violet-200 bg-gradient-to-br from-violet-50/60 via-white to-fuchsia-50/40">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-900">Let AI price your business</div>
            <div className="text-xs text-slate-600">Describe what you sell — we'll suggest 3 tier prices, deliverables and a positioning tip.</div>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="e.g. I design Shopify stores for D2C skincare brands in India. 2 years experience, mostly small founders."
            className="min-h-[88px] bg-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Experience (junior / intermediate / senior)" className="bg-white text-xs" />
            <Input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="Target market (India, US, UK…)" className="bg-white text-xs" />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-[11px] text-slate-500">
              {user ? "AI runs against your plan's monthly quota." : "Free preview — sign up to run AI pricing."}
            </div>
            <Button onClick={run} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white">
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : user ? <Sparkles className="w-3.5 h-3.5 mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
              {user ? "Suggest pricing with AI" : "Sign up to run AI"}
            </Button>
          </div>
        </div>

        {result && (
          <div className="mt-4 space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              {result.tiers.map((t) => (
                <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-violet-700">{t.name}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">{result.currency === "INR" ? "₹" : ""}{t.price.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-500">{t.delivery_days} days · {t.best_for}</div>
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-700 list-disc pl-4">
                    {t.what_you_get.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Why this pricing</div>
                {result.rationale}
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold mb-1">Positioning tip</div>
                {result.psych_tip}
              </div>
            </div>
          </div>
        )}
      </Card>
      <SignupCTADialog open={signupOpen} onClose={() => setSignupOpen(false)} query={desc} />
    </>
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