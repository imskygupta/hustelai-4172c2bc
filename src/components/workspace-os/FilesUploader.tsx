import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, File as FileIcon, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { markMilestone, hasMilestone } from "@/lib/onboarding/firstSession";
import { trackEvent } from "@/lib/analytics";

export default function FilesUploader({ workspaceId, ownerId }: { workspaceId: string; ownerId: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await (supabase as any).from("workspace_files").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    setFiles(data || []);
  };
  useEffect(() => { load(); }, [workspaceId]);

  const upload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setBusy(true);
    let uploadedAny = false;
    for (const file of Array.from(fileList)) {
      const path = `${ownerId}/${workspaceId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("workspace-files").upload(path, file);
      if (upErr) { toast.error(upErr.message); continue; }
      await (supabase as any).from("workspace_files").insert({
        workspace_id: workspaceId, owner_id: ownerId, name: file.name, storage_path: path,
        size_bytes: file.size, mime_type: file.type,
      });
      uploadedAny = true;
    }
    if (uploadedAny && !hasMilestone("first_file_uploaded")) {
      markMilestone("first_file_uploaded");
      void trackEvent("first_file_uploaded", { surface: "files" });
    }
    setBusy(false); load();
    toast.success("Uploaded");
  };

  const remove = async (f: any) => {
    await supabase.storage.from("workspace-files").remove([f.storage_path]);
    await (supabase as any).from("workspace_files").delete().eq("id", f.id);
    load();
  };

  const toggleVisible = async (f: any) => {
    await (supabase as any).from("workspace_files").update({ is_client_visible: !f.is_client_visible }).eq("id", f.id);
    load();
  };

  const open = async (f: any) => {
    const { data } = await supabase.storage.from("workspace-files").createSignedUrl(f.storage_path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); upload(e.dataTransfer.files); };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-medium">Files & assets</h3>

      <div
        onDrop={onDrop} onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition"
      >
        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{busy ? "Uploading..." : "Drop files here or click to browse"}</p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => upload(e.target.files)} />
      </div>

      <div className="space-y-1.5">
        {files.map(f => (
          <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
            <FileIcon className="h-4 w-4 text-primary" />
            <button onClick={() => open(f)} className="flex-1 text-left text-sm hover:underline truncate">{f.name}</button>
            <span className="text-[10px] text-muted-foreground">{((f.size_bytes || 0) / 1024).toFixed(1)} KB</span>
            <Button size="sm" variant="ghost" onClick={() => toggleVisible(f)} title={f.is_client_visible ? "Visible to client" : "Hidden from client"}>
              {f.is_client_visible ? <Eye className="h-3.5 w-3.5 text-emerald-500" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => remove(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        {files.length === 0 && <p className="text-xs text-muted-foreground py-2 text-center">No files yet.</p>}
      </div>
    </div>
  );
}