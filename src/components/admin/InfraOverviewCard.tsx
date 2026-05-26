// Compact dashboard card surfacing live Platform Registry counts.
// Pulls from platform-registry?action=overview (5-min cached server-side).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import manifest from "@/generated/infra-manifest.json";

export function InfraOverviewCard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (!token) return;
        const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/platform-registry?action=overview`, {
          headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        setData(await r.json());
      } catch { /* ignore */ }
    })();
  }, []);
  const stats = [
    { k: "Routes", v: manifest.routes.length },
    { k: "Edge fns", v: manifest.edge_functions.length },
    { k: "Databases", v: data?.db_count ?? "—" },
    { k: "DBs up", v: data?.db_reachable ?? "—" },
    { k: "Subdomains", v: `${data?.subdomains_online ?? "—"}/${data?.subdomains_total ?? "—"}` },
    { k: "Sitemaps OK", v: data?.sitemaps_ok ?? "—" },
  ];
  return (
    <div className="glass rounded-xl p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Infrastructure Overview
        </h3>
        <Link to="/admin/infrastructure/platform-registry" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
          Open Platform Registry <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.k} className="rounded-lg bg-muted/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.k}</div>
            <div className="text-xl font-bold mt-1">{s.v as any}</div>
          </div>
        ))}
      </div>
    </div>
  );
}