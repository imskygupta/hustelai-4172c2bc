import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen, FolderOpen, Plus, Search, Star, Tag, Trash2, Edit3,
  Download, Copy, FileText, MessageCircle, Zap, Settings2, Play,
  Pause, Clock, Filter, Heart, Archive, Bookmark, Lock, CheckSquare,
  X, Save, ChevronDown, ChevronRight, Folder
} from "lucide-react";

// Daily usage limits per tier (same as search)
const DAILY_LIMITS: Record<string, number> = { free: 3, pro: 5, elite: 10, infinity: 20 };

export default function KnowledgeHub() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("prompts");

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-primary font-display text-xl">Loading...</div></div>;
  if (!user || !profile) return null;

  const tier = profile.subscription_tier as string;
  const isPro = tier === "pro" || tier === "elite" || tier === "infinity";
  const dailyLimit = DAILY_LIMITS[tier] || 3;

  if (!isPro) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Lock className="w-16 h-16 text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold">Knowledge Hub is Pro+</h1>
          <p className="text-muted-foreground text-center max-w-md">Upgrade to Pro or higher to access Prompt Holder, Chat Export, Knowledge Dashboard, and Automation Rules.</p>
          <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/#pricing")}>Upgrade Now</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" /> Knowledge Hub
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Save prompts, export chats, organize knowledge & automate workflows</p>
            </div>
            <Badge variant="outline" className="text-xs">{dailyLimit} actions/day</Badge>
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full max-w-lg">
              <TabsTrigger value="prompts" className="text-xs"><Bookmark className="w-3.5 h-3.5 mr-1" /> Prompts</TabsTrigger>
              <TabsTrigger value="exports" className="text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Exports</TabsTrigger>
              <TabsTrigger value="sources" className="text-xs"><Archive className="w-3.5 h-3.5 mr-1" /> Sources</TabsTrigger>
              <TabsTrigger value="automation" className="text-xs"><Zap className="w-3.5 h-3.5 mr-1" /> Automation</TabsTrigger>
            </TabsList>

            <TabsContent value="prompts"><PromptHolder userId={user.id} dailyLimit={dailyLimit} /></TabsContent>
            <TabsContent value="exports"><ChatExportBriefings userId={user.id} dailyLimit={dailyLimit} /></TabsContent>
            <TabsContent value="sources"><KnowledgeDashboard userId={user.id} dailyLimit={dailyLimit} /></TabsContent>
            <TabsContent value="automation"><AutomationRules userId={user.id} dailyLimit={dailyLimit} tier={tier} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ==================== PROMPT HOLDER ====================
