import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Save, Upload, ImageIcon, PenLine, Stamp, Palette } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getBrandKit, upsertBrandKit, uploadBrandAsset, type BrandKit } from "@/lib/workspace-docs/infra";
import { THEME_LIST } from "@/lib/workspace-docs/themes";
import type { ThemeId } from "@/lib/workspace-docs/types";

export default function BrandKitPage() {
  const { user } = useAuth();
  const [kit, setKit] = useState<BrandKit>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getBrandKit(user.id).then(k => { setKit(k || {}); setLoading(false); });
  }, [user]);

  const upd = (k: keyof BrandKit, v: any) => setKit(p => ({ ...p, [k]: v }));

  async function save() {
    if (!user) return;
    setSaving(true);
    try { await upsertBrandKit(user.id, kit); toast.success("Brand kit saved"); }
    catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  }

  async function onUpload(field: "logo_url" | "signature_url" | "stamp_url", kind: "logo" | "signature" | "stamp", file: File | null) {
    if (!file || !user) return;
    setUploading(field);
    try {
      const url = await uploadBrandAsset(user.id, file, kind);
      const next = { ...kit, [field]: url };
      setKit(next);
      await upsertBrandKit(user.id, next);
      toast.success(`${kind} uploaded`);
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    finally { setUploading(null); }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading brand kit…</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Brand Kit</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload once. Every quotation, agreement, invoice and proposal inherits these defaults automatically.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AssetUploader label="Logo" icon={<ImageIcon className="h-4 w-4" />} url={kit.logo_url} busy={uploading === "logo_url"} onFile={f => onUpload("logo_url", "logo", f)} />
        <AssetUploader label="Signature" icon={<PenLine className="h-4 w-4" />} url={kit.signature_url} busy={uploading === "signature_url"} onFile={f => onUpload("signature_url", "signature", f)} />
        <AssetUploader label="Stamp" icon={<Stamp className="h-4 w-4" />} url={kit.stamp_url} busy={uploading === "stamp_url"} onFile={f => onUpload("stamp_url", "stamp", f)} />
      </div>

      <Section title="Business identity">
        <Two><F label="Business name"><Input value={kit.business_name || ""} onChange={e => upd("business_name", e.target.value)} /></F>
             <F label="Tagline"><Input value={kit.tagline || ""} onChange={e => upd("tagline", e.target.value)} /></F></Two>
        <Two><F label="Website"><Input value={kit.website || ""} onChange={e => upd("website", e.target.value)} placeholder="https://" /></F>
             <F label="Email"><Input value={kit.email || ""} onChange={e => upd("email", e.target.value)} /></F></Two>
        <Two><F label="Phone"><Input value={kit.phone || ""} onChange={e => upd("phone", e.target.value)} /></F>
             <F label="Address"><Input value={kit.address || ""} onChange={e => upd("address", e.target.value)} /></F></Two>
      </Section>

      <Section title="Colors & theme">
        <Two>
          <F label="Brand color">
            <div className="flex items-center gap-2">
              <input type="color" value={kit.brand_color || "#0a0a0a"} onChange={e => upd("brand_color", e.target.value)} className="h-9 w-12 rounded border border-border" />
              <Input value={kit.brand_color || ""} onChange={e => upd("brand_color", e.target.value)} />
            </div>
          </F>
          <F label="Accent color">
            <div className="flex items-center gap-2">
              <input type="color" value={kit.accent_color || "#1d4ed8"} onChange={e => upd("accent_color", e.target.value)} className="h-9 w-12 rounded border border-border" />
              <Input value={kit.accent_color || ""} onChange={e => upd("accent_color", e.target.value)} />
            </div>
          </F>
        </Two>
        <Two>
          <F label="Default theme">
            <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={(kit.default_theme as ThemeId) || "minimal-dark"}
              onChange={e => upd("default_theme", e.target.value as ThemeId)}>
              {THEME_LIST.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </F>
          <F label="Default currency"><Input value={kit.default_currency || "INR"} onChange={e => upd("default_currency", e.target.value)} /></F>
        </Two>
      </Section>

      <Section title="Tax & footer">
        <Two>
          <F label="Tax label (GST / VAT)"><Input value={kit.tax_label || ""} onChange={e => upd("tax_label", e.target.value)} placeholder="GST" /></F>
          <F label="Tax ID"><Input value={kit.tax_id || ""} onChange={e => upd("tax_id", e.target.value)} placeholder="22AAAAA0000A1Z5" /></F>
        </Two>
        <F label="Default payment terms">
          <Textarea rows={2} value={kit.default_payment_terms || ""} onChange={e => upd("default_payment_terms", e.target.value)} placeholder="50% upfront. Remaining before final delivery." />
        </F>
        <F label="Footer text"><Input value={kit.footer_text || ""} onChange={e => upd("footer_text", e.target.value)} placeholder="Thank you for working with us." /></F>
      </Section>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-lg shadow-primary/30 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save brand kit
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      {children}
    </motion.section>
  );
}
function Two({ children }: any) { return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>; }
function F({ label, children }: any) {
  return <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}

function AssetUploader({ label, icon, url, busy, onFile }: { label: string; icon: any; url?: string | null; busy: boolean; onFile: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
      <div className="aspect-[3/2] rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
        {url ? <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
             : <span className="text-xs text-muted-foreground">No {label.toLowerCase()} yet</span>}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0] || null)} />
      <button onClick={() => ref.current?.click()}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
        <Upload className="h-3 w-3" /> {url ? "Replace" : "Upload"}
      </button>
    </div>
  );
}