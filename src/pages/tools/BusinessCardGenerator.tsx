import { useState } from "react";
import { IdCard, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { useToolGate } from "@/components/tools/ToolGate";
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
  const [name, setName] = useState("Aarav Mehta");
  const [role, setRole] = useState("Brand Designer");
  const [company, setCompany] = useState("Studio North");
  const [email, setEmail] = useState("hi@studionorth.in");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [site, setSite] = useState("studionorth.in");
  const [theme, setTheme] = useState(THEMES[0]);

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
          <div className="flex gap-2 pt-2">
            <Button onClick={downloadVcard} className="bg-slate-900 hover:bg-slate-800 text-white"><Download className="w-3.5 h-3.5 mr-1" /> Save vCard</Button>
            <Button variant="outline" asChild><a href="/workspaces?intent=business_card">Open branded studio →</a></Button>
          </div>
        </Card>

        <div className="flex items-center justify-center">
          <div className={`w-[340px] aspect-[1.6/1] rounded-xl shadow-2xl ${theme.bg} ${theme.fg} p-6 flex flex-col justify-between`}>
            <div>
              <div className={`text-[10px] uppercase tracking-[0.3em] ${theme.accent} font-bold`}>{company}</div>
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