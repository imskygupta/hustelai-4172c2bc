import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check, CheckCheck, ExternalLink, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface NotifEvent {
  id: string;
  event_key: string;
  category: string;
  title: string | null;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const CATS = [
  { id: "all", label: "All" },
  { id: "billing", label: "Billing" },
  { id: "ai", label: "AI" },
  { id: "security", label: "Security" },
  { id: "announcement", label: "News" },
] as const;

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifEvent[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    void load();
    const ch = supabase.channel("notif-events-" + user.id)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notification_events", filter: `user_id=eq.${user.id}` },
        (p) => setItems((cur) => [p.new as any, ...cur].slice(0, 50)))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  const load = async () => {
    const { data } = await supabase
      .from("notification_events" as any)
      .select("id,event_key,category,title,body,link,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as any) || []);
  };

  const unread = useMemo(() => items.filter((i) => !i.read_at).length, [items]);
  const visible = useMemo(
    () => filter === "all" ? items : items.filter((i) => i.category === filter),
    [items, filter],
  );

  const markRead = async (id: string) => {
    setItems((cur) => cur.map((i) => i.id === id ? { ...i, read_at: new Date().toISOString() } : i));
    await supabase.from("notification_events" as any).update({ read_at: new Date().toISOString() }).eq("id", id);
  };
  const markAll = async () => {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!ids.length) return;
    setItems((cur) => cur.map((i) => ids.includes(i.id) ? { ...i, read_at: new Date().toISOString() } : i));
    await supabase.from("notification_events" as any)
      .update({ read_at: new Date().toISOString() }).in("id", ids);
  };
  const handleClick = async (n: NotifEvent) => {
    await markRead(n.id);
    if (n.link) {
      setOpen(false);
      if (n.link.startsWith("http")) window.open(n.link, "_blank");
      else navigate(n.link);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-muted/60 transition-colors"
        aria-label="Notifications">
        <Bell className="w-5 h-5 text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 mt-2 w-[360px] max-w-[90vw] bg-background border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Notifications</span>
                  {unread > 0 && <span className="text-[10px] text-muted-foreground">{unread} unread</span>}
                </div>
                <button onClick={markAll} disabled={!unread}
                  className="text-[11px] text-primary hover:underline disabled:opacity-40 inline-flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              </div>
              <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto">
                {CATS.map((c) => (
                  <button key={c.id} onClick={() => setFilter(c.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                      filter === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>{c.label}</button>
                ))}
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {visible.length === 0 ? (
                  <div className="px-6 py-10 text-center text-xs text-muted-foreground">
                    You're all caught up. ✨
                  </div>
                ) : visible.map((n) => (
                  <div key={n.id}
                    onClick={() => handleClick(n)}
                    className={`group flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer transition ${
                      !n.read_at ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                    }`}>
                    <div className={`w-2 h-2 mt-1.5 rounded-full ${!n.read_at ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title || n.event_key}</p>
                      {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                        <span className="text-[10px] text-muted-foreground/70">· {n.category}</span>
                        {n.link && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </div>
                    {!n.read_at && (
                      <button onClick={(e) => { e.stopPropagation(); void markRead(n.id); }}
                        className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-background rounded">
                        <Check className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-border bg-muted/30">
                <button onClick={() => { setOpen(false); navigate("/settings/integrations"); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground">
                  Notification settings →
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}