import { useEffect, useState } from "react";
import { blogApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Post = any;

export default function BlogAdmin() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [editing, setEditing] = useState<Post | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const r = await blogApi.adminList();
    setPosts(r.posts ?? []);
    const d = await blogApi.adminDrafts();
    setDrafts(d.drafts ?? []);
  };

  useEffect(() => { reload(); }, []);

  const open = async (id: string) => {
    const r = await blogApi.adminGet(id);
    setEditing(r.post); setIssues([]);
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const r = await blogApi.adminSave(editing);
      toast.success("Saved");
      setEditing(r.post);
      reload();
    } catch (e: any) { toast.error(String(e.message ?? e)); }
    finally { setBusy(false); }
  };

  const validate = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-admin?action=validate`, {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          authorization: `Bearer ${(await import("@/integrations/supabase/client")).supabase ? (await (await import("@/integrations/supabase/client")).supabase.auth.getSession()).data.session?.access_token : ""}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ post: editing }),
      }).then(r => r.json());
      setIssues(res.issues ?? []);
      if (!(res.issues ?? []).length) toast.success("Editorial checks passed");
      else toast.warning(`${res.issues.length} issues to fix`);
    } finally { setBusy(false); }
  };

  const transition = async (status: string) => {
    if (!editing?.id) { toast.error("Save first"); return; }
    setBusy(true);
    try {
      await blogApi.adminTransition(editing.id, status);
      toast.success(`Moved to ${status}`);
      reload();
    } catch (e: any) {
      try {
        const parsed = JSON.parse(String(e.message).split(" ")[0] === "/blog-admin" ? "{}" : e.message);
        if (parsed.issues) setIssues(parsed.issues);
      } catch {}
      toast.error("Validation failed — check editorial issues");
    } finally { setBusy(false); }
  };

  const generate = async (topic: string) => {
    setBusy(true);
    try { await blogApi.adminGenerate(topic); toast.success("Draft generated"); reload(); }
    catch (e: any) { toast.error(String(e.message ?? e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60 px-6 h-14 flex items-center justify-between">
        <h1 className="font-medium">Blog editorial</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" asChild><a href="/admin/blog/seo">SEO health →</a></Button>
          <Button size="sm" variant="ghost" asChild><a href="/admin/blog/operations">Operations →</a></Button>
          <Button size="sm" variant="outline" onClick={() => generate("freelance workflow automation")}>+ AI draft</Button>
          <Button size="sm" onClick={() => setEditing({ status: "draft", body_md: "", title: "Untitled", cta_blocks: [], faq: [] })}>+ New post</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] min-h-[calc(100vh-3.5rem)]">
        <aside className="border-r border-border/60 overflow-y-auto">
          <div className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Posts</div>
          {posts.map(p => (
            <button key={p.id} onClick={() => open(p.id)} className={`w-full text-left px-4 py-2 text-sm border-l-2 hover:bg-muted/40 ${editing?.id === p.id ? "border-foreground bg-muted/40" : "border-transparent"}`}>
              <div className="truncate">{p.title}</div>
              <div className="text-[11px] text-muted-foreground">{p.status} · {p.slug}</div>
            </button>
          ))}
          {drafts.length > 0 && (<>
            <div className="px-4 py-3 mt-4 text-xs uppercase tracking-wide text-muted-foreground">AI drafts</div>
            {drafts.map((d: any) => (
              <div key={d.id} className="px-4 py-2 text-xs border-l-2 border-transparent">
                <div className="truncate">{d.topic}</div>
              </div>
            ))}
          </>)}
        </aside>

        <main className="p-6 max-w-4xl">
          {!editing ? <p className="text-muted-foreground">Select a post or create a new one.</p> : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Title"><Input value={editing.title ?? ""} onChange={e => setEditing({ ...editing, title: e.target.value })} /></Field>
                <Field label="Slug"><Input value={editing.slug ?? ""} onChange={e => setEditing({ ...editing, slug: e.target.value })} /></Field>
                <Field label="Meta title (30–65)"><Input value={editing.meta_title ?? ""} onChange={e => setEditing({ ...editing, meta_title: e.target.value })} /></Field>
                <Field label="Focus keyword"><Input value={editing.focus_keyword ?? ""} onChange={e => setEditing({ ...editing, focus_keyword: e.target.value })} /></Field>
              </div>
              <Field label="Meta description (70–165)"><Textarea rows={2} value={editing.meta_description ?? ""} onChange={e => setEditing({ ...editing, meta_description: e.target.value })} /></Field>
              <Field label="Excerpt"><Textarea rows={2} value={editing.excerpt ?? ""} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} /></Field>
              <Field label="Hero image URL"><Input value={editing.hero_image ?? ""} onChange={e => setEditing({ ...editing, hero_image: e.target.value })} /></Field>
              <Field label="Body (Markdown)">
                <Textarea rows={22} className="font-mono text-sm" value={editing.body_md ?? ""} onChange={e => setEditing({ ...editing, body_md: e.target.value })} />
              </Field>

              {issues.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <div className="font-medium mb-1">Editorial checks</div>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {issues.map((i, k) => <li key={k}>{i}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                <Button onClick={save} disabled={busy}>Save</Button>
                <Button variant="outline" onClick={validate} disabled={busy}>Run editorial checks</Button>
                <Button variant="outline" onClick={() => transition("in_review")} disabled={busy}>Send to review</Button>
                <Button onClick={() => transition("published")} disabled={busy}>Publish</Button>
                <span className="ml-auto text-xs text-muted-foreground self-center">Status: {editing.status}</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}