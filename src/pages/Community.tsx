import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { MessageSquare, Send, Lock, Users, ArrowLeft } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  min_tier: string;
}

interface Post {
  id: string;
  content: string;
  user_name: string | null;
  created_at: string;
  user_id: string;
}

const tierOrder = ["free", "pro", "elite", "infinity"];

export default function Community() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (user) loadGroups();
  }, [user]);

  const loadGroups = async () => {
    const { data } = await supabase.from("community_groups").select("*").order("created_at");
    if (data) setGroups(data as Group[]);
  };

  const loadPosts = async (groupId: string) => {
    const { data } = await supabase
      .from("forum_posts")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (data) setPosts(data as Post[]);
  };

  const openGroup = (group: Group) => {
    setSelectedGroup(group);
    loadPosts(group.id);
  };

  const sendPost = async () => {
    if (!newPost.trim() || !selectedGroup || !user) return;
    const { error } = await supabase.from("forum_posts").insert({
      group_id: selectedGroup.id,
      user_id: user.id,
      content: newPost,
      user_name: profile?.display_name || "Anonymous",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewPost("");
      loadPosts(selectedGroup.id);
    }
  };

  const canAccess = (minTier: string) => {
    if (!profile) return false;
    return tierOrder.indexOf(profile.subscription_tier) >= tierOrder.indexOf(minTier);
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
          {!selectedGroup ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-display font-bold">
                  <span className="text-gradient">Community</span> Forums
                </h1>
                <p className="text-muted-foreground">Join discussions with fellow hustlers</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {groups.map((group, i) => {
                  const locked = !canAccess(group.min_tier);
                  return (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => !locked && openGroup(group)}
                      className={`glass rounded-xl p-6 space-y-3 transition-all duration-300 ${
                        locked ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-primary/30 hover:shadow-glow"
                      } ${locked ? "blur-[1px]" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">{group.icon}</span>
                        {locked ? (
                          <Badge variant="outline" className="text-[10px]">
                            <Lock className="w-3 h-3 mr-1" /> {group.min_tier}+ only
                          </Badge>
                        ) : (
                          <Badge className="bg-primary/20 text-primary text-[10px]">
                            <Users className="w-3 h-3 mr-1" /> Open
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-lg">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => { setSelectedGroup(null); setPosts([]); }}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Groups
              </Button>

              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">{selectedGroup.icon}</span>
                  <div>
                    <h2 className="font-display font-bold text-xl">{selectedGroup.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-4 pr-2">
                  {posts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">No messages yet. Start the conversation!</p>
                  )}
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className={`rounded-lg p-3 max-w-[80%] ${
                        post.user_id === user?.id
                          ? "ml-auto bg-primary/10 border border-primary/20"
                          : "bg-secondary/50 border border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-xs">{post.user_name || "Anonymous"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(post.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{post.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendPost()}
                  />
                  <Button onClick={sendPost} className="bg-gradient-primary text-primary-foreground shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
