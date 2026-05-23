import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ExternalLink, FileDown, ShieldAlert, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { PreviewPane } from "@/components/artifacts/PreviewPane";
import { fetchPublicArtifact, type PublicArtifactPayload } from "@/lib/artifacts/api";

function humanBytes(b?: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function relative(ts?: string | null) {
  if (!ts) return "Never expires";
  const d = new Date(ts).getTime() - Date.now();
  if (d <= 0) return "Expired";
  const days = Math.floor(d / 86_400_000);
  if (days >= 1) return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(d / 3_600_000);
  if (hours >= 1) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  const mins = Math.max(1, Math.floor(d / 60_000));
  return `Expires in ${mins} min`;
}

export default function PublicArtifact() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<PublicArtifactPayload | null>(null);
  const [errorState, setErrorState] = useState<"not_found" | "expired" | "revoked" | "error" | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const r = await fetchPublicArtifact(token);
      if (cancel) return;
      if (!r.ok || !r.data) setErrorState((r.status as any) || "error");
      else setPayload(r.data);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!payload || errorState) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <BrandHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-xl border border-border bg-muted/40 p-8 text-center">
            <ShieldAlert className="h-10 w-10 mx-auto text-foreground/40" />
            <h1 className="mt-4 text-lg font-semibold text-foreground">Link unavailable</h1>
            <p className="mt-1.5 text-sm text-foreground/70">
              {errorState === "expired" ? "This share link has expired."
                : errorState === "revoked" ? "The owner revoked this share link."
                : "This link is invalid or no longer available."}
            </p>
            <Link to="/" className="mt-5 inline-block text-sm text-primary hover:underline">
              Go to HustleAI →
            </Link>
          </div>
        </main>
        <BrandFooter />
      </div>
    );
  }

  const a = payload.artifact;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={`${a.title} · Shared on HustleAI`} description={a.preview_text || `Shared ${a.artifact_type}`} noindex />
      <BrandHeader />
      <main className="flex-1 px-4 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-foreground/55">{a.artifact_type.replace(/_/g, " ")}</p>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{a.title}</h1>
              <p className="text-xs text-foreground/60 mt-1 flex items-center gap-2">
                <Clock className="h-3 w-3" /> {relative(a.share_expires_at)} · {humanBytes(a.size_bytes)}
              </p>
            </div>
            <div className="flex gap-2">
              {payload.signed_url && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => window.open(payload.signed_url!, "_blank", "noreferrer")}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open
                  </Button>
                  <Button size="sm" asChild>
                    <a href={payload.signed_url} download>
                      <FileDown className="h-3.5 w-3.5 mr-1.5" /> Download
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>

          <PreviewPane
            title={a.title}
            artifactType={a.artifact_type}
            mimeType={a.mime_type}
            previewText={a.preview_text}
            signedUrl={payload.signed_url}
          />
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}

function BrandHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold text-foreground tracking-tight">
          Hustl<span className="text-primary">AI</span>
        </Link>
        <span className="text-[10px] uppercase tracking-wider text-foreground/55">Shared artifact</span>
      </div>
    </header>
  );
}

function BrandFooter() {
  return (
    <footer className="border-t border-border py-4">
      <div className="max-w-3xl mx-auto px-4 flex items-center justify-between text-[11px] text-foreground/55">
        <span>Powered by HustleAI</span>
        <Link to="/" className="hover:text-foreground">hustlaiapp.in</Link>
      </div>
    </footer>
  );
}