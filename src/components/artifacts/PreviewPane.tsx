import ReactMarkdown from "react-markdown";
import { FileText, FileDown } from "lucide-react";

type Props = {
  artifactType: string;
  mimeType?: string | null;
  previewText?: string | null;
  signedUrl?: string | null;
  title: string;
};

function isPdf(mime?: string | null, type?: string) {
  if (mime?.includes("pdf")) return true;
  return /(_pdf|^pdf|roadmap_pdf|invoice_pdf|proposal_pdf|resume_pdf)/i.test(type || "");
}
function isMarkdown(mime?: string | null, type?: string) {
  if (mime?.includes("markdown")) return true;
  return /(workspace_doc|md|markdown|roadmap_md|knowledge_doc)/i.test(type || "");
}

export function PreviewPane({ artifactType, mimeType, previewText, signedUrl, title }: Props) {
  if (isPdf(mimeType, artifactType) && signedUrl) {
    return (
      <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
        <iframe
          title={title}
          src={signedUrl}
          className="w-full h-[70vh] bg-background"
        />
      </div>
    );
  }

  if (isMarkdown(mimeType, artifactType) && (previewText || signedUrl)) {
    return (
      <article className="prose dark:prose-invert max-w-none rounded-lg border border-border bg-card p-6 text-foreground">
        <ReactMarkdown>{previewText || "_Preview unavailable — download the full file below._"}</ReactMarkdown>
      </article>
    );
  }

  if (previewText) {
    return (
      <pre className="rounded-lg border border-border bg-muted/30 p-4 max-h-[70vh] overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground/85 font-mono">
        {previewText}
      </pre>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-10 text-center">
      <FileText className="h-10 w-10 mx-auto text-foreground/40" />
      <p className="text-sm text-foreground/70 mt-3">
        Preview not available for this artifact type.
      </p>
      {signedUrl && (
        <a
          href={signedUrl}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          target="_blank" rel="noreferrer"
        >
          <FileDown className="h-3.5 w-3.5" /> Download file
        </a>
      )}
    </div>
  );
}