function PromptHolder({ userId, dailyLimit }: { userId: string; dailyLimit: number }) {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "", tags: "", folder_id: "" });
  const [newFolder, setNewFolder] = useState("");
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: p }, { data: f }] = await Promise.all([
      supabase.from("knowledge_prompts").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("knowledge_folders").select("*").eq("user_id", userId).order("name"),
    ]);
    setPrompts(p || []);
    setFolders(f || []);
    // Count today's actions
    const today = new Date().toISOString().split("T")[0];
    const todayPrompts = (p || []).filter((pr: any) => pr.created_at.startsWith(today));
    setTodayCount(todayPrompts.length);
  };

  const createFolder = async () => {
    if (!newFolder.trim()) return;
    const { error } = await supabase.from("knowledge_folders").insert({ user_id: userId, name: newFolder.trim() });
    if (error) { toast.error("Failed to create folder"); return; }
    setNewFolder("");
    toast.success("Folder created!");
    loadData();
  };

  const savePrompt = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error("Title and content required"); return; }
    if (!editingPrompt && todayCount >= dailyLimit) { toast.error(`Daily limit reached (${dailyLimit}/day). Upgrade for more.`); return; }

    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = { user_id: userId, title: form.title, content: form.content, tags, folder_id: form.folder_id || null, updated_at: new Date().toISOString() };

    if (editingPrompt) {
      const { error } = await supabase.from("knowledge_prompts").update(payload).eq("id", editingPrompt.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Prompt updated!");
    } else {
      const { error } = await supabase.from("knowledge_prompts").insert(payload);
      if (error) { toast.error("Failed to save"); return; }
      toast.success("Prompt saved!");
    }
    setShowForm(false);
    setEditingPrompt(null);
    setForm({ title: "", content: "", tags: "", folder_id: "" });
    loadData();
  };

  const deletePrompt = async (id: string) => {
    await supabase.from("knowledge_prompts").delete().eq("id", id);
    toast.success("Deleted");
    loadData();
  };

  const toggleFavorite = async (prompt: any) => {
    await supabase.from("knowledge_prompts").update({ is_favorite: !prompt.is_favorite }).eq("id", prompt.id);
    loadData();
  };

  const copyPrompt = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const filtered = prompts.filter(p => {
    if (selectedFolder && p.folder_id !== selectedFolder) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search prompts..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{todayCount}/{dailyLimit} today</Badge>
          <Button size="sm" onClick={() => { setShowForm(true); setEditingPrompt(null); setForm({ title: "", content: "", tags: "", folder_id: "" }); }}>
            <Plus className="w-4 h-4 mr-1" /> New Prompt
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Folders sidebar */}
        <div className="w-48 shrink-0 hidden md:block space-y-2">
          <div className="flex items-center gap-1">
            <Input placeholder="New folder..." value={newFolder} onChange={e => setNewFolder(e.target.value)} className="h-8 text-xs" />
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={createFolder}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
          <div onClick={() => setSelectedFolder(null)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${!selectedFolder ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
            <FolderOpen className="w-3.5 h-3.5" /> All Prompts ({prompts.length})
          </div>
          <div onClick={() => setSelectedFolder("favorites")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${selectedFolder === "favorites" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
            <Heart className="w-3.5 h-3.5" /> Favorites ({prompts.filter(p => p.is_favorite).length})
          </div>
          {folders.map(f => (
            <div key={f.id} onClick={() => setSelectedFolder(f.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${selectedFolder === f.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
              <Folder className="w-3.5 h-3.5" style={{ color: f.color }} /> {f.name}
            </div>
          ))}
        </div>

        {/* Prompts grid */}
        <div className="flex-1 space-y-3">
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 space-y-3">
              <Input placeholder="Prompt title..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Prompt content..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} />
              <div className="flex gap-2">
                <Input placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="flex-1" />
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.folder_id} onChange={e => setForm({ ...form, folder_id: e.target.value })}>
                  <option value="">No folder</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={savePrompt}><Save className="w-4 h-4 mr-1" /> {editingPrompt ? "Update" : "Save"}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingPrompt(null); }}><X className="w-4 h-4" /></Button>
              </div>
            </motion.div>
          )}

          {(selectedFolder === "favorites" ? filtered.filter(p => p.is_favorite) : filtered).map(prompt => (
            <motion.div key={prompt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass rounded-xl p-4 space-y-2 hover:border-primary/30 transition-all group">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm">{prompt.title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleFavorite(prompt)}>
                    <Heart className={`w-3.5 h-3.5 ${prompt.is_favorite ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyPrompt(prompt.content)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                    setEditingPrompt(prompt);
                    setForm({ title: prompt.title, content: prompt.content, tags: (prompt.tags || []).join(", "), folder_id: prompt.folder_id || "" });
                    setShowForm(true);
                  }}>
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deletePrompt(prompt.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{prompt.content}</p>
              {prompt.tags?.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {prompt.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">{new Date(prompt.created_at).toLocaleDateString()}</p>
            </motion.div>
          ))}

          {filtered.length === 0 && !showForm && (
            <div className="text-center py-12 text-muted-foreground">
              <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No prompts saved yet. Click "New Prompt" to get started!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== CHAT EXPORT & BRIEFINGS ====================
function ChatExportBriefings({ userId, dailyLimit }: { userId: string; dailyLimit: number }) {
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [exports, setExports] = useState<any[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showUserMessages, setShowUserMessages] = useState(true);
  const [briefingTitle, setBriefingTitle] = useState("");
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: msgs }, { data: exp }] = await Promise.all([
      supabase.from("chat_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true }).limit(100),
      supabase.from("knowledge_exports").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);
    setChatMessages(msgs || []);
    setExports(exp || []);
    const today = new Date().toISOString().split("T")[0];
    setTodayCount((exp || []).filter((e: any) => e.created_at.startsWith(today)).length);
  };

  const exportChat = async (format: string) => {
    if (todayCount >= dailyLimit) { toast.error(`Daily limit reached (${dailyLimit}/day)`); return; }
    const messagesToExport = chatMessages.filter(m => showUserMessages || m.role === "assistant");
    let content = "";
    if (format === "markdown") {
      content = messagesToExport.map(m => `### ${m.role === "user" ? "You" : "HustleBot"}\n${m.content}\n`).join("\n---\n\n");
    } else if (format === "json") {
      content = JSON.stringify(messagesToExport.map(m => ({ role: m.role, content: m.content, timestamp: m.created_at })), null, 2);
    } else {
      content = messagesToExport.map(m => `[${m.role === "user" ? "You" : "HustleBot"}]: ${m.content}`).join("\n\n");
    }

    const { error } = await supabase.from("knowledge_exports").insert({
      user_id: userId, title: `Chat Export - ${new Date().toLocaleDateString()}`, content, export_type: "chat_export", format,
    });
    if (error) { toast.error("Export failed"); return; }

    // Also trigger download
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export.${format === "markdown" ? "md" : format === "json" ? "json" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported as ${format}!`);
    loadData();
  };

  const createBriefing = async () => {
    if (selectedMessages.size === 0) { toast.error("Select messages for the briefing"); return; }
    if (todayCount >= dailyLimit) { toast.error(`Daily limit reached (${dailyLimit}/day)`); return; }
    if (!briefingTitle.trim()) { toast.error("Give your briefing a title"); return; }

    const selected = chatMessages.filter(m => selectedMessages.has(m.id));
    const content = selected.map(m => `**${m.role === "user" ? "You" : "HustleBot"}:**\n${m.content}`).join("\n\n---\n\n");

    const { error } = await supabase.from("knowledge_exports").insert({
      user_id: userId, title: briefingTitle, content, export_type: "briefing", format: "markdown",
      source_messages: selected.map(m => ({ id: m.id, role: m.role, content: m.content.slice(0, 200) })),
    });
    if (error) { toast.error("Failed to create briefing"); return; }

    toast.success("Briefing created!");
    setSelectedMessages(new Set());
    setBriefingTitle("");
    loadData();
  };

  const toggleMessage = (id: string) => {
    const next = new Set(selectedMessages);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedMessages(next);
  };

  const deleteExport = async (id: string) => {
    await supabase.from("knowledge_exports").delete().eq("id", id);
    toast.success("Deleted");
    loadData();
  };

  const downloadExport = (exp: any) => {
    const ext = exp.format === "json" ? "json" : exp.format === "markdown" ? "md" : "txt";
    const blob = new Blob([exp.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exp.title.replace(/\s+/g, "-")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mt-4">
      {/* Chat History Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" /> Your Chat History
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{todayCount}/{dailyLimit} exports today</Badge>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="checkbox" checked={showUserMessages} onChange={e => setShowUserMessages(e.target.checked)} className="rounded" />
              Show my messages
            </label>
          </div>
        </div>

        <div className="glass rounded-xl p-4 max-h-[400px] overflow-y-auto space-y-2">
          {chatMessages.length > 0 ? chatMessages.filter(m => showUserMessages || m.role === "assistant").map(m => (
            <div key={m.id} className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedMessages.has(m.id) ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
              onClick={() => toggleMessage(m.id)}>
              <CheckSquare className={`w-4 h-4 mt-0.5 shrink-0 ${selectedMessages.has(m.id) ? "text-primary" : "text-muted-foreground/30"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground">{m.role === "user" ? "You" : "HustleBot"} · {new Date(m.created_at).toLocaleString()}</p>
                <p className="text-xs text-foreground line-clamp-2">{m.content}</p>
              </div>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground text-center py-8">No chat history yet. Talk to HustleBot to see messages here.</p>
          )}
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => exportChat("markdown")}><Download className="w-4 h-4 mr-1" /> Markdown</Button>
          <Button size="sm" variant="outline" onClick={() => exportChat("text")}><FileText className="w-4 h-4 mr-1" /> Text</Button>
          <Button size="sm" variant="outline" onClick={() => exportChat("json")}><Download className="w-4 h-4 mr-1" /> JSON</Button>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(chatMessages.map(m => `[${m.role}]: ${m.content}`).join("\n")); toast.success("Copied!"); }}>
            <Copy className="w-4 h-4 mr-1" /> Copy All
          </Button>
        </div>

        {/* Briefing Creator */}
        {selectedMessages.size > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 space-y-3 border-primary/30">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" /> Create Briefing ({selectedMessages.size} messages selected)
            </h3>
            <Input placeholder="Briefing title..." value={briefingTitle} onChange={e => setBriefingTitle(e.target.value)} />
            <Button size="sm" onClick={createBriefing}><Save className="w-4 h-4 mr-1" /> Create Briefing</Button>
          </motion.div>
        )}
      </div>

      {/* Previous Exports */}
      <div className="space-y-3">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <Archive className="w-5 h-5 text-primary" /> Saved Exports & Briefings
        </h2>
        {exports.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-3">
            {exports.map(exp => (
              <div key={exp.id} className="glass rounded-xl p-4 space-y-2 group hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-sm truncate">{exp.title}</h3>
                  <Badge variant="outline" className="text-[10px] shrink-0">{exp.export_type === "briefing" ? "📋 Briefing" : "💬 Export"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{exp.content.slice(0, 120)}...</p>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => downloadExport(exp)}><Download className="w-3.5 h-3.5 mr-1" /> Download</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(exp.content); toast.success("Copied!"); }}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteExport(exp.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">{exp.format} · {new Date(exp.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No exports yet. Export your chats above!</p>
        )}
      </div>
    </motion.div>
  );
}

// ==================== KNOWLEDGE DASHBOARD ====================
function KnowledgeDashboard({ userId, dailyLimit }: { userId: string; dailyLimit: number }) {
  const [sources, setSources] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCollection, setFilterCollection] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", source_url: "", source_type: "note", tags: "", collection: "General" });
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data } = await supabase.from("knowledge_sources").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    setSources(data || []);
    const today = new Date().toISOString().split("T")[0];
    setTodayCount((data || []).filter((s: any) => s.created_at.startsWith(today)).length);
  };

  const saveSource = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    if (todayCount >= dailyLimit) { toast.error(`Daily limit reached (${dailyLimit}/day)`); return; }

    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const { error } = await supabase.from("knowledge_sources").insert({
      user_id: userId, title: form.title, content: form.content || null, source_url: form.source_url || null,
      source_type: form.source_type, tags, collection: form.collection,
    });
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Source saved!");
    setShowForm(false);
    setForm({ title: "", content: "", source_url: "", source_type: "note", tags: "", collection: "General" });
    loadData();
  };

  const deleteSource = async (id: string) => {
    await supabase.from("knowledge_sources").delete().eq("id", id);
    toast.success("Deleted");
    loadData();
  };

  const toggleFavorite = async (source: any) => {
    await supabase.from("knowledge_sources").update({ is_favorite: !source.is_favorite }).eq("id", source.id);
    loadData();
  };

  const collections = [...new Set(sources.map(s => s.collection).filter(Boolean))];
  const sourceTypes = [...new Set(sources.map(s => s.source_type))];

  const filtered = sources.filter(s => {
    if (filterType !== "all" && s.source_type !== filterType) return false;
    if (filterCollection !== "all" && s.collection !== filterCollection) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeIcons: Record<string, string> = { note: "📝", web: "🌐", pdf: "📄", social: "💬", video: "🎥", doc: "📋" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search sources..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{todayCount}/{dailyLimit} today</Badge>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Add Source</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {sourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={filterCollection} onChange={e => setFilterCollection(e.target.value)}>
          <option value="all">All Collections</option>
          {collections.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Badge variant="outline" className="text-xs">{filtered.length} sources</Badge>
      </div>

      {/* Add Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 space-y-3">
          <Input placeholder="Source title..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Textarea placeholder="Content or notes..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={3} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="URL (optional)" value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value })}>
              <option value="note">Note</option>
              <option value="web">Web Page</option>
              <option value="pdf">PDF</option>
              <option value="social">Social Media</option>
              <option value="video">Video</option>
              <option value="doc">Document</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            <Input placeholder="Collection" value={form.collection} onChange={e => setForm({ ...form, collection: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveSource}><Save className="w-4 h-4 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </div>
        </motion.div>
      )}

      {/* Sources Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(source => (
          <motion.div key={source.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-xl p-4 space-y-2 hover:border-primary/30 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{typeIcons[source.source_type] || "📝"}</span>
                <h3 className="font-display font-semibold text-sm truncate">{source.title}</h3>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleFavorite(source)}>
                  <Heart className={`w-3.5 h-3.5 ${source.is_favorite ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSource(source.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            {source.content && <p className="text-xs text-muted-foreground line-clamp-2">{source.content}</p>}
            {source.source_url && (
              <a href={source.source_url} target="_blank" rel="noopener" className="text-[10px] text-primary hover:underline truncate block">{source.source_url}</a>
            )}
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{source.collection}</Badge>
              {source.tags?.map((tag: string) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No sources yet. Add your first knowledge source!</p>
        </div>
      )}
    </motion.div>
  );
}

// ==================== AUTOMATION RULES ====================
function AutomationRules({ userId, dailyLimit, tier }: { userId: string; dailyLimit: number; tier: string }) {
  const [rules, setRules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", trigger_type: "manual", action_type: "research" });
  const isElite = tier === "elite" || tier === "infinity";

  useEffect(() => { loadRules(); }, []);

  const loadRules = async () => {
    const { data } = await supabase.from("automation_rules").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setRules(data || []);
  };

  const createRule = async () => {
    if (!form.name.trim()) { toast.error("Rule name required"); return; }
    const { error } = await supabase.from("automation_rules").insert({
      user_id: userId, name: form.name, trigger_type: form.trigger_type, action_type: form.action_type,
    });
    if (error) { toast.error("Failed to create rule"); return; }
    toast.success("Rule created!");
    setShowForm(false);
    setForm({ name: "", trigger_type: "manual", action_type: "research" });
    loadRules();
  };

  const toggleRule = async (rule: any) => {
    await supabase.from("automation_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);
    loadRules();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("automation_rules").delete().eq("id", id);
    toast.success("Deleted");
    loadRules();
  };

  const runRule = async (rule: any) => {
    // Simulate running the rule
    await supabase.from("automation_rules").update({ last_run_at: new Date().toISOString(), run_count: (rule.run_count || 0) + 1 }).eq("id", rule.id);
    toast.success(`Rule "${rule.name}" executed!`);
    loadRules();
  };

  const triggerLabels: Record<string, string> = {
    manual: "Manual Trigger", on_source_add: "When Source Added", on_chat: "After AI Chat", scheduled: "Scheduled",
  };
  const actionLabels: Record<string, string> = {
    research: "Auto Research", summarize: "Generate Summary", export: "Auto Export", notify: "Send Notification",
  };

  if (!isElite) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
        <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-display font-semibold mb-1">Automation Rules — Elite+</h3>
        <p className="text-sm text-muted-foreground mb-4">Automate research, summaries, and exports with custom rules.</p>
        <Button className="bg-gradient-primary text-primary-foreground" onClick={() => window.location.href = "/#pricing"}>Upgrade to Elite</Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" /> Your Automation Rules
        </h2>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Rule</Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 space-y-3">
          <Input placeholder="Rule name..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Trigger</label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.trigger_type} onChange={e => setForm({ ...form, trigger_type: e.target.value })}>
                <option value="manual">Manual</option>
                <option value="on_source_add">When Source Added</option>
                <option value="on_chat">After AI Chat</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Action</label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.action_type} onChange={e => setForm({ ...form, action_type: e.target.value })}>
                <option value="research">Auto Research</option>
                <option value="summarize">Generate Summary</option>
                <option value="export">Auto Export</option>
                <option value="notify">Send Notification</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={createRule}><Save className="w-4 h-4 mr-1" /> Create Rule</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {rules.map(rule => (
          <motion.div key={rule.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${rule.is_active ? "bg-primary/10" : "bg-muted"}`}>
              <Zap className={`w-5 h-5 ${rule.is_active ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm">{rule.name}</h3>
              <p className="text-[10px] text-muted-foreground">
                {triggerLabels[rule.trigger_type] || rule.trigger_type} → {actionLabels[rule.action_type] || rule.action_type}
                {rule.run_count > 0 && ` · Ran ${rule.run_count}x`}
                {rule.last_run_at && ` · Last: ${new Date(rule.last_run_at).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => runRule(rule)} title="Run now">
                <Play className="w-4 h-4 text-primary" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleRule(rule)} title={rule.is_active ? "Pause" : "Activate"}>
                {rule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-muted-foreground" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteRule(rule.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {rules.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No automation rules yet. Create one to streamline your workflow!</p>
        </div>
      )}
    </motion.div>
  );
}
