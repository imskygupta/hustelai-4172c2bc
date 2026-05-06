import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Eye, Trash2, ExternalLink, ArrowLeft } from "lucide-react";
import {
  listPages, upsertPage, deletePage, calcPageSeoScore, slugify,
  type SeoPageRow, type SeoStatus,
} from "@/lib/seo-cms";

const empty: Partial<SeoPageRow> = {
  slug: "", title: "", meta_description: "", h1: "", subhead: "",
  badge: "AI Workspace OS", bullets: [], sections: [], faqs: [], related_links: [],
  cta_label: "Start free", cta_href: "/signup",
  status: "draft", is_indexed: true, priority: 0.7, changefreq: "weekly",
  template_key: "default", locale: "en", json_ld: [],
};

function jsonField<T>(v: T) { return JSON.stringify(v ?? [], null, 2); }
function tryParse<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export function SeoLandingManager() {
  const [pages, setPages] = useState<SeoPageRow[] | null>(null);
  const [editing, setEditing] = useState<Partial<SeoPageRow> | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulletsTxt, setBulletsTxt] = useState("");
  const [sectionsTxt, setSectionsTxt] = useState("[]");
  const [faqsTxt, setFaqsTxt] = useState("[]");
  const [relatedTxt, setRelatedTxt] = useState("[]");

  const load = async () => setPages(await listPages());
  useEffect(() => { load(); }, []);

  const startEdit = (row?: SeoPageRow) => {
    const r = row ?? empty;
    setEditing(r);
    setBulletsTxt((r.bullets ?? []).join("\n"));
    setSectionsTxt(jsonField(r.sections ?? []));
    setFaqsTxt(jsonField(r.faqs ?? []));
    setRelatedTxt(jsonField(r.related_links ?? []));
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.slug || !editing.title) {
      toast({ title: "Slug and title are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: Partial<SeoPageRow> = {
      ...editing,
      slug: slugify(editing.slug),
      bullets: bulletsTxt.split("\n").map((s) => s.trim()).filter(Boolean),
      sections: tryParse(sectionsTxt, []),
      faqs: tryParse(faqsTxt, []),
      related_links: tryParse(relatedTxt, []),
      published_at: editing.status === "published" ? (editing.published_at ?? new Date().toISOString()) : editing.published_at ?? null,
    };
    payload.seo_score = calcPageSeoScore(payload);
    const { error } = await upsertPage(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Page saved" });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this landing page?")) return;
    const { error } = await deletePage(id);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  if (editing) {
    const score = calcPageSeoScore({
      ...editing,
      bullets: bulletsTxt.split("\n").filter(Boolean),
      sections: tryParse(sectionsTxt, []),
      faqs: tryParse(faqsTxt, []),
      related_links: tryParse(relatedTxt, []),
    });
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <div className="flex items-center gap-2">
            <Badge variant={score >= 70 ? "default" : "outline"}>SEO score {score}/100</Badge>
            {editing.slug && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/_preview/page/${slugify(editing.slug)}`} target="_blank" rel="noreferrer">
                  <Eye className="w-4 h-4 mr-1" /> Preview
                </a>
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Slug</Label>
            <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="freelancer-crm" />
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
          <Label>Meta title</Label>
          <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          <div className="text-xs text-muted-foreground mt-1">{(editing.title ?? "").length}/60 chars recommended</div>
        </div>
        <div>
          <Label>Meta description</Label>
          <Textarea rows={2} value={editing.meta_description ?? ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
          <div className="text-xs text-muted-foreground mt-1">{(editing.meta_description ?? "").length}/160 chars recommended</div>
        </div>
        <div>
          <Label>H1</Label>
          <Input value={editing.h1 ?? ""} onChange={(e) => setEditing({ ...editing, h1: e.target.value })} />
        </div>
        <div>
          <Label>Subheadline</Label>
          <Textarea rows={2} value={editing.subhead ?? ""} onChange={(e) => setEditing({ ...editing, subhead: e.target.value })} />
        </div>
        <div>
          <Label>Bullets (one per line)</Label>
          <Textarea rows={4} value={bulletsTxt} onChange={(e) => setBulletsTxt(e.target.value)} />
        </div>
        <div>
          <Label>Sections JSON — [{`{"title": "...", "body": "<p>html</p>"}`}]</Label>
          <Textarea rows={6} className="font-mono text-xs" value={sectionsTxt} onChange={(e) => setSectionsTxt(e.target.value)} />
        </div>
        <div>
          <Label>FAQs JSON — [{`{"q": "...", "a": "..."}`}]</Label>
          <Textarea rows={5} className="font-mono text-xs" value={faqsTxt} onChange={(e) => setFaqsTxt(e.target.value)} />
        </div>
        <div>
          <Label>Related links JSON — [{`{"label": "...", "to": "/path"}`}]</Label>
          <Textarea rows={4} className="font-mono text-xs" value={relatedTxt} onChange={(e) => setRelatedTxt(e.target.value)} />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label>CTA label</Label>
            <Input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} />
          </div>
          <div>
            <Label>CTA href</Label>
            <Input value={editing.cta_href ?? ""} onChange={(e) => setEditing({ ...editing, cta_href: e.target.value })} />
          </div>
          <div>
            <Label>OG image URL</Label>
            <Input value={editing.og_image ?? ""} onChange={(e) => setEditing({ ...editing, og_image: e.target.value })} />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label>Sitemap priority</Label>
            <Input type="number" step="0.1" min="0" max="1" value={editing.priority ?? 0.7}
              onChange={(e) => setEditing({ ...editing, priority: parseFloat(e.target.value) })} />
          </div>
          <div>
            <Label>Change freq</Label>
            <Select value={editing.changefreq ?? "weekly"} onValueChange={(v) => setEditing({ ...editing, changefreq: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["always","hourly","daily","weekly","monthly","yearly","never"].map((f) =>
                  <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_indexed ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_indexed: v })} />
              <Label className="!mb-0">Indexable</Label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-display font-bold">Landing pages</h2>
          <p className="text-sm text-muted-foreground">Manage SEO landing pages served at /:slug.</p>
        </div>
        <Button onClick={() => startEdit()}><Plus className="w-4 h-4 mr-1" /> New page</Button>
      </div>
      {pages === null ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pages yet — create the first one.</p>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div key={p.id} className="glass rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.title || p.slug}</div>
                <div className="text-xs text-muted-foreground truncate">/{p.slug} · score {p.seo_score}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={p.status === "published" ? "default" : "outline"}>{p.status}</Badge>
                {!p.is_indexed && <Badge variant="outline">noindex</Badge>}
                {p.status === "published" && (
                  <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
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