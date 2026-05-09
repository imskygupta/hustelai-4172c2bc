import { useRef, useState } from "react";
import { IdCard, Download, Lock, Upload, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { useToolGate } from "@/components/tools/ToolGate";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const faqs = [
  { q: "Is the business card generator really free?", a: "Yes. Designing, previewing and switching themes is fully free in the browser. Sign up free to download the vCard, generate a print-ready PDF and use the branded studio." },
  { q: "Does the vCard work on iPhone and Android?", a: "Yes — the .vcf file is the universal contact card format. AirDrop it to an iPhone, share via WhatsApp, or attach to email — the recipient gets a one-tap 'Add to contacts' on iOS and Android." },
  { q: "Can I add my logo?", a: "Sign up free to upload your logo, set brand colours and fonts in the HustleAI Brand Kit — every business card and invoice automatically picks them up." },
  { q: "Are the cards print-ready?", a: "Yes. The 1.6:1 ratio matches both US (3.5\"×2\") and standard EU (85×55mm) business card sizes. Export PDF in the branded studio for press-ready bleed." },
  { q: "Can I share my card as a link?", a: "Sign up free to publish a public profile page (hustlaiapp.in/c/your-name) that doubles as a digital business card with QR code." },
];

/**
 * Standalone Business Card tool — no AI prefill, no client picker.
 * Just type your details, pick a theme, copy a vCard or print to PDF.
 * For the full branded studio (themes, exports), it links to /workspaces?intent=business_card.
 */

const THEMES = [
  { id: "midnight",  bg: "bg-slate-900",       fg: "text-white",   accent: "text-emerald-300" },
  { id: "porcelain", bg: "bg-white border border-slate-200", fg: "text-slate-900", accent: "text-emerald-600" },
  { id: "sunset",    bg: "bg-gradient-to-br from-orange-500 to-rose-600", fg: "text-white", accent: "text-amber-200" },
  { id: "ocean",     bg: "bg-gradient-to-br from-sky-600 to-indigo-700",  fg: "text-white", accent: "text-cyan-200" },
];

export default function BusinessCardGenerator() {
  const { guard, gate } = useToolGate("business-card", "download your contact card");
  const { profile } = useAuth();
  const navigate = useNavigate();
  const tier = profile?.subscription_tier || "free";
  const canUseLogo = tier === "pro" || tier === "elite" || tier === "infinity";
  const fileRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState("Aarav Mehta");
  const [role, setRole] = useState("Brand Designer");
  const [company, setCompany] = useState("Studio North");
  const [email, setEmail] = useState("hi@studionorth.in");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [site, setSite] = useState("studionorth.in");
  const [theme, setTheme] = useState(THEMES[0]);

  const handleLogoClick = () => {
    if (!canUseLogo) {
      toast("Logo upload is a Pro feature", {
        description: "Upgrade to add your brand logo to business cards.",
        action: { label: "Upgrade", onClick: () => navigate("/plans") },
      });
      return;
    }
    fileRef.current?.click();
  };

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Logo must be under 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
ORG:${company}
TITLE:${role}
EMAIL:${email}
TEL:${phone}
URL:${site}
END:VCARD`;

  const downloadVcard = () => guard(() => {
    const blob = new Blob([vcard], { type: "text/vcard" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.vcf`;
    a.click();
    toast.success("Contact card (vCard) downloaded");
  });

  return (
    <ToolPageLayout
      title="Business Card Generator"
      metaTitle="Free Business Card Generator + vCard Download | HustleAI"
      metaDescription="Free online business card maker — 4 themes, instant vCard (.vcf) download, mobile-friendly. Used by freelancers and small business owners in the US, UK, EU, AU and India."
      subtitle="Quick standalone card — no AI input needed. Pick a theme, fill 6 fields, share as vCard."
      icon={IdCard}
      path="/tools/business-card"
      toolKey="business-card"
      accent="from-fuchsia-500 to-pink-600"
      back={{ href: "/tools", label: "All tools" }}
      faqs={faqs}
    >
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 space-y-3">
          <Field label="Full name" value={name} onChange={setName} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role" value={role} onChange={setRole} />
            <Field label="Company" value={company} onChange={setCompany} />
          </div>
          <Field label="Email" value={email} onChange={setEmail} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Field label="Website" value={site} onChange={setSite} />
          </div>
          <div>
            <Label className="text-xs">Theme</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setTheme(t)} className={`h-10 rounded-md ${t.bg} border-2 ${theme.id === t.id ? "border-emerald-400" : "border-transparent"}`} aria-label={t.id} />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Brand logo</Label>
              {!canUseLogo && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  <Crown className="w-2.5 h-2.5" /> Pro
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogoClick}
              className={`mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition ${
                canUseLogo
                  ? "border-slate-300 hover:bg-slate-50 text-slate-700"
                  : "border-dashed border-amber-300 bg-amber-50/40 text-amber-800 hover:bg-amber-50"
              }`}
              aria-label={canUseLogo ? "Upload logo" : "Upgrade to upload logo"}
            >
              {canUseLogo ? <Upload className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left truncate">
                {logo ? "Logo added — click to replace" : canUseLogo ? "Upload PNG/SVG (max 1MB)" : "Unlock logo upload with Pro"}
              </span>
              {logo && canUseLogo && (
                <span
                  className="text-slate-400 hover:text-slate-700"
                  onClick={(e) => { e.stopPropagation(); setLogo(null); }}
                >×</span>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={onLogoChange} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={downloadVcard} className="bg-slate-900 hover:bg-slate-800 text-white"><Download className="w-3.5 h-3.5 mr-1" /> Save vCard</Button>
            <Button variant="outline" asChild><a href="/workspaces?intent=business_card">Open branded studio →</a></Button>
          </div>
        </Card>

        <div className="flex items-center justify-center">
          <div className={`w-[340px] aspect-[1.6/1] rounded-xl shadow-2xl ${theme.bg} ${theme.fg} p-6 flex flex-col justify-between`}>
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className={`text-[10px] uppercase tracking-[0.3em] ${theme.accent} font-bold`}>{company}</div>
                {logo && canUseLogo && (
                  <img src={logo} alt="logo" className="h-8 w-8 object-contain rounded bg-white/10 p-0.5" />
                )}
              </div>
              <div className="text-xl font-bold mt-2">{name}</div>
              <div className="text-xs opacity-80">{role}</div>
            </div>
            <div className="text-[11px] space-y-0.5 opacity-90">
              <div>{email}</div>
              <div>{phone}</div>
              <div className={theme.accent}>{site}</div>
            </div>
          </div>
        </div>
      </div>
      {gate}
    </ToolPageLayout>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}