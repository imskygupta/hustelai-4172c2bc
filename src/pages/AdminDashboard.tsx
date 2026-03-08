import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Shield, Users, Bell, MessageSquare, Crown, Rocket, Sparkles, Star,
  Send, Trash2, Link2, Video, LogOut, RefreshCw, Eye
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

const tierIcons: Record<string, any> = {
  free: Sparkles, pro: Rocket, elite: Crown, infinity: Star,
};

const tierColors: Record<string, string> = {
  free: "bg-secondary text-secondary-foreground",
  pro: "bg-primary/20 text-primary",
  elite: "bg-accent/20 text-accent",
  infinity: "bg-gradient-primary text-primary-foreground",
};

export default function AdminDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Notification form
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [notifLink, setNotifLink] = useState("");
  const [notifTier, setNotifTier] = useState("all");

  // Impersonation
  const [impersonateEmail, setImpersonateEmail] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/imskygupta-admin");
  }, [loading, user]);

  useEffect(() => {
    if (user) checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .eq("role", "admin")
      .maybeSingle();

    if (data) {
      setIsAdmin(true);
      loadData();
    } else {
      toast({ title: "Access Denied", description: "You are not an admin.", variant: "destructive" });
      navigate("/dashboard");
    }
  };

  const loadData = async () => {
    setLoadingData(true);
    const [usersRes, notifsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    ]);
    if (usersRes.data) setUsers(usersRes.data as UserProfile[]);
    if (notifsRes.data) setNotifications(notifsRes.data as Notification[]);
    setLoadingData(false);
  };

  const changeTier = async (userId: string, newTier: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ subscription_tier: newTier as any })
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `User tier changed to ${newTier}` });
      setUsers(users.map(u => u.user_id === userId ? { ...u, subscription_tier: newTier } : u));
    }
  };

  const sendNotification = async () => {
    if (!notifTitle || !notifMessage) return;
    const { error } = await supabase.from("notifications").insert({
      title: notifTitle,
      message: notifMessage,
      type: notifType,
      link: notifLink || null,
      target_tier: notifTier,
      created_by: user!.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sent!", description: "Notification sent to users." });
      setNotifTitle(""); setNotifMessage(""); setNotifLink("");
      loadData();
    }
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(notifications.filter(n => n.id !== id));
    toast({ title: "Deleted" });
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-display text-xl">Loading Admin...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-destructive/30">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            <span className="font-display font-bold text-lg">Admin Panel</span>
            <Badge className="bg-destructive/20 text-destructive text-[10px]">ADMIN</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>User View</Button>
            <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
              { label: "Pro Users", value: users.filter(u => u.subscription_tier === "pro").length, icon: Rocket, color: "text-primary" },
              { label: "Elite Users", value: users.filter(u => u.subscription_tier === "elite").length, icon: Crown, color: "text-accent" },
              { label: "Infinity Users", value: users.filter(u => u.subscription_tier === "infinity").length, icon: Star, color: "text-yellow-500" },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5">
                <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
                <p className="text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="glass">
              <TabsTrigger value="users"><Users className="w-4 h-4 mr-1" /> Users</TabsTrigger>
              <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-1" /> Notifications</TabsTrigger>
              <TabsTrigger value="links"><Link2 className="w-4 h-4 mr-1" /> Links & Webinars</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold">User Management</h2>
                <Button variant="outline" size="sm" onClick={loadData}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
              </div>
              <div className="glass rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Searches</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const TierIcon = tierIcons[u.subscription_tier] || Sparkles;
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.display_name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                          <TableCell>
                            <Badge className={tierColors[u.subscription_tier] || ""}>
                              <TierIcon className="w-3 h-3 mr-1" />
                              {u.subscription_tier}
                            </Badge>
                          </TableCell>
                          <TableCell>{u.search_count}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Select value={u.subscription_tier} onValueChange={(val) => changeTier(u.user_id, val)}>
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="elite">Elite</SelectItem>
                                <SelectItem value="infinity">Infinity</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" /> Send Notification
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Title" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} />
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
                <Textarea placeholder="Message..." value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} />
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Link (optional)" value={notifLink} onChange={(e) => setNotifLink(e.target.value)} />
                  <Select value={notifTier} onValueChange={setNotifTier}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="pro">Pro Only</SelectItem>
                      <SelectItem value="elite">Elite Only</SelectItem>
                      <SelectItem value="infinity">Infinity Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={sendNotification} className="bg-gradient-primary text-primary-foreground">
                  <Send className="w-4 h-4 mr-1" /> Send to Users
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-display font-bold">Sent Notifications</h3>
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
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteNotification(n.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="space-y-4">
              <div className="glass rounded-xl p-6 space-y-4">
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" /> Quick Send Webinar/Meet Link
                </h3>
                <p className="text-sm text-muted-foreground">
                  Use the notifications tab to send webinar links and meet links to users. Select type as "Webinar" or "Meet Link" and paste the URL.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="glass rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-sm">📹 Google Meet</h4>
                    <p className="text-xs text-muted-foreground">Send meet links for 1-on-1 sessions</p>
                    <Button size="sm" variant="outline" onClick={() => {
                      setNotifType("meet");
                      setNotifTitle("Live Meet Session");
                      const el = document.querySelector('[value="notifications"]');
                      if (el) (el as HTMLElement).click();
                    }}>Create Meet Notification</Button>
                  </div>
                  <div className="glass rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-sm">🎥 Webinar</h4>
                    <p className="text-xs text-muted-foreground">Broadcast webinar links to tier users</p>
                    <Button size="sm" variant="outline" onClick={() => {
                      setNotifType("webinar");
                      setNotifTitle("Live Webinar");
                      const el = document.querySelector('[value="notifications"]');
                      if (el) (el as HTMLElement).click();
                    }}>Create Webinar Notification</Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
