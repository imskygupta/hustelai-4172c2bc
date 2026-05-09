import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { communityDb } from "@/integrations/community/client";
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
  Clock, ExternalLink, Activity, Database, Server, Zap,
  Wallet, Gift, Share2,
  Flag,
  CreditCard as CreditCardIcon,
} from "lucide-react";
import { PaymentMethodsManager } from "@/components/admin/PaymentMethodsManager";
import { DodoAdminPanel } from "@/components/admin/DodoAdminPanel";
import { DodoCouponsPanel } from "@/components/admin/DodoCouponsPanel";
import { BrevoNewsletterPanel } from "@/components/admin/BrevoNewsletterPanel";
import { SQL_BLOCKS } from "@/lib/work-sql";
import { FeatureFlagsManager } from "@/components/admin/FeatureFlagsManager";
import { UsageAnalyticsManager } from "@/components/admin/UsageAnalyticsManager";
import { SeoLandingManager } from "@/components/admin/SeoLandingManager";
import { SeoBlogManager } from "@/components/admin/SeoBlogManager";
import { SystemHealth } from "@/components/admin/SystemHealth";

import { SEO } from "@/components/SEO";

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
  | "verification" | "payments" | "forum" | "community" | "trending" | "newsletter" | "email-settings" | "ai-providers" | "send-email" | "orders"
  | "payment-logs" | "bonus-kits" | "social-links" | "sql-setup" | "feature-flags" | "system-health" | "dodo-payments";
type AdminSectionExt = AdminSection | "seo-pages" | "seo-blog" | "usage-analytics";

