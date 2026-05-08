import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("workspace_notifications")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
    setItems(data || []);
  };
  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase.channel(`notifs-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workspace_notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          load();
          const n = payload?.new;
          if (n?.title) {
            toast(n.title, {
              description: n.body || undefined,
              action: n.link ? { label: "View", onClick: () => navigate(n.link) } : undefined,
            });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const unread = items.filter(i => !i.read).length;

  const markAll = async () => {
    if (!user) return;
    await (supabase as any).from("workspace_notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative h-9 w-9 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="text-sm font-medium">Notifications</h4>
          {unread > 0 && <Button size="sm" variant="ghost" onClick={markAll}><Check className="h-3 w-3 mr-1" />Mark read</Button>}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center">All quiet here.</p>}
          {items.map(n => (
            <Link key={n.id} to={n.link || "#"} onClick={() => setOpen(false)}
              className={`block p-3 border-b border-border/50 hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`}>
              <p className="text-sm font-medium leading-tight">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}