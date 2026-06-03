import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/** Render a PDF (from a URL) using pdf.js into <canvas> elements.
 *  Avoids Chrome's "This content is blocked" iframe PDF viewer. */
export default function PdfCanvasViewer({ url, className }: { url: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null);
    (async () => {
      try {
        // @ts-ignore
        const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
        // @ts-ignore
        const worker: any = await import("pdfjs-dist/build/pdf.worker.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Couldn't load PDF");
        const data = await res.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;
        const host = wrapRef.current;
        if (!host) return;
        host.innerHTML = "";

        const containerWidth = host.clientWidth || 800;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const baseVp = page.getViewport({ scale: 1 });
          const scale = Math.min(2, containerWidth / baseVp.width);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(vp.width * dpr);
          canvas.height = Math.floor(vp.height * dpr);
          canvas.style.width = `${Math.floor(vp.width)}px`;
          canvas.style.height = `${Math.floor(vp.height)}px`;
          canvas.className = "mx-auto mb-3 rounded-md shadow-sm bg-white";
          host.appendChild(canvas);
          const ctx = canvas.getContext("2d")!;
          ctx.scale(dpr, dpr);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          if (cancelled) return;
        }
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) { setErr(e?.message ?? "Failed to render PDF"); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className={className}>
      {loading && (
        <div className="flex items-center justify-center h-40 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rendering PDF…
        </div>
      )}
      {err && <div className="text-xs text-red-600 p-4">{err}</div>}
      <div ref={wrapRef} className="w-full overflow-auto" />
    </div>
  );
}