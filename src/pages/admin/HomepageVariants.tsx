import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Check, Loader2, LayoutTemplate, Sparkles, Box, Radio, Type, GitCommit, CalendarClock, X } from "lucide-react";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import {
  HomepageVariant,
  setActiveHomepageVariant,
  scheduleHomepageVariant,
  clearHomepageSchedule,
} from "@/lib/homepage/useActiveHomepage";

const VARIANTS: { id: HomepageVariant; name: string; tagline: string; preview: string; icon: typeof LayoutTemplate; accent: string }[] = [
  { id: "v1", name: "V1 — Current",          tagline: "Operational SaaS. Today's live homepage — clean enterprise workspace narrative.",                       preview: "/",            icon: LayoutTemplate, accent: "from-slate-500/20 to-slate-700/20" },
  { id: "v2", name: "V2 — Workflow OS",       tagline: "Input → Generate → Approve → Deliver → Get Paid. Scroll-driven, living workflow narrative.",            preview: "/homepage-2",  icon: Sparkles,       accent: "from-emerald-500/20 to-violet-500/20" },
  { id: "v3", name: "V3 — Mission Control",   tagline: "Narrative-first dark experience. Five-scene transformation arc (Before → Capture → Automation → Delivery → Outcomes) with live R3F scene + telemetry.", preview: "/homepage-3",  icon: Box,            accent: "from-sky-500/20 to-violet-500/20" },
  { id: "v4", name: "V4 — While You Sleep",   tagline: "Async-first company narrative. Telemetry stream, rotating verbs, delivery pipeline.",                    preview: "/homepage-4",  icon: Radio,          accent: "from-amber-500/20 to-emerald-500/20" },
  { id: "v5", name: "V5 — Operating System",  tagline: "Apple-style. Huge typography. Massive breathing room. Run Clients · Delivery · Payments · Growth.",      preview: "/homepage-5",  icon: Type,           accent: "from-slate-500/20 to-emerald-500/20" },
  { id: "v6", name: "V6 — Live Product",      tagline: "Changelog-style homepage. Every entry maps to a real shipped capability.",                              preview: "/homepage-6",  icon: GitCommit,      accent: "from-violet-500/20 to-sky-500/20" },
];

export default function HomepageVariants() {
  const [active, setActive] = useState<HomepageVariant>("v1");
  const [scheduledVariant, setScheduledVariant] = useState<HomepageVariant | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [saving, setSaving] = useState<HomepageVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleVariant, setScheduleVariant] = useState<HomepageVariant>("v2");
  const [scheduleAt, setScheduleAt] = useState<string>("");
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function refresh() {
    const { data } = await supabase
      .from("homepage_variant_setting")
      .select("active_variant, scheduled_variant, scheduled_for")
      .eq("id", 1)
      .maybeSingle();
    if (data?.active_variant) setActive(data.active_variant as HomepageVariant);
    setScheduledVariant((data?.scheduled_variant as HomepageVariant | null) ?? null);
    setScheduledFor((data?.scheduled_for as string | null) ?? null);
  }

  const save = async (v: HomepageVariant) => {
    setSaving(v);
    try {
      await setActiveHomepageVariant(v);
      setActive(v);
      setScheduledVariant(null);
      setScheduledFor(null);
      toast({ title: "Homepage variant updated", description: `/ now renders ${v.toUpperCase()}.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Permission denied", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const schedule = async () => {
    if (!scheduleAt) {
      toast({ title: "Pick a date", description: "Choose when the scheduled variant should take over /.", variant: "destructive" });
      return;
    }
    const when = new Date(scheduleAt);
    if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      toast({ title: "Invalid date", description: "Schedule time must be in the future.", variant: "destructive" });
      return;
    }
    setScheduling(true);
    try {
      await scheduleHomepageVariant(scheduleVariant, when);
      await refresh();
      toast({ title: "Schedule saved", description: `${scheduleVariant.toUpperCase()} takes over / at ${when.toLocaleString()}.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Permission denied", variant: "destructive" });
    } finally {
      setScheduling(false);
    }
  };

  const clearSchedule = async () => {
    try {
      await clearHomepageSchedule();
      await refresh();
      toast({ title: "Schedule cleared" });
    } catch (e: any) {
      toast({ title: "Clear failed", description: e?.message ?? "Permission denied", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <SEO title="Homepage Variants — Admin" description="Switch which homepage `/` renders." path="/admin/homepage-variants" noindex />
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Homepage Variants</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Switch which homepage <code className="font-mono">/</code> renders, or schedule a future rollover. All variants stay accessible at their direct <code className="font-mono">/homepage-N</code> routes regardless.
          </p>
        </div>

        {scheduledVariant && scheduledFor && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold text-amber-900">{scheduledVariant.toUpperCase()}</span> takes over <code className="font-mono">/</code> at{" "}
              <span className="font-medium">{new Date(scheduledFor).toLocaleString()}</span>.
            </div>
            <Button size="sm" variant="ghost" onClick={clearSchedule}><X className="w-4 h-4 mr-1" /> Clear</Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {VARIANTS.map((v) => {
                const Icon = v.icon;
                const isActive = v.id === active;
                const isScheduled = !isActive && scheduledVariant === v.id;
                return (
                  <Card key={v.id} className={`overflow-hidden transition ${isActive ? "ring-2 ring-emerald-500" : isScheduled ? "ring-2 ring-amber-400" : ""}`}>
                    <div className={`h-1 bg-gradient-to-r ${v.accent}`} />
                    <CardHeader className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${v.accent}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-lg">{v.name}</CardTitle>
                        {isActive && <Badge className="ml-auto bg-emerald-500 hover:bg-emerald-500 text-white text-[10px]"><Check className="w-3 h-3 mr-1" />Active on /</Badge>}
                        {isScheduled && <Badge className="ml-auto bg-amber-500 hover:bg-amber-500 text-white text-[10px]"><CalendarClock className="w-3 h-3 mr-1" />Scheduled</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{v.tagline}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Direct route: </span>
                        <code className="font-mono text-[11px]">{v.preview}</code>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <Link to={v.preview} target="_blank" rel="noopener">
                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Preview
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={isActive || saving === v.id}
                          onClick={() => save(v.id)}
                        >
                          {saving === v.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                          {isActive ? "Active" : "Activate"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-amber-500" /> Schedule rollover
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Plan future months: pick a variant and the moment it should take over <code className="font-mono">/</code>. Visitors get the new variant automatically on their next page load — no redeploy.
                </p>
              </CardHeader>
              <CardContent className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Variant</label>
                  <select
                    value={scheduleVariant}
                    onChange={(e) => setScheduleVariant(e.target.value as HomepageVariant)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {VARIANTS.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Activates at</label>
                  <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                </div>
                <Button onClick={schedule} disabled={scheduling}>
                  {scheduling ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CalendarClock className="w-4 h-4 mr-1" />}
                  Schedule
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}