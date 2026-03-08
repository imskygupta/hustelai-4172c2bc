import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, ExternalLink, Video, Gift, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  target_tier: string;
  created_at: string;
}

const typeIcons: Record<string, any> = {
  info: Info,
  alert: AlertTriangle,
  webinar: Video,
  offer: Gift,
  meet: Video,
};

const typeColors: Record<string, string> = {
  info: "border-primary/30 bg-primary/5",
  alert: "border-destructive/30 bg-destructive/5",
  webinar: "border-accent/30 bg-accent/5",
  offer: "border-yellow-500/30 bg-yellow-500/5",
  meet: "border-primary/30 bg-primary/5",
};

export function NotificationPopup() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user && profile) loadNotifications();
  }, [user, profile]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      const filtered = (data as Notification[]).filter(n => {
        if (n.target_tier === "all") return true;
        const tierOrder = ["free", "pro", "elite", "infinity"];
        return tierOrder.indexOf(profile!.subscription_tier) >= tierOrder.indexOf(n.target_tier);
      });
      // Load dismissed from localStorage only once per session
      const stored = JSON.parse(localStorage.getItem("dismissed_notifs") || "[]");
      setDismissed(new Set(stored));
      setNotifications(filtered);
      setLoaded(true);
    }
  };

  const dismiss = (id: string) => {
    const newDismissed = new Set(dismissed).add(id);
    setDismissed(newDismissed);
    localStorage.setItem("dismissed_notifs", JSON.stringify([...newDismissed]));
  };

  const dismissAll = () => {
    const allIds = new Set([...dismissed, ...notifications.map(n => n.id)]);
    setDismissed(allIds);
    localStorage.setItem("dismissed_notifs", JSON.stringify([...allIds]));
  };

  const visible = notifications.filter(n => !dismissed.has(n.id));

  if (!loaded || visible.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {visible.length > 1 && (
        <button onClick={dismissAll}
          className="text-[10px] text-muted-foreground hover:text-primary ml-auto block mb-1 transition-colors">
          Mark all as read ({visible.length})
        </button>
      )}
      <AnimatePresence>
        {visible.slice(0, 3).map((n) => {
          const Icon = typeIcons[n.type] || Bell;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`glass rounded-xl p-4 border ${typeColors[n.type] || "border-border/50"} shadow-lg`}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                  {n.link && (
                    <a href={n.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Open Link
                    </a>
                  )}
                </div>
                <button onClick={() => dismiss(n.id)} className="text-muted-foreground hover:text-foreground" title="Mark as read">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