const sidebarItems: { id: AdminSection; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Role Manager", icon: Shield },
  { id: "verification", label: "Verification", icon: UserCheck },
  { id: "payments", label: "Payments", icon: Zap },
  { id: "dodo-payments", label: "Dodo Payments", icon: CreditCardIcon },
  { id: "payment-logs", label: "Payment Logs", icon: Clock },
  { id: "orders", label: "Orders", icon: FileText },
  { id: "bonus-kits", label: "Bonus Kits", icon: Gift },
  { id: "social-links", label: "Social Links", icon: Share2 },
  { id: "send-email", label: "Send Email", icon: Send },
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
  { id: "ai-providers", label: "AI Providers", icon: Zap },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "config", label: "Config & Keys", icon: Settings },
  { id: "sql-setup", label: "SQL Setup", icon: Database },
  { id: "feature-flags", label: "Feature Flags", icon: Flag },
  { id: "system-health", label: "System Health", icon: Activity },
  { id: "seo-pages" as AdminSection, label: "SEO Pages", icon: Globe },
  { id: "seo-blog" as AdminSection, label: "Insights / Blog", icon: BookOpen },
  { id: "usage-analytics" as AdminSection, label: "Usage Analytics", icon: BarChart3 },
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
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);
  const [bonusKits, setBonusKits] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [newBonusTitle, setNewBonusTitle] = useState("");
  const [newBonusDesc, setNewBonusDesc] = useState("");
  const [newBonusLink, setNewBonusLink] = useState("");
  const [newBonusTier, setNewBonusTier] = useState("all");
  const [newSocialPlatform, setNewSocialPlatform] = useState("instagram");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [newSocialIcon, setNewSocialIcon] = useState("");
  // Custom email form
  const [customEmailRecipients, setCustomEmailRecipients] = useState<string[]>([]);
  const [customEmailSubject, setCustomEmailSubject] = useState("");
  const [customEmailBody, setCustomEmailBody] = useState("");
  const [customEmailCategory, setCustomEmailCategory] = useState("contact");
  const [customEmailSending, setCustomEmailSending] = useState(false);
  const [customEmailSelectAll, setCustomEmailSelectAll] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderDisplay, setNewProviderDisplay] = useState("");
  const [newProviderKey, setNewProviderKey] = useState("");
  const [newProviderEndpoint, setNewProviderEndpoint] = useState("");
  const [newProviderModel, setNewProviderModel] = useState("");
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
    const [usersRes, notifsRes, webRes, expertRes, blogRes, nlRes, contactRes, chatRes, verifRes, payRes, forumRes, rolesRes, groupsRes, trendRes, ordersRes] = await Promise.all([
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
      communityDb.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_roles").select("*").order("created_at", { ascending: false }),
      communityDb.from("community_groups").select("*").order("created_at"),
      supabase.from("trending_links").select("*").order("sort_order"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
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
    if (ordersRes.data) setOrders(ordersRes.data);
    // Load email settings
    const { data: emailData } = await supabase.from("email_settings").select("*").order("created_at");
    if (emailData) setEmailSettings(emailData);
    const { data: aiData } = await supabase.from("ai_provider_keys").select("*").order("priority");
    if (aiData) setAiProviders(aiData);
    // Load bonus kits, social links, payment logs
    const { data: bonusData } = await supabase.from("bonus_kits" as any).select("*").order("created_at", { ascending: false });
    if (bonusData) setBonusKits(bonusData as any);
    const { data: socialData } = await supabase.from("social_links" as any).select("*").order("display_order");
    if (socialData) setSocialLinks(socialData as any);
    try {
      const { data: logsData } = await supabase.functions.invoke("cashfree-payment", { body: { action: "get_payment_logs" } });
      if (logsData?.logs) setPaymentLogs(logsData.logs);
    } catch {}
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

  const impersonateUser = async (userId: string, email: string) => {
    try {
      toast({ title: "Impersonating...", description: `Logging in as ${email}` });
      const { data, error } = await supabase.functions.invoke("admin-utils", {
        body: { action: "impersonate_user", user_id: userId, email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      // Sign out admin first
      await supabase.auth.signOut();
      
      // Use the token_hash to verify and sign in as the user
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: data.email,
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (verifyErr) throw verifyErr;
      
      toast({ title: "Impersonation Active", description: `Now logged in as ${email}` });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Impersonation Failed", description: err.message, variant: "destructive" });
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to DELETE user ${email}? This cannot be undone!`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-utils", {
        body: { action: "delete_user", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({ title: "User Deleted", description: `${email} has been removed.` });
      setUsers(users.filter(u => u.user_id !== userId));
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  const sendCustomEmail = async () => {
    if (!customEmailSubject || !customEmailBody || customEmailRecipients.length === 0) {
      toast({ title: "Required", description: "Select recipients, enter subject and body.", variant: "destructive" });
      return;
    }
    setCustomEmailSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-utils", {
        body: {
          action: "send_custom_email",
          recipients: customEmailRecipients,
          subject: customEmailSubject,
          body: customEmailBody,
          category: customEmailCategory,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Emails Sent! ✉️", description: `Sent to ${data?.sent || 0} of ${data?.total || 0} recipients.` });
      setCustomEmailSubject(""); setCustomEmailBody(""); setCustomEmailRecipients([]); setCustomEmailSelectAll(false);
    } catch (err: any) {
      toast({ title: "Send Failed", description: err.message, variant: "destructive" });
    }
    setCustomEmailSending(false);
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
        await communityDb.from("forum_posts").insert({
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
      <SEO title="Admin | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
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
                              <Button variant="ghost" size="sm" title="Impersonate" onClick={() => impersonateUser(u.user_id, u.email || "")}>
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedChatUser(u.user_id); setSection("chatbot"); loadChatForUser(u.user_id); }}>
                                <MessageSquare className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Delete User" onClick={() => deleteUser(u.user_id, u.email || "")}>
                                <Trash2 className="w-3 h-3 text-destructive" />
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
              <PaymentMethodsManager />

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
                      await communityDb.from("forum_posts").update({ is_approved: true }).eq("id", post.id);
                      setForumPosts(forumPosts.map((p: any) => p.id === post.id ? { ...p, is_approved: true } : p));
                      toast({ title: "Approved!" });
                    }}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={async () => {
                      await communityDb.from("forum_posts").delete().eq("id", post.id);
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

          {/* ===== AI PROVIDERS ===== */}
          {section === "ai-providers" && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> AI Provider Management
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage AI providers used across the platform (search, chatbot, lead discovery). 
                  The system tries providers in priority order — if one fails, it falls back to the next.
                </p>
              </div>

              {/* Existing Providers */}
              <div className="space-y-4">
                {aiProviders.map((p: any) => (
                  <div key={p.id} className="glass rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-semibold">{p.display_name}</h4>
                        <Badge variant="outline" className="text-[10px]">Priority: {p.priority}</Badge>
                        <Badge className={p.is_active ? "bg-primary/20 text-primary text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await supabase.from("ai_provider_keys").update({ is_active: !p.is_active } as any).eq("id", p.id);
                            setAiProviders(aiProviders.map((a: any) => a.id === p.id ? { ...a, is_active: !p.is_active } : a));
                            toast({ title: p.is_active ? "Deactivated" : "Activated" });
                          }}
                        >
                          {p.is_active ? "Disable" : "Enable"}
                        </Button>
                        {p.provider_name !== "lovable_ai" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await supabase.from("ai_provider_keys").delete().eq("id", p.id);
                              setAiProviders(aiProviders.filter((a: any) => a.id !== p.id));
                              toast({ title: "Deleted" });
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">API Endpoint</Label>
                        <Input
                          value={p.api_endpoint}
                          onChange={(e) => setAiProviders(aiProviders.map((a: any) => a.id === p.id ? { ...a, api_endpoint: e.target.value } : a))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Default Model</Label>
                        <Input
                          value={p.default_model}
                          onChange={(e) => setAiProviders(aiProviders.map((a: any) => a.id === p.id ? { ...a, default_model: e.target.value } : a))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">API Key {p.provider_name === "lovable_ai" ? "(uses system secret)" : ""}</Label>
                        <Input
                          type="password"
                          value={p.provider_name === "lovable_ai" ? "default" : p.api_key}
                          disabled={p.provider_name === "lovable_ai"}
                          onChange={(e) => setAiProviders(aiProviders.map((a: any) => a.id === p.id ? { ...a, api_key: e.target.value } : a))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Priority (lower = tried first)</Label>
                        <Input
                          type="number"
                          value={p.priority}
                          onChange={(e) => setAiProviders(aiProviders.map((a: any) => a.id === p.id ? { ...a, priority: parseInt(e.target.value) || 0 } : a))}
                        />
                      </div>
                    </div>
                    {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                    <Button
                      size="sm"
                      onClick={async () => {
                        const { error } = await supabase.from("ai_provider_keys").update({
                          api_endpoint: p.api_endpoint,
                          default_model: p.default_model,
                          api_key: p.api_key,
                          priority: p.priority,
                          updated_at: new Date().toISOString(),
                        } as any).eq("id", p.id);
                        if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                        else toast({ title: "Saved!" });
                      }}
                      className="bg-gradient-primary text-primary-foreground"
                    >
                      Save Changes
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add New Provider */}
              <div className="glass rounded-xl p-6 space-y-4">
                <h4 className="font-display font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Add New AI Provider
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Provider name (e.g. openai)" value={newProviderName} onChange={e => setNewProviderName(e.target.value)} />
                  <Input placeholder="Display name (e.g. OpenAI GPT-4)" value={newProviderDisplay} onChange={e => setNewProviderDisplay(e.target.value)} />
                  <Input placeholder="API Key" type="password" value={newProviderKey} onChange={e => setNewProviderKey(e.target.value)} />
                  <Input placeholder="API Endpoint URL" value={newProviderEndpoint} onChange={e => setNewProviderEndpoint(e.target.value)} />
                  <Input placeholder="Default Model Name" value={newProviderModel} onChange={e => setNewProviderModel(e.target.value)} />
                </div>
                <Button
                  onClick={async () => {
                    if (!newProviderName || !newProviderDisplay || !newProviderKey || !newProviderEndpoint || !newProviderModel) {
                      toast({ title: "All fields required", variant: "destructive" });
                      return;
                    }
                    const maxPriority = Math.max(...aiProviders.map((p: any) => p.priority), 0);
                    const { error } = await supabase.from("ai_provider_keys").insert({
                      provider_name: newProviderName,
                      display_name: newProviderDisplay,
                      api_key: newProviderKey,
                      api_endpoint: newProviderEndpoint,
                      default_model: newProviderModel,
                      priority: maxPriority + 1,
                      is_active: true,
                    } as any);
                    if (error) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Provider Added!" });
                      setNewProviderName(""); setNewProviderDisplay(""); setNewProviderKey(""); setNewProviderEndpoint(""); setNewProviderModel("");
                      const { data } = await supabase.from("ai_provider_keys").select("*").order("priority");
                      if (data) setAiProviders(data);
                    }
                  }}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Provider
                </Button>
              </div>
            </div>
          )}

          {/* ===== NEWSLETTER ===== */}
          {section === "newsletter" && (
            <BrevoNewsletterPanel />
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
                          placeholder="e.g. payments@hustlaiapp.in"
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
                              body: { action: "send_test", category: es.category, test_to: "hustlaiapp@zohomail.in" },
                            });
                            if (error) throw error;
                            toast({ title: "Test mail sent! ✅", description: `Sent to hustlaiapp@zohomail.in from ${es.smtp_email}` });
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

          {/* ===== SEND CUSTOM EMAIL ===== */}
          {section === "send-email" && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" /> Send Custom Email to Users
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select users and send them custom emails about payments, invoices, or announcements via SMTP.
                </p>

                {/* Recipient Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Select Recipients ({customEmailRecipients.length} selected)</Label>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (customEmailSelectAll) {
                        setCustomEmailRecipients([]);
                        setCustomEmailSelectAll(false);
                      } else {
                        setCustomEmailRecipients(users.filter(u => u.email).map(u => u.email!));
                        setCustomEmailSelectAll(true);
                      }
                    }}>
                      {customEmailSelectAll ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-1 border border-border/50 rounded-lg p-3">
                    {users.map(u => (
                      <label key={u.user_id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customEmailRecipients.includes(u.email || "")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomEmailRecipients([...customEmailRecipients, u.email || ""]);
                            } else {
                              setCustomEmailRecipients(customEmailRecipients.filter(r => r !== u.email));
                              setCustomEmailSelectAll(false);
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{u.display_name || u.email}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{u.email}</span>
                        <Badge className={tierColors[u.subscription_tier] || ""} variant="outline">{u.subscription_tier}</Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Email Content */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Email Subject" value={customEmailSubject} onChange={e => setCustomEmailSubject(e.target.value)} />
                  <Select value={customEmailCategory} onValueChange={setCustomEmailCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {emailSettings.filter((es: any) => es.is_active).map((es: any) => (
                        <SelectItem key={es.category} value={es.category}>From: {es.smtp_email || es.label}</SelectItem>
                      ))}
                      <SelectItem value="contact">From: hustlaiapp@zohomail.in (default)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Templates */}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => {
                    setCustomEmailSubject("Payment Confirmation - HustleAI");
                    setCustomEmailBody(`<p>Dear User,</p><p>Your payment has been <strong>successfully received</strong>. Thank you for upgrading your HustleAI plan!</p><p>If you have any questions about your subscription, please don't hesitate to reach out.</p><p>Best regards,<br/>HustleAI Team</p>`);
                  }}>💳 Payment Confirmation</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setCustomEmailSubject("Invoice - HustleAI Subscription");
                    setCustomEmailBody(`<p>Dear User,</p><p>Please find your invoice details below:</p><table style="border-collapse:collapse;width:100%;margin:16px 0;"><tr style="background:#f0f0f0;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Plan</td><td style="padding:8px;border:1px solid #ddd;">[Plan Name]</td></tr><tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Amount</td><td style="padding:8px;border:1px solid #ddd;">₹[Amount]</td></tr><tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Date</td><td style="padding:8px;border:1px solid #ddd;">[Date]</td></tr><tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Status</td><td style="padding:8px;border:1px solid #ddd;">Paid ✅</td></tr></table><p>Thank you for your trust!</p>`);
                  }}>🧾 Invoice Template</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setCustomEmailSubject("Subscription Update - HustleAI");
                    setCustomEmailBody(`<p>Dear User,</p><p>We wanted to let you know about an update to your subscription:</p><ul><li>Your plan has been updated</li><li>New features are now available</li></ul><p>Visit your <a href="https://hustlaiapp.in/profile" style="color:#6366f1;">profile page</a> to see the changes.</p>`);
                  }}>🔔 Subscription Update</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setCustomEmailSubject("Your Order from HustleAI Marketplace");
                    setCustomEmailBody(`<p>Dear User,</p><p>Your order has been processed successfully!</p><p><strong>Order Details:</strong></p><ul><li>Item: [Item Name]</li><li>Amount: ₹[Amount]</li><li>Status: Completed ✅</li></ul><p>You can access your purchase from the <a href="https://hustlaiapp.in/marketplace" style="color:#6366f1;">Marketplace</a>.</p>`);
                  }}>📦 Order Confirmation</Button>
                </div>

                <Textarea
                  placeholder="Email body (HTML supported)..."
                  value={customEmailBody}
                  onChange={e => setCustomEmailBody(e.target.value)}
                  className="min-h-[200px]"
                />
                <Button onClick={sendCustomEmail} disabled={customEmailSending} className="bg-gradient-primary text-primary-foreground">
                  <Send className="w-4 h-4 mr-1" /> {customEmailSending ? "Sending..." : `Send to ${customEmailRecipients.length} User(s)`}
                </Button>
              </div>
            </div>
          )}

          {/* ===== ORDERS ===== */}
          {section === "orders" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold">Orders & Purchases ({orders.length})</h3>
              </div>
              {orders.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No orders yet. Orders will appear when users purchase marketplace items.</p>
                </div>
              ) : (
                <div className="glass rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o: any) => {
                        const orderUser = users.find(u => u.user_id === o.user_id);
                        return (
                          <TableRow key={o.id}>
                            <TableCell className="text-xs font-mono">{o.invoice_number || "—"}</TableCell>
                            <TableCell className="text-sm">{orderUser?.display_name || orderUser?.email || o.user_id?.slice(0, 8)}</TableCell>
                            <TableCell className="text-sm font-medium">{o.item_title}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{o.item_type}</Badge></TableCell>
                            <TableCell className="text-sm">₹{o.amount}</TableCell>
                            <TableCell>
                              <Badge className={
                                o.status === "completed" ? "bg-primary/20 text-primary" :
                                o.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-destructive/20 text-destructive"
                              } variant="outline">{o.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Select value={o.status} onValueChange={async (val) => {
                                await supabase.from("orders").update({ status: val, updated_at: new Date().toISOString() } as any).eq("id", o.id);
                                setOrders(orders.map((ord: any) => ord.id === o.id ? { ...ord, status: val } : ord));
                                toast({ title: "Status Updated" });
                              }}>
                                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="refunded">Refunded</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* ===== PAYMENT LOGS ===== */}
          {section === "dodo-payments" && (
            <div className="space-y-8">
              <DodoAdminPanel />
              <DodoCouponsPanel />
            </div>
          )}

          {section === "payment-logs" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold">Payment Lifecycle Logs ({paymentLogs.length})</h3>
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const { data } = await supabase.functions.invoke("cashfree-payment", { body: { action: "get_payment_logs" } });
                    if (data?.logs) setPaymentLogs(data.logs);
                    toast({ title: "Refreshed" });
                  } catch {}
                }}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
              </div>
              {paymentLogs.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No payment logs yet.</p>
                </div>
              ) : (
                <div className="glass rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentLogs.map((log: any) => {
                        const logUser = users.find(u => u.user_id === log.user_id);
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm">{logUser?.display_name || logUser?.email || log.user_id?.slice(0, 8)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                log.status === "completed" || log.status === "subscription_activated" ? "bg-primary/20 text-primary" :
                                log.status === "confirmed" ? "bg-primary/20 text-primary" :
                                log.status === "initiated" ? "bg-yellow-500/20 text-yellow-400" :
                                log.status === "failed" ? "bg-destructive/20 text-destructive" :
                                "bg-secondary text-secondary-foreground"
                              }>{log.status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{log.message}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* ===== BONUS KITS ===== */}
          {section === "bonus-kits" && (
            <div className="space-y-6">
              <h3 className="font-display font-bold">Bonus Kits & Promotional Links</h3>
              <p className="text-sm text-muted-foreground">Add promotional links/ads shown to users after successful payment.</p>
              
              <div className="glass rounded-xl p-5 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Title (e.g. Free Canva Pro)" value={newBonusTitle} onChange={e => setNewBonusTitle(e.target.value)} />
                  <Input placeholder="Link URL" value={newBonusLink} onChange={e => setNewBonusLink(e.target.value)} />
                </div>
                <Input placeholder="Description (optional)" value={newBonusDesc} onChange={e => setNewBonusDesc(e.target.value)} />
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Target Tier</Label>
                    <Select value={newBonusTier} onValueChange={setNewBonusTier}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="pro">Pro Only</SelectItem>
                        <SelectItem value="elite">Elite Only</SelectItem>
                        <SelectItem value="infinity">Infinity Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={async () => {
                    if (!newBonusTitle || !newBonusLink) return toast({ title: "Fill title and link", variant: "destructive" });
                    await supabase.from("bonus_kits" as any).insert({
                      title: newBonusTitle, description: newBonusDesc, link: newBonusLink,
                      target_tier: newBonusTier, created_by: user?.id,
                    } as any);
                    setNewBonusTitle(""); setNewBonusDesc(""); setNewBonusLink("");
                    const { data } = await supabase.from("bonus_kits" as any).select("*").order("created_at", { ascending: false });
                    if (data) setBonusKits(data as any);
                    toast({ title: "Bonus Kit Added ✅" });
                  }} className="bg-gradient-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {bonusKits.map((kit: any) => (
                  <div key={kit.id} className="glass rounded-xl p-4 flex items-center gap-4">
                    <Gift className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{kit.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{kit.link}</p>
                      {kit.description && <p className="text-xs text-muted-foreground">{kit.description}</p>}
                    </div>
                    <Badge variant="outline">{kit.target_tier}</Badge>
                    <Badge variant="outline" className={kit.is_active ? "text-primary" : "text-muted-foreground"}>
                      {kit.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      await supabase.from("bonus_kits" as any).delete().eq("id", kit.id);
                      setBonusKits(bonusKits.filter((b: any) => b.id !== kit.id));
                      toast({ title: "Deleted" });
                    }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                {bonusKits.length === 0 && (
                  <div className="glass rounded-xl p-8 text-center">
                    <Gift className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No bonus kits yet. Add promotional links above.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== SOCIAL LINKS ===== */}
          {section === "social-links" && (
            <div className="space-y-6">
              <h3 className="font-display font-bold">Social Media Links</h3>
              <p className="text-sm text-muted-foreground">Manage social media links shown in the footer and about page.</p>
              
              <div className="glass rounded-xl p-5 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Platform</Label>
                    <Select value={newSocialPlatform} onValueChange={setNewSocialPlatform}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="discord">Discord</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="URL (e.g. https://instagram.com/...)" value={newSocialUrl} onChange={e => setNewSocialUrl(e.target.value)} />
                  <Input placeholder="Custom Icon (emoji, optional)" value={newSocialIcon} onChange={e => setNewSocialIcon(e.target.value)} />
                </div>
                <Button onClick={async () => {
                  if (!newSocialUrl) return toast({ title: "Enter URL", variant: "destructive" });
                  await supabase.from("social_links" as any).insert({
                    platform: newSocialPlatform, url: newSocialUrl, icon: newSocialIcon || null,
                    created_by: user?.id,
                  } as any);
                  setNewSocialUrl(""); setNewSocialIcon("");
                  const { data } = await supabase.from("social_links" as any).select("*").order("display_order");
                  if (data) setSocialLinks(data as any);
                  toast({ title: "Social Link Added ✅" });
                }} className="bg-gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1" /> Add Social Link
                </Button>
              </div>

              <div className="space-y-3">
                {socialLinks.map((link: any) => (
                  <div key={link.id} className="glass rounded-xl p-4 flex items-center gap-4">
                    <span className="text-xl">{link.icon || "🔗"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm capitalize">{link.platform}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <Badge variant="outline" className={link.is_active ? "text-primary" : "text-muted-foreground"}>
                      {link.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      await supabase.from("social_links" as any).delete().eq("id", link.id);
                      setSocialLinks(socialLinks.filter((s: any) => s.id !== link.id));
                      toast({ title: "Deleted" });
                    }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                {socialLinks.length === 0 && (
                  <div className="glass rounded-xl p-8 text-center">
                    <Share2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No social links yet. Add your social media above.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== SQL SETUP ===== */}
          {section === "sql-setup" && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display font-bold text-lg">SQL Setup (secondary backend)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  These blocks create the tables for Workspace, Canvas and the Work tab inside the
                  secondary <code>hustl-production</code> backend. Open its SQL editor, paste and run.
                  Re-running is safe (uses <code>create if not exists</code>).
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: after you run a block, click <b>Mark as applied</b> — it will show a green
                  <Badge variant="secondary" className="mx-1 text-[10px]">Applied</Badge> tag so you instantly
                  know which blocks are new vs already run. State is saved per-browser.
                </p>
              </div>
              {/* Backend connections reference */}
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { label: "Workspace DB (Work Hub / Canvas)", ref: "utflzmecghdtcjupgdan", url: "https://utflzmecghdtcjupgdan.supabase.co", purpose: "Work hub, canvas, workspace clients, files" },
                  { label: "Community DB (hustl discord-workspace-production)", ref: "qeswhaytgvosfzzgraef", url: "https://qeswhaytgvosfzzgraef.supabase.co", purpose: "Forum posts/votes, memberships, Discord links, mod queue" },
                ].map(b => (
                  <div key={b.ref} className="glass rounded-xl p-4 space-y-1.5 border-primary/10">
                    <div className="font-semibold text-sm">{b.label}</div>
                    <div className="text-[11px] text-muted-foreground">{b.purpose}</div>
                    <div className="text-[11px] font-mono break-all">ref: <span className="text-foreground">{b.ref}</span></div>
                    <div className="text-[11px] font-mono break-all">url: <span className="text-foreground">{b.url}</span></div>
                    <Button size="sm" variant="outline" className="mt-1 h-7 text-[11px]"
                      onClick={() => { navigator.clipboard.writeText(b.ref); toast({ title: "Project ref copied" }); }}>
                      Copy ref
                    </Button>
                  </div>
                ))}
              </div>
              {SQL_BLOCKS.map(b => {
                const key = `sql-applied:${b.id}`;
                const applied = typeof window !== "undefined" && localStorage.getItem(key) === "1";
                return (
                  <div key={b.id} className={`glass rounded-xl p-5 space-y-3 ${applied ? "opacity-70" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{b.label}</span>
                          {applied
                            ? <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">✓ Applied</Badge>
                            : <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">New · run me</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{b.id}.sql · run once per backend</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(b.sql);
                            toast({ title: "SQL copied", description: "Paste it in your SQL editor and run." });
                          }}
                        >
                          Copy SQL
                        </Button>
                        <Button
                          size="sm"
                          variant={applied ? "ghost" : "default"}
                          onClick={() => {
                            if (applied) localStorage.removeItem(key);
                            else localStorage.setItem(key, "1");
                            // force a re-render
                            setSection("sql-setup");
                            setTimeout(() => setSection("sql-setup"), 0);
                            window.dispatchEvent(new Event("storage"));
                            // simplest: hard refresh of just this section via state nudge
                            (b as any)._t = Date.now();
                            toast({ title: applied ? "Marked as new" : "Marked as applied" });
                            // trigger React update
                            setTimeout(() => window.location.reload(), 250);
                          }}
                        >
                          {applied ? "Mark as new" : "Mark as applied"}
                        </Button>
                      </div>
                    </div>
                    {!applied && (
                      <pre className="text-[10px] bg-muted/40 p-3 rounded overflow-auto max-h-72 leading-relaxed">{b.sql}</pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== FEATURE FLAGS ===== */}
          {section === "feature-flags" && (
            <FeatureFlagsManager />
          )}
          {section === "system-health" && <SystemHealth />}
          {(section as AdminSectionExt) === "seo-pages" && <SeoLandingManager />}
          {(section as AdminSectionExt) === "seo-blog" && <SeoBlogManager />}
          {(section as AdminSectionExt) === "usage-analytics" && <UsageAnalyticsManager />}
        </div>
      </main>
    </div>
  );
}