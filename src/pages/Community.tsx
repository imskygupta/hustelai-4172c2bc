import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { communityDb } from "@/integrations/community/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CommunityOnboarding } from "@/components/CommunityOnboarding";
import {
  MessageSquare, Send, ArrowLeft, ThumbsUp, ThumbsDown,
  Plus, Filter, Clock, Flame, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, User, Lock, Hash, Volume2, VolumeX,
  Users, Crown, Shield, BookOpen, Bell, X, Link2, CheckCircle2,
  Flag, Pin, EyeOff, MoreHorizontal
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface CommunityGroup {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  min_tier: string;
  is_default: boolean;
  is_readonly: boolean;
}

interface ForumPost {
  id: string;
  title: string | null;
  content: string;
  user_name: string | null;
  user_id: string;
  category: string | null;
  is_approved: boolean;
  parent_id: string | null;
  upvotes: number;
  downvotes: number;
  post_type: string | null;
  created_at: string;
  group_id: string;
  is_pinned?: boolean;
  is_locked?: boolean;
  is_hidden?: boolean;
}

interface ForumVote {
  post_id: string;
  vote_type: string;
}

type SortType = "hot" | "new" | "top";

const BOT_REPLIES = [
  "that's a solid point tbh 👍",
  "agree, been thinking the same",
  "nice question! curious about this too",
  "yeah I tried this, works well",
  "interesting take, thanks for sharing",
  "💯 underrated hustle for sure",
  "this helped me when I started out",
  "good luck with this! keep us posted",
  "seconding this, great advice",
  "been doing this for 3 months, can confirm it works",
];

const TIER_CHANNEL_LIMITS: Record<string, number> = {
  free: 0,
  pro: 1,
  elite: 2,
  infinity: 5,
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  elite: "Elite",
  infinity: "Infinity",
};

const WELCOME_CHANNEL_ID = "c4541d1b-8b58-46b1-90b5-58c6e36251ef";

export default function Community() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CommunityGroup | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [replies, setReplies] = useState<Record<string, ForumPost[]>>({});
  const [userVotes, setUserVotes] = useState<ForumVote[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [showReplyFor, setShowReplyFor] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortType>("hot");
  const [showNewPost, setShowNewPost] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [botTimers, setBotTimers] = useState<Record<string, number>>({});
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [userMemberships, setUserMemberships] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [welcomeNotifCount, setWelcomeNotifCount] = useState(0);
  const [dismissedNotifs, setDismissedNotifs] = useState<Set<string>>(new Set());
  const [discordLink, setDiscordLink] = useState<{ discord_username: string | null } | null>(null);

  const tier = profile?.subscription_tier || "free";
  const maxChannels = TIER_CHANNEL_LIMITS[tier] || 0;
  const canRequestCategories = tier === "elite" || tier === "infinity";

  useEffect(() => {
    if (user) {
      checkOnboarding();
      loadMemberships();
      loadUserVotes();
      checkAdminRole();
      loadDismissedNotifs();
      loadDiscordLink();
    } else {
      setHasOnboarded(false);
    }
    loadGroups();
    return () => {
      Object.values(botTimers).forEach(t => clearTimeout(t));
    };
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any });
    setIsAdmin(!!data);
  };

  const loadDismissedNotifs = () => {
    const stored = JSON.parse(localStorage.getItem("dismissed_welcome_notifs") || "[]");
    setDismissedNotifs(new Set(stored));
  };

  const loadDiscordLink = async () => {
    if (!user) return;
    const { data } = await communityDb
      .from("discord_links")
      .select("discord_username")
      .eq("user_id", user.id)
      .maybeSingle();
    setDiscordLink(data as any);
  };

  // Handle Discord OAuth return (?discord=connected|denied|error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("discord");
    if (!status) return;
    if (status === "connected") {
      toast({ title: "Discord connected 🎉", description: "Your account is now linked." });
      if (user) loadDiscordLink();
    } else if (status === "denied") {
      toast({ title: "Discord auth cancelled", variant: "destructive" });
    } else {
      const reason = params.get("reason") || "unknown";
      toast({ title: "Discord connect failed", description: reason, variant: "destructive" });
    }
    // Clean URL
    window.history.replaceState({}, "", window.location.pathname);
  }, [user]);

  const startDiscordOAuth = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("discord-oauth/initiate", { method: "GET" });
      if (error || !data?.url) {
        toast({ title: "Couldn't start Discord login", description: error?.message || "Try again", variant: "destructive" });
        return;
      }
      window.location.href = data.url;
    } catch (e: any) {
      toast({ title: "Network error", description: e?.message, variant: "destructive" });
    }
  };

  const disconnectDiscord = async () => {
    if (!user) return;
    await communityDb.from("discord_links").delete().eq("user_id", user.id);
    setDiscordLink(null);
    toast({ title: "Discord disconnected" });
  };

  // ---------- Moderation ----------
  const reportPost = async (postId: string) => {
    if (!user) return;
    const reason = window.prompt("Why are you reporting this post?\n(spam, abuse, off-topic, etc.)");
    if (!reason) return;
    const { error } = await communityDb.from("forum_reports").insert({
      post_id: postId, reporter_id: user.id, reason: reason.slice(0, 200),
    });
    if (error) toast({ title: "Couldn't submit report", description: error.message, variant: "destructive" });
    else toast({ title: "Reported", description: "Mods will review it shortly." });
  };

  const modAction = async (postId: string, patch: Partial<ForumPost>) => {
    if (!isAdmin || !user) return;
    const { error } = await communityDb.from("forum_posts").update({
      ...patch, moderated_by: user.id, moderated_at: new Date().toISOString(),
    } as any).eq("id", postId);
    if (error) { toast({ title: "Mod action failed", description: error.message, variant: "destructive" }); return; }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...patch } as ForumPost : p));
    toast({ title: "Updated" });
  };

  const dismissWelcomeNotif = (postId: string) => {
    const newDismissed = new Set(dismissedNotifs).add(postId);
    setDismissedNotifs(newDismissed);
    localStorage.setItem("dismissed_welcome_notifs", JSON.stringify([...newDismissed]));
    setWelcomeNotifCount(prev => Math.max(0, prev - 1));
  };

  const checkOnboarding = async () => {
    if (!user) return;
    const { data } = await communityDb
      .from("community_onboarding")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    setHasOnboarded(!!data);
  };

  const loadMemberships = async () => {
    if (!user) return;
    const { data } = await communityDb
      .from("community_memberships")
      .select("channel_id")
      .eq("user_id", user.id);
    if (data) setUserMemberships(data.map(m => m.channel_id));
  };

  const loadGroups = async () => {
    const { data } = await communityDb
      .from("community_groups")
      .select("*")
      .order("created_at");
    if (data) {
      setGroups(data as CommunityGroup[]);
      // Count unread welcome notifications
      loadWelcomeNotifCount();
    }
  };

  const loadWelcomeNotifCount = async () => {
    const { count } = await communityDb
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .eq("group_id", WELCOME_CHANNEL_ID)
      .is("parent_id", null);
    const stored = JSON.parse(localStorage.getItem("dismissed_welcome_notifs") || "[]");
    const dismissedCount = stored.length;
    setWelcomeNotifCount(Math.max(0, (count || 0) - dismissedCount));
  };

  const loadUserVotes = async () => {
    if (!user) return;
    const { data } = await communityDb.from("forum_votes").select("post_id, vote_type").eq("user_id", user.id);
    if (data) setUserVotes(data);
  };

  const loadPosts = async (groupId: string, groupName: string) => {
    const { data } = await communityDb
      .from("forum_posts")
      .select("*")
      .eq("group_id", groupId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });
    if (data) setPosts(data as ForumPost[]);
  };

  const loadReplies = async (postId: string) => {
    const { data } = await communityDb
      .from("forum_posts")
      .select("*")
      .eq("parent_id", postId)
      .order("upvotes", { ascending: false });
    if (data) setReplies(prev => ({ ...prev, [postId]: data as ForumPost[] }));
  };

  const handleOnboardingComplete = async (data: any) => {
    if (!user) return;

    await communityDb.from("community_onboarding").insert({
      user_id: user.id,
      interests: data.interests,
      experience_level: data.experienceLevel,
      goals: data.goals,
      preferred_categories: data.preferredCategories,
      custom_category_requests: data.customCategories,
    });

    const defaultGroups = groups.filter(g => g.is_default);
    for (const g of defaultGroups) {
      await communityDb.from("community_memberships").insert({
        user_id: user.id,
        channel_id: g.id,
      }).select();
    }

    for (const catName of data.preferredCategories) {
      const group = groups.find(g => g.name === catName);
      if (group) {
        await communityDb.from("community_memberships").insert({
          user_id: user.id,
          channel_id: group.id,
        }).select();
      }
    }

    for (const cat of data.customCategories) {
      await communityDb.from("category_requests").insert({
        user_id: user.id,
        category_name: cat,
      });
    }

    setHasOnboarded(true);
    loadMemberships();
    toast({ title: "Welcome to the community! 🎉", description: "You've been added to your channels." });
  };

  const openGroup = (group: CommunityGroup) => {
    if (!user) {
      navigate("/signup");
      return;
    }

    if (!group.is_default && !userMemberships.includes(group.id) && !isAdmin) {
      toast({
        title: "🔒 Not a member",
        description: "You haven't joined this channel. Complete onboarding or upgrade your plan.",
        variant: "destructive",
      });
      return;
    }

    setSelectedGroup(group);
    loadPosts(group.id, group.name);
  };

  const toggleExpand = (postId: string) => {
    const newSet = new Set(expandedPosts);
    if (newSet.has(postId)) {
      newSet.delete(postId);
    } else {
      newSet.add(postId);
      if (!replies[postId]) loadReplies(postId);
    }
    setExpandedPosts(newSet);
  };

  const scheduleBotReply = (postId: string) => {
    const timer = window.setTimeout(async () => {
      const { data: existingReplies } = await communityDb
        .from("forum_posts")
        .select("id")
        .eq("parent_id", postId)
        .limit(1);

      if (!existingReplies || existingReplies.length === 0) {
        if (!selectedGroup) return;
        const botReply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
        await communityDb.from("forum_posts").insert({
          group_id: selectedGroup.id,
          user_id: user?.id || "",
          user_name: "mod_amit",
          content: botReply,
          category: selectedGroup.name,
          parent_id: postId,
          post_type: "answer",
          is_approved: true,
        });
        loadReplies(postId);
      }
    }, 120000);
    setBotTimers(prev => ({ ...prev, [postId]: timer }));
  };

  // Admin can post in readonly channels
  const canPostInChannel = (group: CommunityGroup) => {
    if (isAdmin) return true;
    return !group.is_readonly;
  };

  const submitPost = async () => {
    if (!newContent.trim() || !selectedGroup || !user) return;

    const isVerified = profile?.is_verified === true;
    const { data: newPost, error } = await communityDb.from("forum_posts").insert({
      group_id: selectedGroup.id,
      user_id: user.id,
      user_name: isAdmin ? "HustleAI Team" : (profile?.display_name || "Anonymous"),
      content: newContent,
      title: newTitle || null,
      category: selectedGroup.name,
      post_type: isAdmin && selectedGroup.is_readonly ? "announcement" : "question",
      is_approved: isVerified || isAdmin,
    }).select().single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Posted!", description: isVerified || isAdmin ? "Your post is live!" : "Pending admin approval." });
      setNewTitle("");
      setNewContent("");
      setShowNewPost(false);
      loadPosts(selectedGroup.id, selectedGroup.name);
      if (newPost && !isAdmin) scheduleBotReply(newPost.id);
    }
  };

  const submitReply = async (parentId: string) => {
    if (!replyContent[parentId]?.trim() || !user || !selectedGroup) return;
    const isVerified = profile?.is_verified === true;
    const { error } = await communityDb.from("forum_posts").insert({
      group_id: selectedGroup.id,
      user_id: user.id,
      user_name: isAdmin ? "HustleAI Team" : (profile?.display_name || "Anonymous"),
      content: replyContent[parentId],
      category: selectedGroup.name,
      parent_id: parentId,
      post_type: "answer",
      is_approved: isVerified || isAdmin,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reply submitted!" });
      setReplyContent(prev => ({ ...prev, [parentId]: "" }));
      setShowReplyFor(null);
      loadReplies(parentId);
      if (botTimers[parentId]) {
        clearTimeout(botTimers[parentId]);
        setBotTimers(prev => { const n = { ...prev }; delete n[parentId]; return n; });
      }
    }
  };

  const vote = async (postId: string, type: "up" | "down") => {
    if (!user) { navigate("/signup"); return; }
    const existing = userVotes.find(v => v.post_id === postId);
    if (existing) {
      if (existing.vote_type === type) return;
      await communityDb.from("forum_votes").update({ vote_type: type }).eq("post_id", postId).eq("user_id", user.id);
    } else {
      await communityDb.from("forum_votes").insert({ post_id: postId, user_id: user.id, vote_type: type });
    }
    const post = [...posts, ...Object.values(replies).flat()].find(p => p.id === postId);
    if (post) {
      const newUp = type === "up" ? post.upvotes + 1 : (existing?.vote_type === "up" ? post.upvotes - 1 : post.upvotes);
      const newDown = type === "down" ? post.downvotes + 1 : (existing?.vote_type === "down" ? post.downvotes - 1 : post.downvotes);
      await communityDb.from("forum_posts").update({ upvotes: newUp, downvotes: newDown }).eq("id", postId);
    }
    loadUserVotes();
    if (selectedGroup) loadPosts(selectedGroup.id, selectedGroup.name);
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === "new") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "top") return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
    const scoreA = (a.upvotes - a.downvotes) + (new Date(a.created_at).getTime() / 1e10);
    const scoreB = (b.upvotes - b.downvotes) + (new Date(b.created_at).getTime() / 1e10);
    return scoreB - scoreA;
  });

  const getUsernameDisplay = (post: ForumPost) => {
    const shortId = post.user_id.slice(0, 6);
    const name = post.user_name || "Anonymous";
    const isBot = name === "mod_amit";
    const isTeam = name === "HustleAI Team";
    return (
      <span className={isBot ? "text-accent font-semibold" : isTeam ? "text-primary font-semibold" : ""}>
        {name}
        {isBot && <Badge variant="outline" className="text-[8px] text-accent border-accent/30 ml-1">MOD</Badge>}
        {isTeam && <Badge variant="outline" className="text-[8px] text-primary border-primary/30 ml-1">TEAM</Badge>}
        <span className="text-muted-foreground font-normal"> • u/{shortId}</span>
      </span>
    );
  };

  const defaultGroups = groups.filter(g => g.is_default);
  const optionalGroups = groups.filter(g => !g.is_default);
  const joinedOptional = optionalGroups.filter(g => userMemberships.includes(g.id));

  if (loading || hasOnboarded === null) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-primary font-display text-xl">Loading...</div>
    </div>;
  }

  if (user && !hasOnboarded) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-8">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-display font-bold mb-2">
                  <span className="text-gradient">Welcome to the Community</span> 🎉
                </h1>
                <p className="text-muted-foreground">Let's get you set up — answer a few quick questions</p>
              </motion.div>
            </div>
            <CommunityOnboarding
              availableCategories={optionalGroups.map(g => ({ id: g.id, name: g.name, icon: g.icon }))}
              maxChannels={maxChannels}
              tierName={TIER_LABELS[tier]}
              canRequestCategories={canRequestCategories}
              onComplete={handleOnboardingComplete}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          {!selectedGroup ? (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-display font-bold">
                  <span className="text-gradient">Community</span> Hub
                </h1>
                <p className="text-muted-foreground">Your channels, conversations, and connections</p>
              </div>

              {/* Discord Connect card */}
              {user && (
                <div className="glass rounded-xl p-5 flex items-center gap-4 border-primary/20">
                  <div className="w-11 h-11 rounded-xl bg-[#5865F2]/15 flex items-center justify-center text-[#5865F2]">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-sm flex items-center gap-2">
                      Discord
                      {discordLink && (
                        <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {discordLink
                        ? `Linked as @${discordLink.discord_username || "discord-user"} — roles auto-sync with your tier.`
                        : "Link your Discord to unlock premium channels and auto role sync."}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={discordLink ? "outline" : "default"}
                    className={discordLink ? "" : "bg-[#5865F2] hover:bg-[#5865F2]/90 text-white"}
                    onClick={discordLink ? disconnectDiscord : startDiscordOAuth}
                  >
                    {discordLink ? "Disconnect" : "Connect Discord"}
                  </Button>
                </div>
              )}

              {/* Default Channels */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Default Channels
                </h2>
                <div className="grid md:grid-cols-3 gap-3">
                  {defaultGroups.map((group, i) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => openGroup(group)}
                      className="glass rounded-xl p-5 cursor-pointer transition-all duration-300 group hover:border-primary/30 hover:shadow-glow active:scale-[0.98] relative"
                    >
                      {/* Notification count badge for Welcome channel */}
                      {group.id === WELCOME_CHANNEL_ID && welcomeNotifCount > 0 && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                          {welcomeNotifCount}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl group-hover:scale-110 transition-transform">{group.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-bold text-sm group-hover:text-gradient transition-all truncate">
                            {group.name}
                          </h3>
                          {group.is_readonly && !isAdmin && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <VolumeX className="w-3 h-3" /> Read-only
                            </div>
                          )}
                          {group.is_readonly && isAdmin && (
                            <div className="flex items-center gap-1 text-[10px] text-primary">
                              <Shield className="w-3 h-3" /> Admin can post
                            </div>
                          )}
                        </div>
                      </div>
                      {group.description && <p className="text-xs text-muted-foreground line-clamp-2">{group.description}</p>}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Joined Channels */}
              {joinedOptional.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Hash className="w-4 h-4" /> Your Channels
                    <Badge variant="secondary" className="text-[10px]">{joinedOptional.length}/{maxChannels}</Badge>
                  </h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {joinedOptional.map((group, i) => (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => openGroup(group)}
                        className="glass rounded-xl p-5 cursor-pointer transition-all duration-300 group hover:border-primary/30 hover:shadow-glow active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl group-hover:scale-110 transition-transform">{group.icon}</span>
                          <div>
                            <h3 className="font-display font-bold text-sm group-hover:text-gradient transition-all">{group.name}</h3>
                            {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locked Channels */}
              {optionalGroups.filter(g => !userMemberships.includes(g.id)).length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Explore More Channels
                  </h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {optionalGroups.filter(g => !userMemberships.includes(g.id)).map((group, i) => (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={isAdmin ? () => openGroup(group) : undefined}
                        className={`glass rounded-xl p-5 relative ${isAdmin ? "cursor-pointer hover:border-primary/30" : "opacity-50"}`}
                      >
                        {!isAdmin && (
                          <div className="absolute top-3 right-3">
                            <Lock className="w-4 h-4 text-accent" />
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{group.icon}</span>
                          <div>
                            <h3 className="font-display font-bold text-sm">{group.name}</h3>
                            {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                            {!isAdmin && (
                              <p className="text-[10px] text-accent mt-1">
                                {tier === "free" ? "Upgrade to Pro+ to join" : "Channel limit reached"}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {tier === "free" && !isAdmin && (
                    <div className="text-center">
                      <Button onClick={() => navigate("/payment")} variant="outline" size="sm" className="text-primary border-primary/30">
                        <Crown className="w-4 h-4 mr-1" /> Upgrade to unlock channels
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {!user && (
                <div className="text-center glass rounded-xl p-8 space-y-3">
                  <Users className="w-10 h-10 text-primary mx-auto" />
                  <p className="text-muted-foreground">Sign up to join the community and access all channels</p>
                  <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/signup")}>
                    Join the Community
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => { setSelectedGroup(null); setPosts([]); setShowNewPost(false); }}
                className="hover:text-primary transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Channels
              </Button>

              <div className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedGroup.icon}</span>
                    <div>
                      <h2 className="font-display font-bold text-xl flex items-center gap-2">
                        {selectedGroup.name}
                        {selectedGroup.is_readonly && !isAdmin && (
                          <Badge variant="outline" className="text-[10px]"><VolumeX className="w-3 h-3 mr-1" /> Read-only</Badge>
                        )}
                        {selectedGroup.is_readonly && isAdmin && (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30"><Shield className="w-3 h-3 mr-1" /> Admin Access</Badge>
                        )}
                      </h2>
                      {selectedGroup.description && (
                        <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>
                      )}
                    </div>
                  </div>
                  {user && canPostInChannel(selectedGroup) && (
                    <Button onClick={() => setShowNewPost(!showNewPost)}
                      className="bg-gradient-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-transform">
                      <Plus className="w-4 h-4 mr-1" /> {isAdmin ? "Post Announcement" : "Ask Question"}
                    </Button>
                  )}
                </div>

                {/* New post form */}
                <AnimatePresence>
                  {showNewPost && canPostInChannel(selectedGroup) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 mb-6 p-4 rounded-xl bg-secondary/30 border border-border/50"
                    >
                      <Input
                        placeholder={isAdmin ? "Announcement title..." : "Question title..."}
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        className="focus:shadow-glow focus:border-primary transition-all font-semibold"
                      />
                      <Textarea
                        placeholder={isAdmin ? "Write your announcement..." : "Describe your question in detail..."}
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        rows={4}
                        className="focus:shadow-glow focus:border-primary transition-all"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {isAdmin ? (
                            <><Shield className="w-3 h-3 text-primary" /> Admin — auto-approved</>
                          ) : (
                            <><AlertCircle className="w-3 h-3" /> {profile?.is_verified ? "✅ Verified — auto-approved" : "Posts require admin approval"}</>
                          )}
                        </p>
                        <Button onClick={submitPost} size="sm"
                          className="bg-gradient-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-transform">
                          <Send className="w-4 h-4 mr-1" /> {isAdmin ? "Post" : "Post"}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sort bar */}
                {!selectedGroup.is_readonly && (
                  <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-3">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    {(["hot", "new", "top"] as SortType[]).map(s => (
                      <Button
                        key={s}
                        variant={sortBy === s ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSortBy(s)}
                        className={`text-xs capitalize transition-all ${
                          sortBy === s ? "bg-primary/20 text-primary" : "hover:text-primary"
                        }`}
                      >
                        {s === "hot" && <Flame className="w-3 h-3 mr-1" />}
                        {s === "new" && <Clock className="w-3 h-3 mr-1" />}
                        {s === "top" && <ThumbsUp className="w-3 h-3 mr-1" />}
                        {s}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Welcome channel - dismissable notifications */}
                {selectedGroup.id === WELCOME_CHANNEL_ID && (
                  <div className="space-y-3">
                    {sortedPosts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        No announcements yet. Stay tuned! 📢
                      </p>
                    )}
                    {sortedPosts.map((post, idx) => {
                      const isDismissed = dismissedNotifs.has(post.id);
                      if (isDismissed) return null;
                      return (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="rounded-xl border border-primary/30 bg-primary/5 p-4 relative"
                        >
                          <button
                            onClick={() => dismissWelcomeNotif(post.id)}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                            <Bell className="w-3 h-3 text-primary" />
                            <span className="text-primary font-semibold">#{idx + 1}</span>
                            <span>•</span>
                            {getUsernameDisplay(post)}
                            <span>•</span>
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                          </div>
                          {post.title && (
                            <h3 className="font-display font-semibold text-sm mb-1">{post.title}</h3>
                          )}
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{post.content}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Regular posts for non-welcome channels */}
                {selectedGroup.id !== WELCOME_CHANNEL_ID && (
                  <div className="space-y-3">
                    {sortedPosts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        {selectedGroup.is_readonly ? "Official announcements will appear here." : "No posts yet. Be the first to ask a question!"}
                      </p>
                    )}
                    {sortedPosts.map(post => {
                      const userVote = userVotes.find(v => v.post_id === post.id);
                      const score = post.upvotes - post.downvotes;
                      const isExpanded = expandedPosts.has(post.id);
                      const isAnnouncement = post.post_type === "announcement";

                      return (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`rounded-xl border transition-all duration-300 group ${
                            isAnnouncement
                              ? "border-primary/30 bg-primary/5"
                              : "border-border/50 bg-secondary/20 hover:border-primary/20"
                          }`}
                        >
                          <div className="flex">
                            {!selectedGroup.is_readonly && (
                              <div className="flex flex-col items-center py-4 px-3 gap-1">
                                <button onClick={() => vote(post.id, "up")}
                                  className={`p-1 rounded transition-all hover:scale-110 ${
                                    userVote?.vote_type === "up" ? "text-primary" : "text-muted-foreground hover:text-primary"
                                  }`}>
                                  <ChevronUp className="w-5 h-5" />
                                </button>
                                <span className={`text-sm font-bold ${score > 0 ? "text-primary" : score < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                  {score}
                                </span>
                                <button onClick={() => vote(post.id, "down")}
                                  className={`p-1 rounded transition-all hover:scale-110 ${
                                    userVote?.vote_type === "down" ? "text-destructive" : "text-muted-foreground hover:text-destructive"
                                  }`}>
                                  <ChevronDown className="w-5 h-5" />
                                </button>
                              </div>
                            )}

                            <div className="flex-1 py-4 pr-4 space-y-2">
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <User className="w-3 h-3" />
                                {getUsernameDisplay(post)}
                                <span>•</span>
                                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                {isAnnouncement && (
                                  <Badge className="text-[9px] bg-primary/20 text-primary border-0">📌 Pinned</Badge>
                                )}
                                {!post.is_approved && post.user_id === user?.id && (
                                  <Badge variant="outline" className="text-[9px] text-yellow-500 border-yellow-500/30">
                                    <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> Pending
                                  </Badge>
                                )}
                              </div>

                              {post.title && (
                                <h3 className="font-display font-semibold text-sm group-hover:text-primary transition-colors">
                                  {post.title}
                                </h3>
                              )}
                              <p className="text-sm text-muted-foreground whitespace-pre-line">{post.content}</p>

                              {(!selectedGroup.is_readonly || isAdmin) && (
                                <div className="flex items-center gap-3 pt-1">
                                  <button
                                    onClick={() => toggleExpand(post.id)}
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {replies[post.id]?.length || 0} answers
                                  </button>
                                  {user && canPostInChannel(selectedGroup) && (
                                    <button
                                      onClick={() => setShowReplyFor(showReplyFor === post.id ? null : post.id)}
                                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                    >
                                      Reply
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Reply input */}
                              <AnimatePresence>
                                {showReplyFor === post.id && canPostInChannel(selectedGroup) && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex gap-2 pt-2"
                                  >
                                    <Input
                                      placeholder="Write your answer..."
                                      value={replyContent[post.id] || ""}
                                      onChange={e => setReplyContent(prev => ({ ...prev, [post.id]: e.target.value }))}
                                      onKeyDown={e => e.key === "Enter" && submitReply(post.id)}
                                      className="text-sm focus:shadow-glow focus:border-primary transition-all"
                                    />
                                    <Button size="sm" onClick={() => submitReply(post.id)}
                                      className="bg-gradient-primary text-primary-foreground shrink-0">
                                      <Send className="w-4 h-4" />
                                    </Button>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Replies thread */}
                              <AnimatePresence>
                                {isExpanded && replies[post.id] && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 pl-4 border-l-2 border-primary/20 mt-2"
                                  >
                                    {replies[post.id].length === 0 && (
                                      <p className="text-xs text-muted-foreground py-2">No answers yet</p>
                                    )}
                                    {replies[post.id].map(reply => {
                                      const replyVote = userVotes.find(v => v.post_id === reply.id);
                                      const replyScore = reply.upvotes - reply.downvotes;
                                      const isBot = reply.user_name === "mod_amit";
                                      return (
                                        <div key={reply.id} className={`flex gap-2 py-2 ${isBot ? "bg-accent/5 rounded-lg px-2" : ""}`}>
                                          <div className="flex flex-col items-center gap-0.5">
                                            <button onClick={() => vote(reply.id, "up")}
                                              className={`text-xs transition-all hover:scale-110 ${replyVote?.vote_type === "up" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                                              <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <span className={`text-[10px] font-bold ${replyScore > 0 ? "text-primary" : "text-muted-foreground"}`}>{replyScore}</span>
                                            <button onClick={() => vote(reply.id, "down")}
                                              className={`text-xs transition-all hover:scale-110 ${replyVote?.vote_type === "down" ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
                                              <ChevronDown className="w-4 h-4" />
                                            </button>
                                          </div>
                                          <div className="flex-1">
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                              <User className="w-2.5 h-2.5" /> {getUsernameDisplay(reply)}
                                              <span>•</span>
                                              <span>{new Date(reply.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm mt-0.5">{reply.content}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
