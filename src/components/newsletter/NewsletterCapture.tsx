import { useEffect, useState } from "react";
import { Mail, X, Loader2, CheckCircle2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { subscribe, markDismissed, isSubscribed, isDismissed, markNeverShow } from "@/lib/newsletter/capture";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Variant = "inline" | "popup";

interface Props {
  variant?: Variant;
  surface?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  className?: string;
  headline?: string;
  description?: string;
}

const DEFAULT_HEADLINE = "Weekly AI freelance & creator brief";
const DEFAULT_DESC = "One concise email each Sunday. No spam, unsubscribe anytime.";

export function NewsletterCapture({
  variant = "inline", surface = "inline", open, onOpenChange,
  className, headline = DEFAULT_HEADLINE, description = DEFAULT_DESC,
}: Props) {
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [neverShow, setNeverShow] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      toast({ title: "Enter a valid email", variant: "destructive" as any });
      return;
    }
    setLoading(true);
    try {
      await subscribe({ email: trimmed, source: surface });
      setDone(true);
      toast({ title: "You're in 🎉", description: "Check your inbox each Sunday." });
      setTimeout(() => { onOpenChange?.(false); }, 1500);
    } catch (err: any) {
      toast({ title: "Could not subscribe", description: err?.message || "Try again later", variant: "destructive" as any });
    } finally { setLoading(false); }
  };

  const dismiss = () => { markDismissed(surface); onOpenChange?.(false); };
  const handleClose = (v: boolean) => {
    if (!v) {
      if (neverShow) markNeverShow();
      else markDismissed(surface);
    }
    onOpenChange?.(v);
  };

  const form = (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-violet-600">
        <Mail className="w-4 h-4" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">Newsletter</span>
      </div>
      <h3 className="font-display font-bold text-lg text-slate-900 leading-snug">{headline}</h3>
      <p className="text-sm text-slate-600">{description}</p>
      {done ? (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-sm">
          <CheckCircle2 className="w-4 h-4" /> Subscribed — see you Sunday.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Input
            type="email" inputMode="email" autoComplete="email"
            placeholder="you@workspace.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 text-base bg-white border-slate-300 placeholder:text-slate-400 focus-visible:ring-emerald-500"
            disabled={loading}
            required
          />
          <Button type="submit" disabled={loading} className="h-12 px-5 bg-slate-900 hover:bg-slate-800 text-white active:scale-95 transition">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe"}
          </Button>
        </div>
      )}
      <p className="text-[11px] text-slate-400">By subscribing you agree to receive emails from HustleAI. Unsubscribe with one click.</p>
      {variant === "popup" && !done && (
        <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer select-none pt-1">
          <Checkbox
            checked={neverShow}
            onCheckedChange={(v) => setNeverShow(v === true)}
          />
          Don't show this again
        </label>
      )}
    </form>
  );

  if (variant === "inline") {
    return (
      <div className={cn("rounded-2xl border border-slate-200 bg-white p-5", className)}>
        {form}
      </div>
    );
  }

  // Popup variant — drawer on mobile, dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-2">
          {form}
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-6">
        <button
          aria-label="Close" onClick={() => handleClose(false)}
          className="absolute top-3 right-3 inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 active:scale-95 transition"
        >
          <X className="w-4 h-4" />
        </button>
        {form}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Auto-mounted global trigger — opens the popup once per device per
 * dismissal window when scroll, time-on-site, or exit-intent fires.
 */
export function NewsletterCaptureAutoTrigger() {
  const [open, setOpen] = useState(false);
  const [surface, setSurface] = useState<string>("popup");
  const location = useLocation();
  const { user, loading } = useAuth() as any;

  // Route-based suppression — never interrupt sensitive flows
  const path = location.pathname || "/";
  const SUPPRESS_PREFIXES = [
    "/admin",
    "/payment",
    "/onboarding",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/unsubscribe",
    "/dashboard",
    "/settings",
    "/profile",
    "/workspace-os",
    "/workspaces",
    "/hustle-canvas",
    "/hustlebot",
    "/work/",
    "/intake/",
    "/_preview",
  ];
  const suppressedRoute = SUPPRESS_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p));

  useEffect(() => {
    if (loading) return;
    if (suppressedRoute) return;
    // Authenticated users never see the marketing popup — they manage email prefs in settings
    if (user) return;
    if (isSubscribed()) return;
    if (isDismissed("popup")) return;

    let fired = false;
    const fire = (s: string) => {
      if (fired) return;
      fired = true;
      setSurface(s);
      setOpen(true);
    };

    // Time-on-site: 3 minutes (lowered frequency vs 60s)
    const timer = window.setTimeout(() => fire("time"), 180_000);

    // Scroll depth: 85% (only deeply engaged readers)
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (total > 0 && scrolled / total >= 0.85) fire("scroll");
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Exit-intent (desktop only)
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 0) fire("exit_intent"); };
    if (!isCoarse) document.addEventListener("mouseleave", onLeave);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [loading, suppressedRoute, user]);

  if (suppressedRoute) return null;
  if (user) return null;
  return <NewsletterCapture variant="popup" surface={surface} open={open} onOpenChange={setOpen} />;
}