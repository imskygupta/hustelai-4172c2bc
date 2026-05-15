import { useMemo, useState } from "react";
import { communityDb } from "@/integrations/community/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, Trash2, MessageSquare, Search, Flag, Bot } from "lucide-react";
import { OperatorHeader, OperatorChips, OperatorEmpty, OperatorExplainer, OperatorCard } from "./OperatorScaffold";
import { OpsBadge } from "./OpsBadge";
import { toast } from "@/hooks/use-toast";

type ProfileLike = { user_id: string; email: string | null; display_name: string | null; subscription_tier: string; created_at?: string };
type Post = any;
type Filter = "pending" | "approved" | "all";

export function ForumModerationPanel({
  posts, users, onChanged,
}: {
  posts: Post[];
  users: ProfileLike[];
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [openPost, setOpenPost] = useState<Post | null>(null);

  const counts = useMemo(() => ({
    pending: posts.filter((p) => !p.is_approved).length,
    approved: posts.filter((p) => p.is_approved).length,
    all: posts.length,
  }), [posts]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (filter === "pending" && p.is_approved) return false;
      if (filter === "approved" && !p.is_approved) return false;
      if (q) {
        const hay = [p.title, p.content, p.user_name, p.category].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, filter, query]);

  const author = openPost ? users.find((u) => u.user_id === openPost.user_id) : null;

  return (
    <div className="space-y-4">
      <OperatorHeader icon={MessageSquare} title="Forum moderation" count={`${counts.pending} pending · ${counts.all} total`} badges={[{ kind: "production" }]} />
      <OperatorExplainer title="What to look for">
        Approve posts that contribute. Reject spam, scams, off-topic blasts, or anything that violates community guidelines. Click any row to open the author drawer for context.
      </OperatorExplainer>

      <div className="flex flex-wrap items-center gap-2">
        <OperatorChips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { key: "pending", label: "Pending", count: counts.pending },
            { key: "approved", label: "Approved", count: counts.approved },
            { key: "all", label: "All", count: counts.all },
          ]}
        />
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts…" className="pl-9 h-8 text-sm" />
        </div>
      </div>

      {list.length === 0 ? (
        <OperatorEmpty icon={MessageSquare} title="Nothing in this view" hint="Try switching filters." />
      ) : (
        <div className="space-y-1.5">
          {list.map((post) => {
            const u = users.find((x) => x.user_id === post.user_id);
            const isNew = u?.created_at ? (Date.now() - new Date(u.created_at).getTime()) / 86400000 < 3 : false;
            return (
              <OperatorCard key={post.id} className="p-4 hover:border-border transition cursor-pointer" >
                <div className="flex items-start gap-3">
                  <button onClick={() => setOpenPost(post)} className="flex-1 min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      {post.title && <span className="font-semibold text-sm truncate">{post.title}</span>}
                      <span className="text-[10px] uppercase tracking-wider rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">{post.category || "general"}</span>
                      {!post.is_approved && <OpsBadge kind="experimental">Pending</OpsBadge>}
                      {post.is_approved && <OpsBadge kind="production">Approved</OpsBadge>}
                      {isNew && <span className="text-[10px] text-amber-400 inline-flex items-center gap-1"><Flag className="w-3 h-3" />New account</span>}
                      {post.flagged && <span className="text-[10px] text-destructive inline-flex items-center gap-1"><Flag className="w-3 h-3" />Reported</span>}
                    </div>
                    <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{post.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {u?.display_name || u?.email || post.user_name || post.user_id?.slice(0, 8)} · {new Date(post.created_at).toLocaleString()}
                    </p>
                  </button>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!post.is_approved && (
                      <Button size="sm" className="h-8" onClick={async () => {
                        await communityDb.from("forum_posts").update({ is_approved: true }).eq("id", post.id);
                        toast({ title: "Approved" });
                        onChanged();
                      }}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-destructive border-destructive/30">
                          <Trash2 className="w-3 h-3 mr-1" /> Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this post?</AlertDialogTitle>
                          <AlertDialogDescription>The post will be deleted from the forum. This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            await communityDb.from("forum_posts").delete().eq("id", post.id);
                            toast({ title: "Removed" });
                            onChanged();
                          }}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </OperatorCard>
            );
          })}
        </div>
      )}

      {/* Author drawer */}
      <Sheet open={!!openPost} onOpenChange={(o) => !o && setOpenPost(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {openPost && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Post detail</SheetTitle>
                <SheetDescription className="sr-only">Forum post moderation context</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                {openPost.title && <h3 className="font-semibold">{openPost.title}</h3>}
                <p className="text-foreground/90 whitespace-pre-wrap">{openPost.content}</p>
                <div className="text-[11px] text-muted-foreground">
                  Posted {new Date(openPost.created_at).toLocaleString()} · category {openPost.category || "general"}
                </div>
                <div className="border-t border-border/40 pt-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Author</div>
                  {author ? (
                    <div className="space-y-1 text-xs">
                      <div className="font-medium text-sm">{author.display_name || author.email || author.user_id.slice(0, 8)}</div>
                      <div className="text-muted-foreground">{author.email}</div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <OpsBadge kind={author.subscription_tier === "free" ? "experimental" : "production"}>{author.subscription_tier}</OpsBadge>
                        {author.created_at && <span className="text-[10px] text-muted-foreground">Joined {new Date(author.created_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Bot className="w-3 h-3" />External / unknown user</div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
