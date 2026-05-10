import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Lock, Download as DownloadIcon, FileDown } from "lucide-react";
import PublicLinkUnavailable, { type LinkUnavailableReason } from "./PublicLinkUnavailable";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-download`;

export default function Download() {
  const { token = "" } = useParams();
  const [otp, setOtp] = useState("");
  const [needOtp, setNeedOtp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<LinkUnavailableReason | null>(null);
  const [info, setInfo] = useState<{ url: string; title: string; mime_type: string; size_bytes: number } | null>(null);

  const attempt = async (otpVal?: string) => {
    setLoading(true); setError(null); setReason(null);
    try {
      const u = new URL(FN_URL);
      u.searchParams.set("token", token);
      if (otpVal) u.searchParams.set("otp", otpVal);
      const r = await fetch(u.toString(), { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      const j = await r.json().catch(() => ({}));
      if (j?.otp_required) { setNeedOtp(true); setLoading(false); return; }
      if (!r.ok) {
        const errText = String(j?.error || "").toLowerCase();
        let mapped: LinkUnavailableReason = "unknown";
        if (r.status === 404 || errText.includes("not found") || errText.includes("invalid")) mapped = "not_found";
        else if (errText.includes("expired")) mapped = "expired";
        else if (errText.includes("revoked")) mapped = "revoked";
        else if (errText.includes("link used") || errText.includes("limit")) mapped = "limit_reached";
        else if (errText.includes("otp")) mapped = "otp_required";
        else if (r.status === 401 || r.status === 403) mapped = "unauthorized";
        setReason(mapped);
        setError(j?.error || `Error ${r.status}`);
        setLoading(false); return;
      }
      setInfo(j);
    } catch (e: any) {
      setReason("unknown");
      setError(e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { attempt(); /* eslint-disable-next-line */ }, [token]);

  // For terminal failures, show branded growth-funnel fallback page.
  if (!loading && reason && !info && !needOtp) {
    return <PublicLinkUnavailable reason={reason} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <div className="h-12 w-12 mx-auto rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center mb-4">
          <FileDown className="h-5 w-5 text-emerald-300" />
        </div>
        <h1 className="text-base font-semibold tracking-tight">HustleAI Secure Download</h1>
        <p className="text-xs text-zinc-500 mt-1">Single-use, audit-logged share link.</p>

        <div className="mt-6">
          {loading && <div className="text-zinc-400 text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Verifying…</div>}

          {!loading && needOtp && !info && (
            <div className="space-y-3 text-left">
              <label className="text-[11px] text-zinc-400 flex items-center gap-1"><Lock className="h-3 w-3" /> Enter the 6-digit OTP shared with you</label>
              <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••" className="w-full text-center tracking-[0.4em] text-xl font-mono rounded-lg bg-white/[0.04] ring-1 ring-white/10 px-3 py-3 outline-none focus:ring-emerald-500/40" />
              {error && <div className="text-xs text-red-300">{error}</div>}
              <button onClick={() => attempt(otp)} disabled={otp.length !== 6}
                className="w-full text-sm rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/40 text-emerald-200 px-3 py-2 hover:bg-emerald-500/30 disabled:opacity-40">Unlock</button>
            </div>
          )}

          {!loading && info && (
            <div className="space-y-3">
              <div className="text-sm text-zinc-200">{info.title}</div>
              <div className="text-[11px] text-zinc-500">{info.mime_type} · {humanBytes(info.size_bytes)}</div>
              <a href={info.url} download
                className="inline-flex items-center gap-2 text-sm rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/40 text-emerald-200 px-4 py-2 hover:bg-emerald-500/30">
                <DownloadIcon className="h-4 w-4" /> Download file
              </a>
              <p className="text-[11px] text-zinc-500">Link valid for 60 seconds.</p>
            </div>
          )}

          {/* Terminal errors handled by PublicLinkUnavailable above. */}
        </div>
      </div>
    </div>
  );
}

function humanBytes(n: number) {
  if (!n) return "0 B";
  const u = ["B","KB","MB","GB"]; let i=0; let v=n;
  while (v >= 1024 && i < u.length-1) { v/=1024; i++; }
  return `${v.toFixed(v<10?1:0)} ${u[i]}`;
}