import { useEffect, useState } from "react";
import { conversionApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";

export default function HustleTemplates() {
  const [rows, setRows] = useState<any[]>([]);
  const [sql, setSql] = useState("");
  const refresh = () => conversionApi.templatesList().then((r: any) => setRows(r.templates ?? [])).catch(() => {});
  useEffect(() => { refresh(); }, []);
  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Hustle Templates</h1>
            <p className="text-muted-foreground mt-1">Workflow + prompt + tool configurations served to Explore deep-links.</p>
          </div>
          <Button variant="outline" onClick={async () => {
            const r: any = await conversionApi.templatesBootstrapSql();
            setSql(r.sql ?? "");
          }}>Bootstrap SQL</Button>
        </header>
        {sql && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="text-xs uppercase mb-2 text-amber-700 dark:text-amber-400">Run inside BLOG DB SQL editor (NOT primary)</div>
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
              {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No templates yet — run the bootstrap SQL above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}