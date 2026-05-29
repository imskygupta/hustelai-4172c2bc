import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Check, Loader2, LayoutTemplate, Sparkles, Box, Radio } from "lucide-react";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { HomepageVariant, setActiveHomepageVariant } from "@/lib/homepage/useActiveHomepage";

const VARIANTS: { id: HomepageVariant; name: string; tagline: string; preview: string; icon: typeof LayoutTemplate; accent: string }[] = [
  { id: "v1", name: "V1 — Current", tagline: "Clean enterprise workspace. Today's live homepage.", preview: "/", icon: LayoutTemplate, accent: "from-slate-500/20 to-slate-700/20" },
  { id: "v2", name: "V2 — Motion-first", tagline: "GSAP-driven hero, pinned workflow scroll, floating modules.", preview: "/homepage-2", icon: Sparkles, accent: "from-emerald-500/20 to-violet-500/20" },
  { id: "v3", name: "V3 — 3D command center", tagline: "Pipeline visualization (3D scene shipping next; isometric fallback live).", preview: "/homepage-3", icon: Box, accent: "from-sky-500/20 to-violet-500/20" },
  { id: "v4", name: "V4 — Live operations", tagline: "Async telemetry stream, rotating hero, delivery pipeline.", preview: "/homepage-4", icon: Radio, accent: "from-amber-500/20 to-emerald-500/20" },
];

export default function HomepageVariants() {
  const [active, setActive] = useState<HomepageVariant>("v1");
  const [saving, setSaving] = useState<HomepageVariant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("homepage_variant_setting")
        .select("active_variant")
        .eq("id", 1)
        .maybeSingle();
      if (data?.active_variant) setActive(data.active_variant as HomepageVariant);
      setLoading(false);
    })();
  }, []);

  const save = async (v: HomepageVariant) => {
    setSaving(v);
    try {
      await setActiveHomepageVariant(v);
      setActive(v);
      toast({ title: "Homepage variant updated", description: `/ now renders ${v.toUpperCase()}.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Permission denied", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <SEO title="Homepage Variants — Admin" description="Switch which homepage `/` renders." path="/admin/homepage-variants" noindex />
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Homepage Variants</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Switch which experimental homepage <code className="font-mono">/</code> renders. V2/V3/V4 stay accessible at their direct routes regardless. Changes propagate on the next page load.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {VARIANTS.map((v) => {
              const Icon = v.icon;
              const isActive = v.id === active;
              return (
                <Card key={v.id} className={`overflow-hidden transition ${isActive ? "ring-2 ring-emerald-500" : ""}`}>
                  <div className={`h-1 bg-gradient-to-r ${v.accent}`} />
                  <CardHeader className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${v.accent}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-lg">{v.name}</CardTitle>
                      {isActive && <Badge className="ml-auto bg-emerald-500 hover:bg-emerald-500 text-white text-[10px]"><Check className="w-3 h-3 mr-1" />Active on /</Badge>}
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
                        {isActive ? "Active" : "Set as /"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}