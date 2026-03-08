import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, ArrowLeft, ThumbsUp, ThumbsDown,
  Plus, Filter, Clock, Flame, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, User, Lock
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface ForumCategory {
  id: string;
  name: string;
  icon: string;
  description: string | null;
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
}

interface ForumVote {
  post_id: string;
  vote_type: string;
}

type SortType = "hot" | "new" | "top";

// mod_amit bot replies
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

export default function Community() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | null>(null);
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
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [botTimers, setBotTimers] = useState<Record<string, number>>({});

  const isFreeUser = !profile || profile.subscription_tier === "free";
  const isGeneralCategory = (name: string) => name.toLowerCase().includes("general");

  useEffect(() => {
    loadCategories();
    if (user) loadUserVotes();
    return () => {
      // Clear bot timers on unmount
      Object.values(botTimers).forEach(t => clearTimeout(t));
    };
  }, [user]);

  const loadCategories = async () => {
    const { data } = await supabase.from("forum_categories").select("*").order("created_at");
    if (data) setCategories(data as ForumCategory[]);
  };

  const loadUserVotes = async () => {
    if (!user) return;
    const { data } = await supabase.from("forum_votes").select("post_id, vote_type").eq("user_id", user.id);
    if (data) setUserVotes(data);
  };

  const loadPosts = async (categoryName: string) => {
    const { data } = await supabase
      .from("forum_posts")
      .select("*")
      .eq("category", categoryName)
      .is("parent_id", null)
      .order("created_at", { ascending: false });
    if (data) setPosts(data as ForumPost[]);
  };

  const loadReplies = async (postId: string) => {
    const { data } = await supabase
      .from("forum_posts")
      .select("*")
      .eq("parent_id", postId)
      .order("upvotes", { ascending: false });
    if (data) setReplies(prev => ({ ...prev, [postId]: data as ForumPost[] }));
  };

  const openCategory = (cat: ForumCategory) => {
    if (isFreeUser && !isGeneralCategory(cat.name)) {
      toast({
        title: "🔒 Premium Only",
        description: "This community group is available for Pro, Elite, and Infinity members.",
        variant: "destructive",
      });
      return;
    }
    setSelectedCategory(cat);
    loadPosts(cat.name);
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

  // Schedule mod_amit bot reply after 2 minutes if no one replies
  const scheduleBotReply = (postId: string) => {
    const timer = window.setTimeout(async () => {
      // Check if there are any replies yet
      const { data: existingReplies } = await supabase
        .from("forum_posts")
        .select("id")
        .eq("parent_id", postId)
        .limit(1);
      
      if (!existingReplies || existingReplies.length === 0) {
        // Bot replies
        const { data: groups } = await supabase.from("community_groups").select("id").limit(1);
        const groupId = groups?.[0]?.id;
        if (!groupId || !selectedCategory) return;

        const botReply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
        
        await supabase.from("forum_posts").insert({
          group_id: groupId,
          user_id: user?.id || "00000000-0000-0000-0000-000000000000",
          user_name: "mod_amit",
          content: botReply,
          category: selectedCategory.name,
          parent_id: postId,
          post_type: "answer",
          is_approved: true,
        });

        // Reload replies for that post
        loadReplies(postId);
      }
    }, 120000); // 2 minutes

    setBotTimers(prev => ({ ...prev, [postId]: timer }));
  };

  const submitPost = async () => {
    if (!newContent.trim() || !selectedCategory || !user) return;

    let { data: groups } = await supabase.from("community_groups").select("id").limit(1);
    let groupId = groups?.[0]?.id;
    if (!groupId) {
      toast({ title: "Error", description: "No community group exists", variant: "destructive" });
      return;
    }

    const isVerified = (profile as any)?.is_verified === true;

    const { data: newPost, error } = await supabase.from("forum_posts").insert({
      group_id: groupId,
      user_id: user.id,
      user_name: profile?.display_name || "Anonymous",
      content: newContent,
      title: newTitle || null,
      category: selectedCategory.name,
      post_type: "question",
      is_approved: isVerified,
    }).select().single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Posted!", description: isVerified ? "Your post is live!" : "Your post is pending admin approval." });
      setNewTitle("");
      setNewContent("");
      setShowNewPost(false);
      loadPosts(selectedCategory.name);
      
      // Schedule bot reply for new post
      if (newPost) scheduleBotReply(newPost.id);
    }
  };

  const submitReply = async (parentId: string) => {
    if (!replyContent[parentId]?.trim() || !user || !selectedCategory) return;

    let { data: groups } = await supabase.from("community_groups").select("id").limit(1);
    let groupId = groups?.[0]?.id;
    if (!groupId) return;

    const isVerified = (profile as any)?.is_verified === true;

    const { error } = await supabase.from("forum_posts").insert({
      group_id: groupId,
      user_id: user.id,
      user_name: profile?.display_name || "Anonymous",
      content: replyContent[parentId],
      category: selectedCategory.name,
      parent_id: parentId,
      post_type: "answer",
      is_approved: isVerified,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reply submitted!", description: isVerified ? "Your reply is live!" : "Pending admin approval." });
      setReplyContent(prev => ({ ...prev, [parentId]: "" }));
      setShowReplyFor(null);
      loadReplies(parentId);
      
      // Cancel bot timer since someone replied
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
      await supabase.from("forum_votes").update({ vote_type: type }).eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("forum_votes").insert({ post_id: postId, user_id: user.id, vote_type: type });
    }

    const post = [...posts, ...Object.values(replies).flat()].find(p => p.id === postId);
    if (post) {
      const newUp = type === "up" ? post.upvotes + 1 : (existing?.vote_type === "up" ? post.upvotes - 1 : post.upvotes);
      const newDown = type === "down" ? post.downvotes + 1 : (existing?.vote_type === "down" ? post.downvotes - 1 : post.downvotes);
      await supabase.from("forum_posts").update({ upvotes: newUp, downvotes: newDown }).eq("id", postId);
    }

    loadUserVotes();
    if (selectedCategory) loadPosts(selectedCategory.name);
  };

  const createCategory = async () => {
    if (!newCategoryName.trim() || !user) return;
    const { error } = await supabase.from("forum_categories").insert({
      name: newCategoryName,
      icon: "💬",
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewCategoryName("");
      setShowNewCategory(false);
      loadCategories();
    }
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
    return (
      <span className={isBot ? "text-accent font-semibold" : ""}>
        {name} {isBot && <Badge variant="outline" className="text-[8px] text-accent border-accent/30 ml-1">MOD</Badge>}
        <span className="text-muted-foreground font-normal"> • u/{shortId}</span>
      </span>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-primary font-display text-xl">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          {!selectedCategory ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-display font-bold">
                  <span className="text-gradient">Community</span> Forums
                </h1>
                <p className="text-muted-foreground">Ask questions, share insights, and learn from fellow hustlers</p>
                {isFreeUser && (
                  <p className="text-xs text-muted-foreground">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Free users can access General Discussion only. <button onClick={() => navigate("/payment")} className="text-primary hover:underline">Upgrade</button> to unlock all groups.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                {user && !isFreeUser && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewCategory(!showNewCategory)}
                    className="hover:border-primary/50 hover:text-primary transition-all"
                  >
                    <Plus className="w-4 h-4 mr-1" /> New Category
                  </Button>
                )}
              </div>

              {showNewCategory && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="glass rounded-xl p-4 flex gap-2">
                  <Input placeholder="Category name..." value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="focus:shadow-glow focus:border-primary transition-all" />
                  <Button onClick={createCategory} className="bg-gradient-primary text-primary-foreground shrink-0">
                    Create
                  </Button>
                </motion.div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {categories.map((cat, i) => {
                  const locked = isFreeUser && !isGeneralCategory(cat.name);
                  return (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => openCategory(cat)}
                      className={`glass rounded-xl p-6 space-y-3 cursor-pointer transition-all duration-500 group active:scale-[0.98] relative ${
                        locked
                          ? "opacity-60 hover:border-accent/30"
                          : "hover:border-primary/30 hover:shadow-glow"
                      }`}
                    >
                      {locked && (
                        <div className="absolute top-3 right-3">
                          <Lock className="w-4 h-4 text-accent" />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-3xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                        <div>
                          <h3 className="font-display font-bold text-lg group-hover:text-gradient transition-all">
                            {cat.name}
                          </h3>
                          {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                          {locked && <p className="text-[10px] text-accent">Pro+ members only</p>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {!user && (
                <div className="text-center glass rounded-xl p-8 space-y-3">
                  <p className="text-muted-foreground">Sign up to post questions and join discussions</p>
                  <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/signup")}>
                    Join the Community
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => { setSelectedCategory(null); setPosts([]); setShowNewPost(false); }}
                className="hover:text-primary transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Forums
              </Button>

              <div className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedCategory.icon}</span>
                    <div>
                      <h2 className="font-display font-bold text-xl">{selectedCategory.name}</h2>
                      {selectedCategory.description && (
                        <p className="text-sm text-muted-foreground">{selectedCategory.description}</p>
                      )}
                    </div>
                  </div>
                  {user && (
                    <Button onClick={() => setShowNewPost(!showNewPost)}
                      className="bg-gradient-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-transform">
                      <Plus className="w-4 h-4 mr-1" /> Ask Question
                    </Button>
                  )}
                </div>

                {/* New post form */}
                <AnimatePresence>
                  {showNewPost && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 mb-6 p-4 rounded-xl bg-secondary/30 border border-border/50"
                    >
                      <Input
                        placeholder="Question title..."
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        className="focus:shadow-glow focus:border-primary transition-all font-semibold"
                      />
                      <Textarea
                        placeholder="Describe your question in detail..."
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        rows={4}
                        className="focus:shadow-glow focus:border-primary transition-all"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {(profile as any)?.is_verified ? "✅ Verified — auto-approved" : "Posts require admin approval before appearing publicly"}
                        </p>
                        <Button onClick={submitPost} size="sm"
                          className="bg-gradient-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-transform">
                          <Send className="w-4 h-4 mr-1" /> Post
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sort bar */}
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

                {/* Posts */}
                <div className="space-y-3">
                  {sortedPosts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No posts yet. Be the first to ask a question!
                    </p>
                  )}
                  {sortedPosts.map(post => {
                    const userVote = userVotes.find(v => v.post_id === post.id);
                    const score = post.upvotes - post.downvotes;
                    const isExpanded = expandedPosts.has(post.id);

                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-xl border border-border/50 bg-secondary/20 hover:border-primary/20 transition-all duration-300 group"
                      >
                        <div className="flex">
                          {/* Vote column */}
                          <div className="flex flex-col items-center py-4 px-3 gap-1">
                            <button
                              onClick={() => vote(post.id, "up")}
                              className={`p-1 rounded transition-all hover:scale-110 ${
                                userVote?.vote_type === "up" ? "text-primary" : "text-muted-foreground hover:text-primary"
                              }`}
                            >
                              <ChevronUp className="w-5 h-5" />
                            </button>
                            <span className={`text-sm font-bold ${score > 0 ? "text-primary" : score < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                              {score}
                            </span>
                            <button
                              onClick={() => vote(post.id, "down")}
                              className={`p-1 rounded transition-all hover:scale-110 ${
                                userVote?.vote_type === "down" ? "text-destructive" : "text-muted-foreground hover:text-destructive"
                              }`}
                            >
                              <ChevronDown className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Content */}
                          <div className="flex-1 py-4 pr-4 space-y-2">
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <User className="w-3 h-3" />
                              {getUsernameDisplay(post)}
                              <span>•</span>
                              <span>{new Date(post.created_at).toLocaleDateString()}</span>
                              {!post.is_approved && post.user_id === user?.id && (
                                <Badge variant="outline" className="text-[9px] text-yellow-500 border-yellow-500/30">
                                  <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> Pending
                                </Badge>
                              )}
                              {post.is_approved && (
                                <Badge variant="outline" className="text-[9px] text-primary border-primary/30">
                                  <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Approved
                                </Badge>
                              )}
                            </div>

                            {post.title && (
                              <h3 className="font-display font-semibold text-sm group-hover:text-primary transition-colors">
                                {post.title}
                              </h3>
                            )}
                            <p className="text-sm text-muted-foreground">{post.content}</p>

                            <div className="flex items-center gap-3 pt-1">
                              <button
                                onClick={() => toggleExpand(post.id)}
                                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {replies[post.id]?.length || 0} answers
                              </button>
                              {user && (
                                <button
                                  onClick={() => setShowReplyFor(showReplyFor === post.id ? null : post.id)}
                                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                  Reply
                                </button>
                              )}
                            </div>

                            {/* Reply input */}
                            <AnimatePresence>
                              {showReplyFor === post.id && (
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

                            {/* Replies / answers thread */}
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
