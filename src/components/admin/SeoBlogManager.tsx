import { blogDb } from "@/integrations/blog/db";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Eye, Trash2, ArrowLeft, Sparkles } from "lucide-react";
import {
  upsertBlog, deleteBlog, calcBlogSeoScore, slugify,
  type SeoBlogRow, type SeoStatus,
} from "@/lib/seo-cms";

const empty: Partial<SeoBlogRow> = {
  slug: "", title: "", excerpt: "", content: "", meta_description: "",
  category: "General", tags: [], author_name: "HustleAI Team",
  status: "draft", is_indexed: true, json_ld: [],
};

async function listAll(): Promise<SeoBlogRow[]> {
  const { data } = await blogDb.from("seo_blog_posts" as any).select("*").order("updated_at", { ascending: false });
  return (data as any) ?? [];
}

export function SeoBlogManager() {
  const [posts, setPosts] = useState<SeoBlogRow[] | null>(null);
  const [editing, setEditing] = useState<Partial<SeoBlogRow> | null>(null);
  const [tagsTxt, setTagsTxt] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const load = async () => setPosts(await listAll());
  useEffect(() => { load(); }, []);

  const startEdit = (row?: SeoBlogRow) => {
    const r = row ?? empty;
    setEditing(r);
    setTagsTxt((r.tags ?? []).join(", "));
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.slug || !editing.title) {
      toast({ title: "Slug and title are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: Partial<SeoBlogRow> = {
      ...editing,
      slug: slugify(editing.slug),
      tags: tagsTxt.split(",").map((s) => s.trim()).filter(Boolean),
      published_at: editing.status === "published" ? (editing.published_at ?? new Date().toISOString()) : editing.published_at ?? null,
    };
    payload.seo_score = calcBlogSeoScore(payload);
    const { error } = await upsertBlog(payload);
    setSaving(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "Post saved" });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await deleteBlog(id);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  const aiDraft = async () => {
    if (!editing?.title) {
      toast({ title: "Add a title first to draft from", variant: "destructive" });
      return;
    }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          feature: "seo_blog_draft",
          messages: [{
            role: "user",
            content: `Write an SEO-optimized blog post in Markdown about: "${editing.title}". Audience: freelancers and small agencies using an AI workspace OS. 800-1200 words. Include H2/H3 structure, bullet lists, and a closing CTA paragraph. Avoid hype. Return only Markdown.`,
          }],
        },
      });
      if (error) throw error;
      const text = (data as any)?.content ?? (data as any)?.text ?? "";
      if (text) setEditing({ ...editing, content: text });
      else toast({ title: "AI returned no content", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "AI draft failed", description: e?.message ?? "Edge function not available", variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  if (editing) {
    const score = calcBlogSeoScore({
      ...editing,
      tags: tagsTxt.split(",").map((s) => s.trim()).filter(Boolean),
    });
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <div className="flex items-center gap-2">
            <Badge variant={score >= 70 ? "default" : "outline"}>SEO score {score}/100</Badge>
            {editing.slug && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/_preview/blog/${slugify(editing.slug)}`} target="_blank" rel="noreferrer">
                  <Eye className="w-4 h-4 mr-1" /> Preview
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={aiDraft} disabled={aiBusy}>
              {aiBusy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} AI draft
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Slug</Label>
            <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={editing.status ?? "draft"} onValueChange={(v) => setEditing({ ...editing, status: v as SeoStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Title</Label>
          <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
        </div>
        <div>
          <Label>Meta description</Label>
          <Textarea rows={2} value={editing.meta_description ?? ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
          <div className="text-xs text-muted-foreground mt-1">{(editing.meta_description ?? "").length}/160 chars</div>
        </div>
        <div>
          <Label>Excerpt</Label>
          <Textarea rows={2} value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
        </div>
        <div>
          <Label>Content (Markdown)</Label>
          <Textarea rows={18} className="font-mono text-xs" value={editing.content ?? ""}
            onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label>Category</Label>
            <Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={tagsTxt} onChange={(e) => setTagsTxt(e.target.value)} />
          </div>
          <div>
            <Label>Author</Label>
            <Input value={editing.author_name ?? ""} onChange={(e) => setEditing({ ...editing, author_name: e.target.value })} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Cover image URL</Label>
            <Input value={editing.cover_image ?? ""} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} />
          </div>
          <div>
            <Label>OG image URL</Label>
            <Input value={editing.og_image ?? ""} onChange={(e) => setEditing({ ...editing, og_image: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={editing.is_indexed ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_indexed: v })} />
          <Label className="!mb-0">Indexable</Label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-display font-bold">Insights / Blog</h2>
          <p className="text-sm text-muted-foreground">SEO posts served at /insights/:slug.</p>
        </div>
        <Button onClick={() => startEdit()}><Plus className="w-4 h-4 mr-1" /> New post</Button>
      </div>
      {posts === null ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="glass rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground truncate">/insights/{p.slug} · {p.category} · score {p.seo_score}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={p.status === "published" ? "default" : "outline"}>{p.status}</Badge>
                {!p.is_indexed && <Badge variant="outline">noindex</Badge>}
                <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>Edit</Button>
                <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}