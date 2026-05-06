import { Twitter, Linkedin, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const enc = encodeURIComponent;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast({ title: "Link copied" }); } catch {}
  };
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="text-xs">Share:</span>
      <a className="hover:text-primary" target="_blank" rel="noopener" href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`}><Twitter className="w-4 h-4" /></a>
      <a className="hover:text-primary" target="_blank" rel="noopener" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}><Linkedin className="w-4 h-4" /></a>
      <button className="hover:text-primary" onClick={copy} aria-label="Copy link"><Link2 className="w-4 h-4" /></button>
    </div>
  );
}