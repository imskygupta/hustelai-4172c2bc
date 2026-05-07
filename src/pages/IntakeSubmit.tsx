import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { intakePublicGet, intakePublicSubmit, IntakeField } from "@/lib/intake-os/api";
import { CheckCircle2, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function IntakeSubmit() {
  const { slug } = useParams();
  const [form, setForm] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [client, setClient] = useState({ name: "", email: "", company: "" });
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!slug) return;
    intakePublicGet(slug).then(setForm).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await intakePublicSubmit({
        slug, payload: values,
        client_name: client.name, client_email: client.email, client_company: client.company,
      });
      setDone(true);
    } catch (e: any) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (err && !form) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{err}</div>;

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-semibold">Submission received</h1>
        <p className="text-sm text-muted-foreground">Thanks{client.name ? `, ${client.name}` : ""}. We'll review and get back to you shortly.</p>
        <p className="text-xs text-muted-foreground/70">Powered by HustleAI Workspace OS</p>
      </div>
    </div>
  );

  const fields = (form?.fields || []) as IntakeField[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <SEO title={`${form.title} | Intake`} description={form.description || "Project intake"} path="" noindex />
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{form.title}</h1>
          {form.description && <p className="text-muted-foreground mt-2">{form.description}</p>}
        </div>

        <form onSubmit={submit} className="space-y-5 bg-card border border-border rounded-2xl p-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">Your name *</label>
              <Input required value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} /></div>
            <div><label className="text-xs font-medium">Email *</label>
              <Input required type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} /></div>
            <div className="md:col-span-2"><label className="text-xs font-medium">Company (optional)</label>
              <Input value={client.company} onChange={e => setClient({ ...client, company: e.target.value })} /></div>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium">{f.label}{f.required && " *"}</label>
                {f.type === "textarea" ? (
                  <Textarea rows={4} required={f.required} placeholder={f.placeholder}
                    value={values[f.key] || ""} onChange={e => setValues({ ...values, [f.key]: e.target.value })} />
                ) : f.type === "select" ? (
                  <Select value={values[f.key] || ""} onValueChange={v => setValues({ ...values, [f.key]: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{(f.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input type={f.type} required={f.required} placeholder={f.placeholder}
                    value={values[f.key] || ""} onChange={e => setValues({ ...values, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-4">Powered by HustleAI · Your data is secure.</p>
      </div>
    </div>
  );
}