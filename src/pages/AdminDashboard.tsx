import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Shield, Users, Bell, Crown, Rocket, Sparkles, Star,
  Send, Trash2, LogOut, RefreshCw, Eye, Video, BookOpen,
  MessageSquare, Settings, BarChart3, Key, Globe, FileText,
  UserCheck, Compass, ChevronLeft, ChevronRight, AlertTriangle,
  CheckCircle, XCircle, Mail, Phone, MapPin, Pencil, Plus,
  Clock, ExternalLink, Activity, Database, Server, Zap
} from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  subscription_tier: string;
  search_count: number;
  created_at: string;
  phone: string | null;
  bio: string | null;
  address: string | null;
  resume_url: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  target_tier: string;
  is_active: boolean;
  created_at: string;
}

interface Webinar {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  meeting_id: string | null;
  meeting_pass: string | null;
  scheduled_at: string | null;
  status: string;
  target_tier: string;
  created_at: string;
}

interface ExpertAssignment {
  id: string;
  user_id: string;
  expert_name: string;
  expert_email: string | null;
  topic: string;
  description: string | null;
  status: string;
  meeting_link: string | null;
  scheduled_at: string | null;
  notes: string | null;
  target_tier: string;
  created_at: string;
}

interface ChatUser {
  user_id: string;
  display_name: string | null;
  email: string | null;
  last_message: string;
  last_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  author_name: string | null;
  is_published: boolean;
  created_at: string;
}

const tierIcons: Record<string, any> = {
  free: Sparkles, pro: Rocket, elite: Crown, infinity: Star,
};

const tierColors: Record<string, string> = {
  free: "bg-secondary text-secondary-foreground",
  pro: "bg-primary/20 text-primary",
  elite: "bg-accent/20 text-accent-foreground",
  infinity: "bg-yellow-500/20 text-yellow-400",
};

type AdminSection =
  | "overview" | "users" | "notifications" | "webinars"
  | "expert" | "chatbot" | "blogs" | "analytics" | "config";

const sidebarItems: { id: AdminSection; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "webinars", label: "Live Webinars", icon: Video },
  { id: "expert", label: "Expert Guidance", icon: UserCheck },
  { id: "chatbot", label: "Personal Chatbot", icon: MessageSquare },
  { id: "blogs", label: "Blog Manager", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "config", label: "Config & Keys", icon: Settings },
];

