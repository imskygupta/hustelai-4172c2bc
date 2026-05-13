import { useEffect, useState } from "react";
import { conversionApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";

export default function AdsenseReadiness() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const refresh = () => conversionApi.adsenseOverview().then(setData).catch(() => {});
  useEffect(() => { refresh(); }, []);
  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">AdSense Readiness</h1>
            <p className="text-muted-foreground mt-1">Word count, internal links, FAQ, readability, ad-safety per article.</p>
          </div>
          <Button disabled={loading} onClick={async () => {
            setLoading(true);
            await conversionApi.adsenseRescanAll().catch(() => {});
            await refresh();
            setLoading(false);
          }}>{loading ? "Rescanning…" : "Rescan all"}</Button>
        </header>
        {data?.summary && (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Avg score" value={data.summary.avg} />
            <Stat label="Posts" value={data.summary.total} />
            <Stat label="Below 70" value={data.summary.below_70} />
          </div>
        )}
        <div className="rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Title</th><th>Score</th><th>Status</th><th>Published</th></tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="p-3"><a className="underline" href={`https://blogs.hustlaiapp.in/${r.slug}`} target="_blank" rel="noreferrer">{r.title}</a></td>
                  <td className={r.adsense_score >= 70 ? "text-emerald-600" : "text-amber-600"}>{r.adsense_score ?? "—"}</td>
                  <td className="text-muted-foreground">{r.status}</td>
                  <td className="text-muted-foreground text-xs">{r.published_at?.slice(0, 10) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}