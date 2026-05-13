import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { conversionApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function HustleTemplates() {
  const [rows, setRows] = useState<any[]>([]);
  const [sql, setSql] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [bootstrapping, setBootstrapping] = useState(false);

  const refresh = () => {
    setLoading(true);
    setError("");
    conversionApi.templatesList()
      .then((r: any) => setRows(r.templates ?? []))
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  const loadSql = async () => {
    setBootstrapping(true);
    try {
      const r: any = await conversionApi.templatesBootstrapSql();
      setSql(r.sql ?? "");
      toast({ title: "Bootstrap SQL ready", description: `Target DB: ${r.db ?? "BLOG_DB"}. Paste into BLOG SQL editor.` });
    } catch (e: any) {
      toast({ title: "Failed to load SQL", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBootstrapping(false);
    }
  };

  const copy = async () => {
    if (!sql) return;
    await navigator.clipboard.writeText(sql);
    toast({ title: "Copied to clipboard", description: "Paste into BLOG_DB SQL editor." });
  };
  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Hustle Templates</h1>
            <p className="text-muted-foreground mt-1">
              Workflow + prompt + tool configurations served to Explore deep-links.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 uppercase tracking-wider">DB: BLOG_DB</span>
              <span className="text-muted-foreground">Isolated from primary runtime DB.</span>
              <Link to="/admin/blog/bootstrap" className="underline text-muted-foreground hover:text-foreground">All bootstrap SQL →</Link>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button>
            <Button variant="outline" onClick={loadSql} disabled={bootstrapping}>{bootstrapping ? "Loading…" : "Bootstrap SQL"}</Button>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <div className="font-medium mb-1">List failed</div>
            <div className="font-mono text-xs whitespace-pre-wrap">{error}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Likely the hustle_templates table isn't created yet — click <strong>Bootstrap SQL</strong> and paste it into the BLOG_DB SQL editor.
            </div>
          </div>
        )}

        {sql && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase text-amber-700 dark:text-amber-400">
                Target: BLOG_DB · Run inside BLOG DB SQL editor (NOT primary)
              </div>
              <Button size="sm" variant="outline" onClick={copy}>Copy</Button>
            </div>
            <pre className="text-xs overflow-auto whitespace-pre-wrap max-h-80">{sql}</pre>
          </div>
        )}
        <div className="rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Slug</th><th>Title</th><th>Cluster</th><th>Tools</th><th>CTA</th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-border/40">
                  <td className="p-3 font-mono text-xs">{t.slug}</td>
                  <td>{t.title}</td>
                  <td className="text-muted-foreground">{t.cluster}</td>
                  <td className="text-muted-foreground text-xs">{(t.tool_slugs ?? []).join(", ")}</td>
                  <td className="text-xs"><a className="underline" href={t.cta_href}>{t.cta_label}</a></td>
                </tr>
              ))}
              {!loading && rows.length === 0 && !error && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No templates yet — run the bootstrap SQL above (it auto-seeds 8 starter templates).
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}