import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pin, Trash2, FileDown, Sparkles, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function WorkspaceSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exports, setExports] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [pinned, setPinned] = useState<any[]>([]);
  const [aiUsage, setAiUsage] = useState<any[]>([]);

  const [newPrompt, setNewPrompt] = useState({ title: "", prompt: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [ex, pr, wf, pi, au] = await Promise.all([
      (supabase as any).from("generated_exports").select("id,title,export_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      (supabase as any).from("saved_prompts").select("*").eq("user_id", user.id).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(20),
      (supabase as any).from("saved_workflows").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      (supabase as any).from("pinned_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      (supabase as any).from("ai_daily_usage").select("feature,count,usage_date").eq("user_id", user.id).order("usage_date", { ascending: false }).limit(20),
    ]);
    setExports(ex.data ?? []);
    setPrompts(pr.data ?? []);
    setWorkflows(wf.data ?? []);
    setPinned(pi.data ?? []);
    setAiUsage(au.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const addPrompt = async () => {
    if (!user || !newPrompt.title || !newPrompt.prompt) return;
    const { error } = await (supabase as any).from("saved_prompts").insert({
      user_id: user.id, title: newPrompt.title, prompt: newPrompt.prompt,
    });
    if (error) return toast.error(error.message);
    setNewPrompt({ title: "", prompt: "" });
    toast.success("Prompt saved");
    load();
  };

  const togglePin = async (id: string, pinned: boolean) => {
    await (supabase as any).from("saved_prompts").update({ pinned: !pinned }).eq("id", id);
    load();
  };

  const deletePrompt = async (id: string) => {
    await (supabase as any).from("saved_prompts").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FileDown} label="Recent exports" value={exports.length} />
        <StatCard icon={Sparkles} label="Saved prompts" value={prompts.length} />
        <StatCard icon={Workflow} label="Workflows" value={workflows.length} />
        <StatCard icon={Pin} label="Pinned" value={pinned.length} />
      </div>

      <SettingsSection title="Recent exports" description="Your latest generated documents." action={<Button asChild size="sm" variant="outline"><Link to="/settings/exports">Open Export Center</Link></Button>}>
        {exports.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No exports yet.</p>
        ) : (
          <ul className="divide-y divide-border/30">
            {exports.map((e) => (
              <li key={e.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.export_type}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(e.created_at))} ago</span>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection title="Saved prompts" description="Reusable prompts for your AI workflows.">
        <div className="space-y-3 mb-5">
          <Input placeholder="Prompt title" value={newPrompt.title} onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })} />
          <Textarea rows={3} placeholder="Your prompt..." value={newPrompt.prompt} onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })} />
          <Button size="sm" onClick={addPrompt} disabled={!newPrompt.title || !newPrompt.prompt}>
            <Plus className="h-4 w-4 mr-1" /> Save prompt
          </Button>
        </div>
        {prompts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border-t border-border/30 pt-4">No saved prompts.</p>
        ) : (
          <ul className="divide-y divide-border/30 border-t border-border/30">
            {prompts.map((p) => (
              <li key={p.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {p.pinned && <Pin className="h-3 w-3 text-primary fill-primary" />}
                    <p className="text-sm font-medium truncate">{p.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.prompt}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => togglePin(p.id, p.pinned)}>
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deletePrompt(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection title="AI usage (last 20 days)" description="Daily AI feature usage from your account.">
        {aiUsage.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No AI activity yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {aiUsage.map((u, i) => (
              <li key={i} className="flex items-center justify-between text-sm py-1.5">
                <span className="text-muted-foreground">{u.usage_date} · {u.feature}</span>
                <span className="font-medium">{u.count}</span>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}