import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  | "overview" | "users" | "roles" | "notifications" | "webinars"
  | "expert" | "chatbot" | "blogs" | "analytics" | "config"
  | "verification" | "payments" | "forum" | "community" | "trending" | "newsletter" | "email-settings";

const sidebarItems: { id: AdminSection; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Role Manager", icon: Shield },
  { id: "verification", label: "Verification", icon: UserCheck },
  { id: "payments", label: "Payments", icon: Zap },
  { id: "forum", label: "Forum Posts", icon: MessageSquare },
  { id: "community", label: "Community", icon: Globe },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "webinars", label: "Live Webinars", icon: Video },
  { id: "expert", label: "Expert Guidance", icon: Compass },
  { id: "chatbot", label: "Personal Chatbot", icon: MessageSquare },
  { id: "blogs", label: "Blog Manager", icon: BookOpen },
  { id: "trending", label: "Trending Links", icon: ExternalLink },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "email-settings", label: "Email Settings", icon: Settings },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "config", label: "Config & Keys", icon: Settings },
];

export default function AdminDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
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
  const [verifications, setVerifications] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [communityGroups, setCommunityGroups] = useState<any[]>([]);
  const [trendingLinks, setTrendingLinks] = useState<any[]>([]);
  const [newTrendTitle, setNewTrendTitle] = useState("");
  const [newTrendDesc, setNewTrendDesc] = useState("");
  const [newTrendCategory, setNewTrendCategory] = useState("Trending");
  const [newTrendLink, setNewTrendLink] = useState("");
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [roleUserId, setRoleUserId] = useState("");
  const [roleToAssign, setRoleToAssign] = useState("moderator");
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [emailSettings, setEmailSettings] = useState<any[]>([]);
  const [emailSettingsLoading, setEmailSettingsLoading] = useState(false);
  const [nlSubject, setNlSubject] = useState("");
  const [nlBody, setNlBody] = useState("");
  const [nlSending, setNlSending] = useState(false);
  const [nlFromAccount, setNlFromAccount] = useState("contact");
  const [subscribers, setSubscribers] = useState<any[]>([]);
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
    if (loading) return;

    if (!user) {
      navigate("/imskygupta-admin", { replace: true });
      return;
    }

    void checkAdmin(user.id);
  }, [loading, user?.id]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const checkAdmin = async (userId: string) => {
    setCheckingAdmin(true);
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any });

    if (error || !data) {
      setIsAdmin(false);
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/dashboard", { replace: true });
      setCheckingAdmin(false);
      return;
    }

    setIsAdmin(true);
    await loadAllData();
    setCheckingAdmin(false);
  };

  const loadAllData = async () => {
    setLoadingData(true);
    const [usersRes, notifsRes, webRes, expertRes, blogRes, nlRes, contactRes, chatRes, verifRes, payRes, forumRes, rolesRes, groupsRes, trendRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
      supabase.from("webinars").select("*").order("created_at", { ascending: false }),
      supabase.from("expert_assignments").select("*").order("created_at", { ascending: false }),
      supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("newsletter_subscribers").select("*", { count: "exact" }),
      supabase.from("contact_submissions").select("id", { count: "exact", head: true }),
      supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_verifications").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_roles").select("*").order("created_at", { ascending: false }),
      supabase.from("community_groups").select("*").order("created_at"),
      supabase.from("trending_links").select("*").order("sort_order"),
    ]);
    if (usersRes.data) setUsers(usersRes.data as UserProfile[]);
    if (notifsRes.data) setNotifications(notifsRes.data as Notification[]);
    if (webRes.data) setWebinars(webRes.data as Webinar[]);
    if (expertRes.data) setExpertAssignments(expertRes.data as ExpertAssignment[]);
    if (blogRes.data) setBlogPosts(blogRes.data as BlogPost[]);
    setNewsletterCount(nlRes.count || nlRes.data?.length || 0);
    if (nlRes.data) setSubscribers(nlRes.data);
    setContactCount(contactRes.count || 0);
    if (verifRes.data) setVerifications(verifRes.data);
    if (payRes.data) setPayments(payRes.data);
    if (forumRes.data) setForumPosts(forumRes.data);
    if (rolesRes.data) setUserRoles(rolesRes.data);
    if (groupsRes.data) setCommunityGroups(groupsRes.data);
    if (trendRes.data) setTrendingLinks(trendRes.data);
    if (rolesRes.data) setUserRoles(rolesRes.data);
    // Load email settings
    const { data: emailData } = await supabase.from("email_settings").select("*").order("created_at");
    if (emailData) setEmailSettings(emailData);
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

  const WELCOME_CHANNEL_ID = "c4541d1b-8b58-46b1-90b5-58c6e36251ef";

  const sendNotification = async () => {
    if (!notifTitle || !notifMessage) return;
    const { error } = await supabase.from("notifications").insert({
      title: notifTitle, message: notifMessage, type: notifType,
      link: notifLink || null, target_tier: notifTier, created_by: user!.id,
    });
    if (!error) {
      // Also post non-webinar notifications to Welcome & Onboarding channel
      if (notifType !== "webinar") {
        await supabase.from("forum_posts").insert({
          group_id: WELCOME_CHANNEL_ID,
          user_id: user!.id,
          user_name: "HustleAI Team",
          content: notifMessage + (notifLink ? `\n\n🔗 ${notifLink}` : ""),
          title: `📢 ${notifTitle}`,
          category: "Welcome & Onboarding",
          post_type: "announcement",
          is_approved: true,
        });
      }
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

  const assignRole = async () => {
    if (!roleUserId || !roleToAssign) return;
    const { error } = await supabase.from("user_roles").insert({
      user_id: roleUserId, role: roleToAssign as any,
    });
    if (error) {
      if (error.code === "23505") toast({ title: "Already assigned", description: "User already has this role.", variant: "destructive" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role Assigned!" });
      setRoleUserId("");
      loadAllData();
    }
  };

  const removeRole = async (id: string) => {
    await supabase.from("user_roles").delete().eq("id", id);
    setUserRoles(userRoles.filter(r => r.id !== id));
    toast({ title: "Role Removed" });
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: "Mismatch", description: "New passwords don't match.", variant: "destructive" });
      return;
    }
    if (passwordForm.new.length < 6) {
      toast({ title: "Too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password Updated!", description: "Your admin password has been changed." });
      setPasswordForm({ current: "", new: "", confirm: "" });
    }
    setChangingPassword(false);
  };

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-display text-xl">Loading Admin...</div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

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
        <nav className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 56px - 100px)" }}>
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

          {/* ===== ROLE MANAGER ===== */}
          {section === "roles" && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> Assign Role
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <Select value={roleUserId} onValueChange={setRoleUserId}>
                    <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.display_name || u.email} ({u.subscription_tier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={roleToAssign} onValueChange={setRoleToAssign}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">🛡️ Admin (Full Access)</SelectItem>
                      <SelectItem value="moderator">📝 Moderator (Blog + Forum)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={assignRole} className="bg-gradient-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-1" /> Assign Role
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Admin:</strong> Full dashboard access · <strong>Moderator:</strong> Can write blogs, moderate forum posts
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-display font-bold">Current Roles ({userRoles.length})</h3>
                {userRoles.length === 0 && <p className="text-sm text-muted-foreground">No roles assigned yet.</p>}
                {userRoles.map((r: any) => {
                  const rUser = users.find(u => u.user_id === r.user_id);
                  return (
                    <div key={r.id} className="glass rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {(rUser?.display_name || rUser?.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{rUser?.display_name || rUser?.email || r.user_id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">{rUser?.email}</p>
                        </div>
                        <Badge className={r.role === "admin" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"} variant="outline">
                          {r.role === "admin" ? "🛡️" : "📝"} {r.role}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeRole(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Change Password */}
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" /> Change Admin Password
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <Input type="password" placeholder="New Password" value={passwordForm.new}
                    onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} />
                  <Input type="password" placeholder="Confirm New Password" value={passwordForm.confirm}
                    onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
                  <Button onClick={handleChangePassword} disabled={changingPassword}
                    className="bg-destructive text-destructive-foreground">
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
            </div>
          )}


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

          {/* ===== VERIFICATION ===== */}
          {section === "verification" && (
            <div className="space-y-4">
              <h3 className="font-display font-bold">Verification Requests ({verifications.length})</h3>
              {verifications.map((v: any) => {
                const vUser = users.find(u => u.user_id === v.user_id);
                return (
                  <div key={v.id} className="glass rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{vUser?.display_name || vUser?.email || v.user_id}</span>
                        <Badge variant="outline" className={`text-[10px] ${v.status === "approved" ? "text-primary" : v.status === "rejected" ? "text-destructive" : "text-yellow-500"}`}>{v.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Submitted: {new Date(v.created_at).toLocaleString()}</p>
                      <div className="flex gap-2 text-xs">
                        <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/kyc-documents/${v.id_card_url}`} target="_blank" className="text-primary underline">ID Card</a>
                        <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/kyc-documents/${v.photo_url}`} target="_blank" className="text-primary underline">Photo</a>
                      </div>
                    </div>
                    {v.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-primary/20 text-primary h-8" onClick={async () => {
                          await supabase.from("user_verifications").update({ status: "approved", reviewed_by: user!.id, reviewed_at: new Date().toISOString() } as any).eq("id", v.id);
                          await supabase.from("profiles").update({ is_verified: true } as any).eq("user_id", v.user_id);
                          // Award XP
                          const { data: p } = await supabase.from("profiles").select("xp_points").eq("user_id", v.user_id).single();
                          await supabase.from("profiles").update({ xp_points: ((p as any)?.xp_points || 0) + 50 } as any).eq("user_id", v.user_id);
                          toast({ title: "Approved!" });
                          loadAllData();
                        }}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive h-8" onClick={async () => {
                          await supabase.from("user_verifications").update({ status: "rejected", reviewed_by: user!.id, reviewed_at: new Date().toISOString(), rejection_reason: "Documents unclear" } as any).eq("id", v.id);
                          toast({ title: "Rejected" });
                          loadAllData();
                        }}>
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {verifications.length === 0 && <p className="text-muted-foreground text-sm">No verification requests.</p>}
            </div>
          )}

          {/* ===== PAYMENTS ===== */}
          {section === "payments" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Payments", value: payments.length },
                  { label: "Successful", value: payments.filter((p: any) => p.status === "paid").length },
                  { label: "Revenue", value: `₹${payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}` },
                  { label: "Pending", value: payments.filter((p: any) => p.status === "pending").length },
                ].map(s => (
                  <div key={s.label} className="glass rounded-xl p-5">
                    <p className="text-2xl font-display font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="glass rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p: any) => {
                      const pUser = users.find(u => u.user_id === p.user_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-mono">{p.order_id}</TableCell>
                          <TableCell className="text-xs">{pUser?.display_name || pUser?.email || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{p.plan}</Badge></TableCell>
                          <TableCell>₹{p.amount}</TableCell>
                          <TableCell>
                            <Badge className={p.status === "paid" ? "bg-primary/20 text-primary" : p.status === "pending" ? "bg-yellow-500/20 text-yellow-500" : "bg-destructive/20 text-destructive"} variant="outline">
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ===== FORUM MODERATION ===== */}
          {section === "forum" && (
            <div className="space-y-4">
              <h3 className="font-display font-bold">Forum Posts ({forumPosts.length})</h3>
              <div className="flex gap-2 mb-4">
                <Badge variant="outline" className="text-[10px]">Pending: {forumPosts.filter((p: any) => !p.is_approved).length}</Badge>
                <Badge variant="outline" className="text-[10px] text-primary">Approved: {forumPosts.filter((p: any) => p.is_approved).length}</Badge>
              </div>
              {forumPosts.filter((p: any) => !p.is_approved).map((post: any) => (
                <div key={post.id} className="glass rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {post.title && <span className="font-semibold text-sm">{post.title}</span>}
                      <Badge variant="outline" className="text-[10px]">{post.category || "General"}</Badge>
                      <Badge variant="outline" className="text-[10px] text-yellow-500">Pending</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{post.content}</p>
                    <p className="text-[10px] text-muted-foreground">By: {post.user_name || post.user_id.slice(0, 8)} · {new Date(post.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-primary/20 text-primary h-8" onClick={async () => {
                      await supabase.from("forum_posts").update({ is_approved: true }).eq("id", post.id);
                      setForumPosts(forumPosts.map((p: any) => p.id === post.id ? { ...p, is_approved: true } : p));
                      toast({ title: "Approved!" });
                    }}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={async () => {
                      await supabase.from("forum_posts").delete().eq("id", post.id);
                      setForumPosts(forumPosts.filter((p: any) => p.id !== post.id));
                    }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {forumPosts.filter((p: any) => !p.is_approved).length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">All posts are approved! ✅</p>
              )}
            </div>
          )}
          {/* ===== COMMUNITY ===== */}
          {section === "community" && (
            <div className="space-y-4">
              <h3 className="font-display font-bold">Community Channels ({communityGroups.length})</h3>
              {communityGroups.map((g: any) => (
                <div key={g.id} className="glass rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{g.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.description || "No description"}</p>
                      <div className="flex gap-2 mt-1">
                        {g.is_default && <Badge variant="outline" className="text-[10px]">Default</Badge>}
                        {g.is_readonly && <Badge variant="outline" className="text-[10px]">Read-only</Badge>}
                        <Badge variant="outline" className="text-[10px]">Min: {g.min_tier}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { navigate("/community"); }}>
                    <MessageSquare className="w-3 h-3 mr-1" /> View
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* ===== TRENDING LINKS ===== */}
          {section === "trending" && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" /> Add Trending Link
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Title" value={newTrendTitle} onChange={e => setNewTrendTitle(e.target.value)} />
                  <Input placeholder="Category (e.g. Trending, Tech, Creative)" value={newTrendCategory} onChange={e => setNewTrendCategory(e.target.value)} />
                </div>
                <Textarea placeholder="Description..." value={newTrendDesc} onChange={e => setNewTrendDesc(e.target.value)} />
                <Input placeholder="Link URL (optional — Notion pages, articles, etc.)" value={newTrendLink} onChange={e => setNewTrendLink(e.target.value)} />
                <Button onClick={async () => {
                  if (!newTrendTitle) return;
                  await supabase.from("trending_links").insert({
                    title: newTrendTitle, description: newTrendDesc || null,
                    category: newTrendCategory, link: newTrendLink || null,
                    created_by: user!.id, sort_order: trendingLinks.length,
                  });
                  toast({ title: "Link Added!" });
                  setNewTrendTitle(""); setNewTrendDesc(""); setNewTrendLink("");
                  loadAllData();
                }} className="bg-gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1" /> Add Link
                </Button>
              </div>
              <div className="space-y-3">
                <h3 className="font-display font-bold">Current Links ({trendingLinks.length})</h3>
                {trendingLinks.map((t: any) => (
                  <div key={t.id} className="glass rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{t.title}</span>
                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                      {t.link && <a href={t.link} target="_blank" className="text-xs text-primary underline">{t.link}</a>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      await supabase.from("trending_links").delete().eq("id", t.id);
                      setTrendingLinks(trendingLinks.filter((l: any) => l.id !== t.id));
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== NEWSLETTER ===== */}
          {section === "newsletter" && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" /> Send Newsletter (Bulk Email)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Send emails to all <strong>{newsletterCount}</strong> newsletter subscribers.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Email Subject" value={nlSubject} onChange={e => setNlSubject(e.target.value)} />
                  <Select value={nlFromAccount} onValueChange={setNlFromAccount}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {emailSettings.filter((es: any) => es.is_active).map((es: any) => (
                        <SelectItem key={es.category} value={es.category}>From: {es.smtp_email || es.label}</SelectItem>
                      ))}
                      <SelectItem value="contact">From: contact@hustelai.eu.cc (default)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Email body (HTML supported)..."
                  value={nlBody}
                  onChange={e => setNlBody(e.target.value)}
                  className="min-h-[200px]"
                />
                <div className="flex gap-3">
                  <Button
                    onClick={async () => {
                      if (!nlSubject || !nlBody) {
                        toast({ title: "Required", description: "Enter subject and body.", variant: "destructive" });
                        return;
                      }
                      setNlSending(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("send-email", {
                          body: { action: "send_newsletter", subject: nlSubject, body: nlBody, category: nlFromAccount, from_account: nlFromAccount },
                        });
                        if (error) throw error;
                        toast({ title: "Newsletter Sent! ✉️", description: `Sent to ${data?.sent || 0} of ${data?.total || 0} subscribers.` });
                        setNlSubject(""); setNlBody("");
                      } catch (err: any) {
                        toast({ title: "Error", description: err.message, variant: "destructive" });
                      }
                      setNlSending(false);
                    }}
                    disabled={nlSending}
                    className="bg-gradient-primary text-primary-foreground"
                  >
                    <Send className="w-4 h-4 mr-1" /> {nlSending ? "Sending..." : "Send to All Subscribers"}
                  </Button>
                </div>
              </div>

              {/* Subscribers List */}
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold">Subscribers ({subscribers.length})</h3>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {subscribers.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary/60" />
                        <span className="text-sm">{s.email}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(s.subscribed_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {subscribers.length === 0 && <p className="text-sm text-muted-foreground">No subscribers yet.</p>}
                </div>
              </div>
            </div>
          )}
          {/* ===== EMAIL SETTINGS ===== */}
          {section === "email-settings" && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" /> Email Account Settings
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure SMTP email accounts for different notification types. Each category can use a different sender email for professional communication.
                </p>
              </div>

              <div className="space-y-4">
                {emailSettings.map((es: any) => (
                  <div key={es.id} className="glass rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-semibold">{es.label}</h4>
                        <Badge variant="outline" className="text-[10px]">{es.category}</Badge>
                        <Badge className={es.is_active ? "bg-primary/20 text-primary text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                          {es.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await supabase.from("email_settings").update({ is_active: !es.is_active } as any).eq("id", es.id);
                          setEmailSettings(emailSettings.map((e: any) => e.id === es.id ? { ...e, is_active: !es.is_active } : e));
                          toast({ title: es.is_active ? "Deactivated" : "Activated" });
                        }}
                      >
                        {es.is_active ? "Disable" : "Enable"}
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">SMTP Email</Label>
                        <Input
                          type="email"
                          value={es.smtp_email || ""}
                          placeholder="e.g. payments@hustelai.eu.cc"
                          onChange={(e) => {
                            setEmailSettings(emailSettings.map((item: any) =>
                              item.id === es.id ? { ...item, smtp_email: e.target.value } : item
                            ));
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">SMTP Password</Label>
                        <Input
                          type="password"
                          value={es.smtp_password || ""}
                          placeholder="Enter SMTP password"
                          onChange={(e) => {
                            setEmailSettings(emailSettings.map((item: any) =>
                              item.id === es.id ? { ...item, smtp_password: e.target.value } : item
                            ));
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={async () => {
                          const { error } = await supabase.from("email_settings").update({
                            smtp_email: es.smtp_email,
                            smtp_password: es.smtp_password,
                            updated_at: new Date().toISOString(),
                          } as any).eq("id", es.id);
                          if (error) {
                            toast({ title: "Error", description: error.message, variant: "destructive" });
                          } else {
                            toast({ title: "Saved!", description: `${es.label} email settings updated.` });
                          }
                        }}
                        className="bg-gradient-primary text-primary-foreground"
                      >
                        Save {es.label} Settings
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!es.smtp_email || !es.smtp_password) {
                            toast({ title: "Missing credentials", description: "Save email & password first.", variant: "destructive" });
                            return;
                          }
                          toast({ title: "Sending test...", description: `From ${es.smtp_email}` });
                          try {
                            const { data, error } = await supabase.functions.invoke("send-email", {
                              body: { action: "send_test", category: es.category, test_to: "samratakash0000@gmail.com" },
                            });
                            if (error) throw error;
                            toast({ title: "Test mail sent! ✅", description: `Sent to samratakash0000@gmail.com from ${es.smtp_email}` });
                          } catch (err: any) {
                            toast({ title: "Test failed ❌", description: err.message, variant: "destructive" });
                          }
                        }}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" /> Send Test Mail
                      </Button>
                    </div>
                  </div>
                ))}
                {emailSettings.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No email settings configured. Reload the page.</p>
                )}
              </div>

              {/* Add new email category */}
              <div className="glass rounded-xl p-6 space-y-4">
                <h4 className="font-display font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Add New Email Category
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input id="new-email-cat" placeholder="Category key (e.g. invoices)" />
                  <Input id="new-email-label" placeholder="Display label (e.g. Invoices & Billing)" />
                </div>
                <Button onClick={async () => {
                  const cat = (document.getElementById("new-email-cat") as HTMLInputElement)?.value.trim();
                  const label = (document.getElementById("new-email-label") as HTMLInputElement)?.value.trim();
                  if (!cat || !label) return;
                  const { error } = await supabase.from("email_settings").insert({
                    category: cat, label, smtp_email: "", smtp_password: "", is_active: false,
                  });
                  if (error) {
                    toast({ title: "Error", description: error.code === "23505" ? "Category already exists" : error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Category Added!" });
                    const { data } = await supabase.from("email_settings").select("*").order("created_at");
                    if (data) setEmailSettings(data);
                  }
                }} variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Add Category
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}