import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Sparkles, FileText, CheckCircle2, XCircle, MessageCircle, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/workspace-portal`;

async function call(body: any) {
  const r = await fetch(FN_URL, { method: "POST", headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string }, body: JSON.stringify(body) });
  return r.json();
}

export default function WorkspacePortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(localStorage.getItem("portal_name") || "");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      const res = await call({ action: "view", token });
      if (res.error) { toast.error(res.error); setLoading(false); return; }
      setData(res); setLoading(false);
    })();
  }, [token]);

  const approve = async (target_type: string, target_id: string, status: string) => {
    const res = await call({ action: "approve", token, target_type, target_id, status });
    if (res.error) return toast.error(res.error);
    toast.success(status === "approved" ? "Approved ✓" : status === "rejected" ? "Rejected" : "Changes requested");
    const refresh = await call({ action: "view", token });
    setData(refresh);
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    if (name) localStorage.setItem("portal_name", name);
    const res = await call({ action: "comment", token, body: comment, author_name: name || "Client" });
    if (res.error) return toast.error(res.error);
    setComment("");
    const refresh = await call({ action: "view", token });
    setData(refresh);
    toast.success("Comment sent");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data?.workspace) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Portal link is invalid or has expired.</p></div>;

  const { workspace: w, docs = [], tasks = [], payments = [], comments = [], approvals = [], files = [], portal } = data;
  const approvalFor = (type: string, id: string) => approvals.find((a: any) => a.target_type === type && a.target_id === id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/60">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/30 flex items-center justify-center overflow-hidden">
            {w.logo_url ? <img src={w.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-5 w-5 text-primary-foreground" />}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Client workspace</p>
            <h1 className="text-lg font-semibold">{w.client_name}{w.company_name ? ` · ${w.company_name}` : ""}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {w.ai_summary && (
          <section className="rounded-2xl border border-primary/20 bg-card p-5">
            <p className="text-sm italic flex gap-2"><Sparkles className="h-4 w-4 text-primary mt-0.5" />{w.ai_summary}</p>
          </section>
        )}

        {!!docs.length && (
          <Section title="Documents for review">
            <div className="space-y-3">
              {docs.map((d: any) => {
                const a = approvalFor("doc", d.id);
                return (
                  <div key={d.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{d.doc_type?.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">Status: {a?.status || "pending"}</p>
                    </div>
                    {a?.status !== "approved" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => approve("doc", d.id, "changes_requested")}>Changes</Button>
                        <Button size="sm" variant="outline" onClick={() => approve("doc", d.id, "rejected")}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                        <Button size="sm" onClick={() => approve("doc", d.id, "approved")}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>
                      </>
                    )}
                    {a?.status === "approved" && <span className="text-xs text-emerald-500 font-medium">Approved ✓</span>}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {!!tasks.length && (
          <Section title="Project progress">
            <ul className="space-y-1.5 text-sm">
              {tasks.map((t: any) => (
                <li key={t.id} className="flex justify-between border-b border-border/40 pb-1.5">
                  <span>{t.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">{t.stage}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!!payments.length && (
          <Section title="Payments">
            <ul className="space-y-2">
              {payments.map((p: any) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="flex-1">{p.label}</span>
                  <span>{p.currency} {p.amount}</span>
                  <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-muted">{p.status}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!!files.length && (
          <Section title="Files">
            <ul className="space-y-1.5">
              {files.map((f: any) => (
                <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">{f.name}</a></li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Conversation">
          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
            {comments.length === 0 && <p className="text-xs text-muted-foreground">No messages yet — say hi 👋</p>}
            {comments.map((c: any) => (
              <div key={c.id} className={`rounded-xl px-3 py-2 max-w-[85%] ${c.author_type === "client" ? "bg-amber-500/10 border border-amber-500/20 ml-auto" : "bg-primary/10 border border-primary/20"}`}>
                <p className="text-[10px] font-medium opacity-70">{c.author_type === "client" ? (c.author_name || "You") : "Freelancer"}</p>
                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            <Textarea placeholder="Write a message..." value={comment} onChange={e => setComment(e.target.value)} />
            <Button onClick={sendComment} className="w-full"><MessageCircle className="h-4 w-4 mr-2" />Send</Button>
          </div>
        </Section>

        <p className="text-center text-xs text-muted-foreground/60 pt-6">Powered by HustleAI · hustlaiapp.in</p>
      </main>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}