import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/SEO";
import { Eye, ArrowRight, ShieldAlert } from "lucide-react";

type FieldType = "text" | "textarea" | "email" | "select" | "url";
interface Field { id: string; label: string; type: FieldType; required: boolean; options?: string }
interface Payload { name: string; fields: Field[] }

function decode(d: string | null): Payload | null {
  if (!d) return null;
  try {
    const json = decodeURIComponent(escape(atob(d)));
    const p = JSON.parse(json);
    if (!p?.fields?.length) return null;
    return p;
  } catch { return null; }
}

export default function IntakePreview() {
  const [params] = useSearchParams();
  const data = useMemo(() => decode(params.get("d")), [params]);
  const [values, setValues] = useState<Record<string, string>>({});

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <SEO title="Preview link expired | HustleAI" description="This intake form preview link is invalid or expired." path="/intake/preview" noindex />
        <div className="max-w-md w-full text-center space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/30 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-amber-300" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Preview link is empty or expired</h1>
          <p className="text-sm text-slate-400">
            This is a sandbox preview link generated from the form builder. To collect real client replies,
            publish your form from inside HustleAI Workspace — you'll get a permanent <code className="text-slate-300">/intake/&lt;your-slug&gt;</code> URL.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button asChild variant="outline" className="bg-transparent border-white/20 text-slate-200 hover:bg-white/10">
              <Link to="/tools/onboarding-form">Back to builder</Link>
            </Button>
            <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
              <Link to="/signup">Publish for real <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-10 px-4">
      <SEO title={`${data.name} — Preview | HustleAI`} description="Live preview of an intake form built with HustleAI." path="/intake/preview" noindex />
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <Eye className="w-3 h-3" /> Preview mode · replies are not stored
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900">{data.name}</h1>
        <p className="text-sm text-slate-500 mt-1">This is how your clients will see the form.</p>

        <form onSubmit={(e) => e.preventDefault()} className="mt-6 space-y-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {data.fields.map((f) => (
            <div key={f.id}>
              <label className="text-xs font-semibold text-slate-700">{f.label}{f.required && " *"}</label>
              <div className="mt-1">
                {f.type === "textarea" ? (
                  <Textarea rows={4} value={values[f.id] || ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />
                ) : f.type === "select" ? (
                  <Select value={values[f.id] || ""} onValueChange={(v) => setValues({ ...values, [f.id]: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {(f.options || "").split(",").map((o) => o.trim()).filter(Boolean).map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input type={f.type} value={values[f.id] || ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />
                )}
              </div>
            </div>
          ))}
          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">Submit (preview)</Button>
        </form>

        <div className="mt-6 rounded-xl bg-slate-900 text-slate-100 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="text-sm">
            <div className="font-semibold">Ready to collect real replies?</div>
            <div className="text-slate-400 text-xs mt-0.5">Publish from your workspace to get a permanent link + Intake Inbox.</div>
          </div>
          <Button asChild className="bg-emerald-500 hover:bg-emerald-600 shrink-0">
            <Link to="/signup">Publish form <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}