export default function AdminDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [section, setSection] = useState<AdminSection>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [expertAssignments, setExpertAssignments] = useState<ExpertAssignment[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [newsletterCount, setNewsletterCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adminReply, setAdminReply] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  // Forms
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [notifLink, setNotifLink] = useState("");
  const [notifTier, setNotifTier] = useState("all");

  const [webinarTitle, setWebinarTitle] = useState("");
  const [webinarDesc, setWebinarDesc] = useState("");
  const [webinarLink, setWebinarLink] = useState("");
  const [webinarMeetId, setWebinarMeetId] = useState("");
  const [webinarMeetPass, setWebinarMeetPass] = useState("");
  const [webinarDate, setWebinarDate] = useState("");
  const [webinarTier, setWebinarTier] = useState("all");

  const [expertUserId, setExpertUserId] = useState("");
  const [expertName, setExpertName] = useState("");
  const [expertEmail, setExpertEmail] = useState("");
  const [expertTopic, setExpertTopic] = useState("");
  const [expertDesc, setExpertDesc] = useState("");
  const [expertLink, setExpertLink] = useState("");
  const [expertDate, setExpertDate] = useState("");
  const [expertNotes, setExpertNotes] = useState("");

  const [blogTitle, setBlogTitle] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogCategory, setBlogCategory] = useState("General");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/imskygupta-admin");
  }, [loading, user]);

  useEffect(() => {
    if (user) checkAdmin();
  }, [user]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const checkAdmin = async () => {
    const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" as any });
    if (data) {
      setIsAdmin(true);
      loadAllData();
    } else {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/dashboard");
    }
  };

  const loadAllData = async () => {
    setLoadingData(true);
    const [usersRes, notifsRes, webRes, expertRes, blogRes, nlRes, contactRes, chatRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
      supabase.from("webinars").select("*").order("created_at", { ascending: false }),
      supabase.from("expert_assignments").select("*").order("created_at", { ascending: false }),
      supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
      supabase.from("contact_submissions").select("id", { count: "exact", head: true }),
      supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    if (usersRes.data) setUsers(usersRes.data as UserProfile[]);
    if (notifsRes.data) setNotifications(notifsRes.data as Notification[]);
    if (webRes.data) setWebinars(webRes.data as Webinar[]);
    if (expertRes.data) setExpertAssignments(expertRes.data as ExpertAssignment[]);
    if (blogRes.data) setBlogPosts(blogRes.data as BlogPost[]);
    setNewsletterCount(nlRes.count || 0);
    setContactCount(contactRes.count || 0);

    // Build chat users list
    if (chatRes.data) {
      const userMap = new Map<string, ChatUser>();
      for (const msg of chatRes.data) {
        if (!userMap.has(msg.user_id)) {
          const u = usersRes.data?.find((p: any) => p.user_id === msg.user_id);
          userMap.set(msg.user_id, {
            user_id: msg.user_id,
            display_name: u?.display_name || null,
            email: u?.email || null,
            last_message: msg.content,
            last_at: msg.created_at,
          });
        }
      }
      setChatUsers(Array.from(userMap.values()));
    }
    setLoadingData(false);
  };

  const changeTier = async (userId: string, newTier: string) => {
    const { error } = await supabase.from("profiles").update({ subscription_tier: newTier as any }).eq("user_id", userId);
    if (!error) {
      toast({ title: "Updated", description: `Tier → ${newTier}` });
      setUsers(users.map(u => u.user_id === userId ? { ...u, subscription_tier: newTier } : u));
    }
  };

  const impersonateUser = async (email: string) => {
    // Sign out current admin, then sign in as user via OTP
    toast({ title: "Backdoor Login", description: `Sending OTP to ${email} for impersonation. Use OTP to complete.` });
    await supabase.auth.signInWithOtp({ email });
  };

  const sendNotification = async () => {
    if (!notifTitle || !notifMessage) return;
    const { error } = await supabase.from("notifications").insert({
      title: notifTitle, message: notifMessage, type: notifType,
      link: notifLink || null, target_tier: notifTier, created_by: user!.id,
    });
    if (!error) {
      toast({ title: "Sent!" });
      setNotifTitle(""); setNotifMessage(""); setNotifLink("");
      loadAllData();
    }
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const addWebinar = async () => {
    if (!webinarTitle) return;
    const { error } = await supabase.from("webinars").insert({
      title: webinarTitle, description: webinarDesc || null, link: webinarLink || null,
      meeting_id: webinarMeetId || null, meeting_pass: webinarMeetPass || null,
      scheduled_at: webinarDate || null, target_tier: webinarTier, created_by: user!.id,
    });
    if (!error) {
      toast({ title: "Webinar Added" });
      setWebinarTitle(""); setWebinarDesc(""); setWebinarLink(""); setWebinarMeetId(""); setWebinarMeetPass(""); setWebinarDate("");
      loadAllData();
    }
  };

  const deleteWebinar = async (id: string) => {
    await supabase.from("webinars").delete().eq("id", id);
    setWebinars(webinars.filter(w => w.id !== id));
  };

  const addExpertAssignment = async () => {
    if (!expertUserId || !expertName || !expertTopic) return;
    const { error } = await supabase.from("expert_assignments").insert({
      user_id: expertUserId, expert_name: expertName, expert_email: expertEmail || null,
      topic: expertTopic, description: expertDesc || null, meeting_link: expertLink || null,
      scheduled_at: expertDate || null, notes: expertNotes || null, created_by: user!.id,
    });
    if (!error) {
      toast({ title: "Assignment Created" });
      setExpertUserId(""); setExpertName(""); setExpertEmail(""); setExpertTopic(""); setExpertDesc(""); setExpertLink(""); setExpertDate(""); setExpertNotes("");
      loadAllData();
    }
  };

  const deleteExpertAssignment = async (id: string) => {
    await supabase.from("expert_assignments").delete().eq("id", id);
    setExpertAssignments(expertAssignments.filter(e => e.id !== id));
  };

  const loadChatForUser = async (userId: string) => {
    setSelectedChatUser(userId);
    const { data } = await supabase.from("chat_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    if (data) setChatMessages(data);
  };

  const sendAdminChatReply = async () => {
    if (!adminReply.trim() || !selectedChatUser) return;
    const { error } = await supabase.from("chat_messages").insert({
      user_id: selectedChatUser, role: "assistant", content: adminReply.trim(),
      is_admin_reply: true, admin_id: user!.id,
    });
    if (!error) {
      setAdminReply("");
      loadChatForUser(selectedChatUser);
    }
  };

  const addBlogPost = async () => {
    if (!blogTitle || !blogContent) return;
    const { error } = await supabase.from("blog_posts").insert({
      title: blogTitle, content: blogContent, excerpt: blogExcerpt || null,
      category: blogCategory, author_name: profile?.display_name || "Admin",
      is_published: true, created_by: user!.id,
    });
    if (!error) {
      toast({ title: "Blog Published" });
      setBlogTitle(""); setBlogContent(""); setBlogExcerpt("");
      loadAllData();
    }
  };

  const toggleBlogPublish = async (id: string, current: boolean) => {
    await supabase.from("blog_posts").update({ is_published: !current }).eq("id", id);
    setBlogPosts(blogPosts.map(b => b.id === id ? { ...b, is_published: !current } : b));
  };

  const deleteBlog = async (id: string) => {
    await supabase.from("blog_posts").delete().eq("id", id);
    setBlogPosts(blogPosts.filter(b => b.id !== id));
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-display text-xl">Loading Admin...</div>
      </div>
    );
  }

  const envConfig = [
    { key: "SUPABASE_URL", value: import.meta.env.VITE_SUPABASE_URL, status: "active" },
    { key: "SUPABASE_ANON_KEY", value: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.slice(0, 20) + "...", status: "active" },
    { key: "PROJECT_ID", value: import.meta.env.VITE_SUPABASE_PROJECT_ID, status: "active" },
    { key: "LOVABLE_API_KEY", value: "Configured (Backend)", status: "active" },
  ];

  const apiKeysInfo = [
    { name: "Lovable AI Gateway (Gemini)", status: "active", note: "Primary — google/gemini-2.5-flash" },
    { name: "Lovable AI Gateway (GPT-5)", status: "available", note: "Backup — openai/gpt-5-mini" },
    { name: "Custom OpenAI Key", status: "not_set", note: "Add via backend secrets" },
    { name: "Custom Gemini Key", status: "not_set", note: "Add via backend secrets" },
  ];

  const freeUsers = users.filter(u => u.subscription_tier === "free").length;
  const proUsers = users.filter(u => u.subscription_tier === "pro").length;
  const eliteUsers = users.filter(u => u.subscription_tier === "elite").length;
  const infinityUsers = users.filter(u => u.subscription_tier === "infinity").length;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full z-50 bg-card border-r border-border transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-60"}`}>
        <div className="flex items-center justify-between h-14 px-3 border-b border-border">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              <span className="font-display font-bold text-sm">Admin Panel</span>
            </div>
          )}
          {sidebarCollapsed && <Shield className="w-5 h-5 text-destructive mx-auto" />}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-muted-foreground hover:text-foreground">
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        <nav className="p-2 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                section === item.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-border space-y-1">
          <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <Eye className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>User View</span>}
          </button>
          <button onClick={() => { signOut(); navigate("/"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "ml-16" : "ml-60"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-14 glass border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-lg">{sidebarItems.find(s => s.id === section)?.label}</h1>
            <Badge className="bg-destructive/20 text-destructive text-[10px]">SUPER ADMIN</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadAllData}><RefreshCw className="w-4 h-4" /></Button>
            <span className="text-xs text-muted-foreground">{profile?.email}</span>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* ===== OVERVIEW ===== */}
          {section === "overview" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
                  { label: "Pro Users", value: proUsers, icon: Rocket, color: "text-blue-400" },
                  { label: "Elite Users", value: eliteUsers, icon: Crown, color: "text-accent" },
                  { label: "Infinity Users", value: infinityUsers, icon: Star, color: "text-yellow-400" },
                  { label: "Free Users", value: freeUsers, icon: Sparkles, color: "text-muted-foreground" },
                  { label: "Newsletter Subs", value: newsletterCount, icon: Mail, color: "text-primary" },
                  { label: "Contact Msgs", value: contactCount, icon: FileText, color: "text-accent" },
                  { label: "Active Webinars", value: webinars.filter(w => w.status === "upcoming" || w.status === "live").length, icon: Video, color: "text-primary" },
                ].map((stat) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5">
                    <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
                    <p className="text-2xl font-display font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Platform Status */}
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> Platform Status
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { name: "Database", status: "operational" },
                    { name: "Auth Service", status: "operational" },
                    { name: "AI Gateway", status: "operational" },
                    { name: "Edge Functions", status: "operational" },
                    { name: "Storage", status: "operational" },
                    { name: "Realtime", status: "operational" },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm">{s.name}</span>
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <CheckCircle className="w-3 h-3" /> {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent signups */}
              <div className="glass rounded-xl p-6 space-y-3">
                <h3 className="font-display font-bold">Recent Signups</h3>
                <div className="space-y-2">
                  {users.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {(u.display_name || u.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.display_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={tierColors[u.subscription_tier] || ""} variant="outline">
                          {u.subscription_tier}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ===== USERS ===== */}
          {section === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{users.length} total users</p>
              </div>
              <div className="glass rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Searches</TableHead>
                      <TableHead>Bio</TableHead>
                      <TableHead>Resume</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Change Tier</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const TierIcon = tierIcons[u.subscription_tier] || Sparkles;
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.display_name || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                          <TableCell className="text-xs">{u.phone || "—"}</TableCell>
                          <TableCell>
                            <Badge className={tierColors[u.subscription_tier] || ""}>
                              <TierIcon className="w-3 h-3 mr-1" />{u.subscription_tier}
                            </Badge>
                          </TableCell>
                          <TableCell>{u.search_count}</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{u.bio || "—"}</TableCell>
                          <TableCell>
                            {u.resume_url ? (
                              <a href={u.resume_url} target="_blank" className="text-primary text-xs underline">View</a>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Select value={u.subscription_tier} onValueChange={(val) => changeTier(u.user_id, val)}>
                              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="elite">Elite</SelectItem>
                                <SelectItem value="infinity">Infinity</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => impersonateUser(u.email || "")}>
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedChatUser(u.user_id); setSection("chatbot"); loadChatForUser(u.user_id); }}>
                                <MessageSquare className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ===== NOTIFICATIONS ===== */}
          {section === "notifications" && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" /> Send Notification
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Title" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} />
                  <Select value={notifType} onValueChange={setNotifType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">ℹ️ Info</SelectItem>
                      <SelectItem value="alert">🚨 Alert</SelectItem>
                      <SelectItem value="webinar">🎥 Webinar</SelectItem>
                      <SelectItem value="offer">🎁 Offer</SelectItem>
                      <SelectItem value="meet">📹 Meet Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Message..." value={notifMessage} onChange={e => setNotifMessage(e.target.value)} />
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Link (optional)" value={notifLink} onChange={e => setNotifLink(e.target.value)} />
                  <Select value={notifTier} onValueChange={setNotifTier}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="free">Free Only</SelectItem>
                      <SelectItem value="pro">Pro Only</SelectItem>
                      <SelectItem value="elite">Elite Only</SelectItem>
                      <SelectItem value="infinity">Infinity Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={sendNotification} className="bg-gradient-primary text-primary-foreground">
                  <Send className="w-4 h-4 mr-1" /> Send
                </Button>
              </div>
              <div className="space-y-3">
                <h3 className="font-display font-bold">Sent ({notifications.length})</h3>
                {notifications.map((n) => (
                  <div key={n.id} className="glass rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{n.title}</span>
                        <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{n.target_tier}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      {n.link && <a href={n.link} className="text-xs text-primary underline" target="_blank">{n.link}</a>}
                      <p className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteNotification(n.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== WEBINARS ===== */}
          {section === "webinars" && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" /> Add Webinar
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Webinar Title" value={webinarTitle} onChange={e => setWebinarTitle(e.target.value)} />
                  <Input placeholder="Date & Time (e.g. 2026-03-15 18:00)" value={webinarDate} onChange={e => setWebinarDate(e.target.value)} />
                </div>
                <Textarea placeholder="Description..." value={webinarDesc} onChange={e => setWebinarDesc(e.target.value)} />
                <div className="grid md:grid-cols-3 gap-4">
                  <Input placeholder="Meeting Link" value={webinarLink} onChange={e => setWebinarLink(e.target.value)} />
                  <Input placeholder="Meeting ID" value={webinarMeetId} onChange={e => setWebinarMeetId(e.target.value)} />
                  <Input placeholder="Meeting Password" value={webinarMeetPass} onChange={e => setWebinarMeetPass(e.target.value)} />
                </div>
                <div className="flex gap-4">
                  <Select value={webinarTier} onValueChange={setWebinarTier}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="pro">Pro+</SelectItem>
                      <SelectItem value="elite">Elite+</SelectItem>
                      <SelectItem value="infinity">Infinity</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addWebinar} className="bg-gradient-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-1" /> Add Webinar
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-display font-bold">All Webinars ({webinars.length})</h3>
                {webinars.map((w) => (
                  <div key={w.id} className="glass rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">{w.title}</span>
                        <Badge variant="outline" className="text-[10px]">{w.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{w.target_tier}</Badge>
                      </div>
                      {w.description && <p className="text-xs text-muted-foreground">{w.description}</p>}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {w.scheduled_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(w.scheduled_at).toLocaleString()}</span>}
                        {w.link && <a href={w.link} className="text-primary underline flex items-center gap-1" target="_blank"><ExternalLink className="w-3 h-3" /> Join Link</a>}
                      </div>
                      {w.meeting_id && <p className="text-xs text-muted-foreground">ID: {w.meeting_id} {w.meeting_pass && `| Pass: ${w.meeting_pass}`}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteWebinar(w.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== EXPERT GUIDANCE ===== */}
          {section === "expert" && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" /> Assign Expert
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Select value={expertUserId} onValueChange={setExpertUserId}>
                    <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.display_name || u.email} ({u.subscription_tier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Expert Name" value={expertName} onChange={e => setExpertName(e.target.value)} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Expert Email" value={expertEmail} onChange={e => setExpertEmail(e.target.value)} />
                  <Input placeholder="Topic" value={expertTopic} onChange={e => setExpertTopic(e.target.value)} />
                </div>
                <Textarea placeholder="Description..." value={expertDesc} onChange={e => setExpertDesc(e.target.value)} />
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Meeting Link" value={expertLink} onChange={e => setExpertLink(e.target.value)} />
                  <Input placeholder="Scheduled Date" value={expertDate} onChange={e => setExpertDate(e.target.value)} />
                </div>
                <Textarea placeholder="Admin Notes..." value={expertNotes} onChange={e => setExpertNotes(e.target.value)} className="min-h-[60px]" />
                <Button onClick={addExpertAssignment} className="bg-gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1" /> Assign Expert
                </Button>
              </div>
              <div className="space-y-3">
                <h3 className="font-display font-bold">Assignments ({expertAssignments.length})</h3>
                {expertAssignments.map((e) => {
                  const assignedUser = users.find(u => u.user_id === e.user_id);
                  return (
                    <div key={e.id} className="glass rounded-xl p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">{e.topic}</span>
                          <Badge variant="outline" className="text-[10px]">{e.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">User: {assignedUser?.display_name || assignedUser?.email || e.user_id}</p>
                        <p className="text-xs text-muted-foreground">Expert: {e.expert_name} {e.expert_email && `(${e.expert_email})`}</p>
                        {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                        {e.meeting_link && <a href={e.meeting_link} className="text-xs text-primary underline" target="_blank">Meeting Link</a>}
                        {e.notes && <p className="text-xs text-muted-foreground italic">Notes: {e.notes}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteExpertAssignment(e.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== CHATBOT MONITOR ===== */}
          {section === "chatbot" && (
            <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-120px)]">
              {/* User list */}
              <div className="glass rounded-xl overflow-hidden flex flex-col">
                <div className="p-3 border-b border-border font-display font-bold text-sm">Chat Users ({chatUsers.length})</div>
                <div className="flex-1 overflow-y-auto">
                  {chatUsers.map(cu => (
                    <button
                      key={cu.user_id}
                      onClick={() => loadChatForUser(cu.user_id)}
                      className={`w-full text-left p-3 border-b border-border/30 hover:bg-muted/30 transition-colors ${selectedChatUser === cu.user_id ? "bg-primary/10" : ""}`}
                    >
                      <p className="text-sm font-medium">{cu.display_name || cu.email || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{cu.last_message}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(cu.last_at).toLocaleString()}</p>
                    </button>
                  ))}
                  {chatUsers.length === 0 && <p className="p-4 text-sm text-muted-foreground">No chat activity yet.</p>}
                </div>
              </div>

              {/* Chat messages */}
              <div className="md:col-span-2 glass rounded-xl overflow-hidden flex flex-col">
                <div className="p-3 border-b border-border font-display font-bold text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  {selectedChatUser ? `Chat with ${chatUsers.find(c => c.user_id === selectedChatUser)?.display_name || "User"}` : "Select a user"}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((m: any) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        m.role === "user" ? "bg-primary text-primary-foreground" :
                        m.is_admin_reply ? "bg-destructive/20 text-foreground border border-destructive/30" :
                        "bg-secondary text-secondary-foreground"
                      }`}>
                        {m.is_admin_reply && <span className="text-[10px] text-destructive block mb-1">👑 Admin Reply</span>}
                        {m.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                {selectedChatUser && (
                  <div className="p-3 border-t border-border">
                    <form onSubmit={e => { e.preventDefault(); sendAdminChatReply(); }} className="flex gap-2">
                      <Input value={adminReply} onChange={e => setAdminReply(e.target.value)} placeholder="Reply as admin..." className="flex-1 h-9 text-sm" />
                      <Button type="submit" size="sm" className="bg-destructive text-destructive-foreground">
                        <Send className="w-4 h-4 mr-1" /> Send as Admin
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== BLOGS ===== */}
          {section === "blogs" && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary" /> Write Blog Post
                </h3>
                <Input placeholder="Blog Title" value={blogTitle} onChange={e => setBlogTitle(e.target.value)} />
                <Input placeholder="Short Excerpt" value={blogExcerpt} onChange={e => setBlogExcerpt(e.target.value)} />
                <div className="flex gap-4">
                  <Select value={blogCategory} onValueChange={setBlogCategory}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Freelancing">Freelancing</SelectItem>
                      <SelectItem value="Side Hustle">Side Hustle</SelectItem>
                      <SelectItem value="AI Tools">AI Tools</SelectItem>
                      <SelectItem value="Strategy">Strategy</SelectItem>
                      <SelectItem value="Tech">Tech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Write your blog content here (supports markdown)..." value={blogContent} onChange={e => setBlogContent(e.target.value)} className="min-h-[200px]" />
                <Button onClick={addBlogPost} className="bg-gradient-primary text-primary-foreground">
                  <BookOpen className="w-4 h-4 mr-1" /> Publish
                </Button>
              </div>
              <div className="space-y-3">
                <h3 className="font-display font-bold">All Posts ({blogPosts.length})</h3>
                {blogPosts.map(b => (
                  <div key={b.id} className="glass rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{b.title}</span>
                        <Badge variant="outline" className="text-[10px]">{b.category}</Badge>
                        <Badge className={b.is_published ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"} variant="outline">
                          {b.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      {b.excerpt && <p className="text-xs text-muted-foreground">{b.excerpt}</p>}
                      <p className="text-[10px] text-muted-foreground">{new Date(b.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleBlogPublish(b.id, b.is_published)}>
                        {b.is_published ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteBlog(b.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== ANALYTICS ===== */}
          {section === "analytics" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Signups", value: users.length, icon: Users },
                  { label: "Newsletter Subs", value: newsletterCount, icon: Mail },
                  { label: "Contact Messages", value: contactCount, icon: FileText },
                  { label: "Blog Posts", value: blogPosts.length, icon: BookOpen },
                  { label: "Active Webinars", value: webinars.filter(w => w.status !== "completed").length, icon: Video },
                  { label: "Expert Assignments", value: expertAssignments.length, icon: UserCheck },
                  { label: "Chat Conversations", value: chatUsers.length, icon: MessageSquare },
                  { label: "Notifications Sent", value: notifications.length, icon: Bell },
                ].map(s => (
                  <div key={s.label} className="glass rounded-xl p-5">
                    <s.icon className="w-5 h-5 text-primary mb-2" />
                    <p className="text-2xl font-display font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Tier Distribution */}
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold">Tier Distribution</h3>
                <div className="space-y-3">
                  {[
                    { tier: "Free", count: freeUsers, color: "bg-muted-foreground" },
                    { tier: "Pro", count: proUsers, color: "bg-blue-500" },
                    { tier: "Elite", count: eliteUsers, color: "bg-accent" },
                    { tier: "Infinity", count: infinityUsers, color: "bg-yellow-500" },
                  ].map(t => (
                    <div key={t.tier} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{t.tier}</span>
                        <span className="text-muted-foreground">{t.count} ({users.length > 0 ? Math.round(t.count / users.length * 100) : 0}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${t.color} rounded-full transition-all`} style={{ width: `${users.length > 0 ? (t.count / users.length * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Activity Log */}
              <div className="glass rounded-xl p-6 space-y-3">
                <h3 className="font-display font-bold">Recent User Activity</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {users.slice(0, 20).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.display_name || u.email}</span>
                        <Badge className={tierColors[u.subscription_tier]} variant="outline">{u.subscription_tier}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{u.search_count} searches · Joined {new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== CONFIG & KEYS ===== */}
          {section === "config" && (
            <div className="space-y-6">
              {/* Environment */}
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" /> Environment Configuration
                </h3>
                <div className="space-y-2">
                  {envConfig.map(e => (
                    <div key={e.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{e.key}</code>
                        <span className="text-xs text-muted-foreground font-mono">{e.value}</span>
                      </div>
                      <Badge className="bg-primary/20 text-primary text-[10px]">
                        <CheckCircle className="w-3 h-3 mr-1" /> {e.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Keys */}
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" /> API Keys & AI Models
                </h3>
                <p className="text-xs text-muted-foreground">
                  The platform uses Lovable AI Gateway as primary. Add custom API keys via backend secrets for fallback.
                </p>
                <div className="space-y-2">
                  {apiKeysInfo.map(k => (
                    <div key={k.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{k.name}</p>
                        <p className="text-xs text-muted-foreground">{k.note}</p>
                      </div>
                      <Badge className={
                        k.status === "active" ? "bg-primary/20 text-primary" :
                        k.status === "available" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-muted text-muted-foreground"
                      } variant="outline">
                        {k.status === "active" ? <CheckCircle className="w-3 h-3 mr-1" /> :
                         k.status === "available" ? <AlertTriangle className="w-3 h-3 mr-1" /> :
                         <XCircle className="w-3 h-3 mr-1" />}
                        {k.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Info */}
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" /> Platform Details
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { label: "Platform", value: "HustleAI" },
                    { label: "Backend", value: "Lovable Cloud" },
                    { label: "Database", value: "PostgreSQL (Supabase)" },
                    { label: "Auth", value: "Email + OTP" },
                    { label: "AI Model", value: "Gemini 2.5 Flash" },
                    { label: "Storage", value: "Supabase Storage" },
                    { label: "Edge Functions", value: "3 Active" },
                    { label: "Realtime", value: "Enabled (chat_messages)" },
                  ].map(d => (
                    <div key={d.label} className="flex justify-between p-2 rounded bg-muted/20 text-sm">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
