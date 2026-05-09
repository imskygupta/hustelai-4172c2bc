import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Crown, Shield, Send, FileDown, CreditCard, Settings as Cog, Plug,
  Sparkles, ArrowRight, CheckCircle2, AlertCircle, Bell, Key, ExternalLink,
  Clock, Zap, BadgeCheck, Receipt, Activity,
} from "lucide-react";

interface ExportLite {
  id: string; title: string; export_type: string; status: string;
  created_at: string; telegram_file_id: string | null;
}
interface PaymentLite { id: string; plan: string | null; amount: number; status: string; created_at: string; }
interface IntegRow { provider: string; status: string; provider_username: string | null; last_active_at: string | null; }

const tierMeta: Record<string, { label: string; cls: string }> = {
  free:     { label: "Free",     cls: "bg-secondary text-secondary-foreground" },
  pro:      { label: "Pro",      cls: "bg-primary/15 text-primary ring-1 ring-primary/30" },
  elite:    { label: "Elite",    cls: "bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30" },
  infinity: { label: "Infinity", cls: "bg-gradient-primary text-primary-foreground" },
};

export default function Profile() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [exports, setExports] = useState<ExportLite[]>([]);
  const [payments, setPayments] = useState<PaymentLite[]>([]);
  const [integrations, setIntegrations] = useState<IntegRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingData(true);
      const [eRes, pRes, iRes] = await Promise.all([
        supabase.from("generated_exports" as any).select("id,title,export_type,status,created_at,telegram_file_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("payments").select("id,plan,amount,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        supabase.from("notification_integrations" as any).select("provider,status,provider_username,last_active_at").eq("user_id", user.id),
      ]);
      setExports(((eRes.data as any) || []) as ExportLite[]);
      setPayments(((pRes.data as any) || []) as PaymentLite[]);
      setIntegrations(((iRes.data as any) || []) as IntegRow[]);
      setLoadingData(false);
    })();
  }, [user]);

  const tier = (profile?.subscription_tier as string) || "free";
  const tm = tierMeta[tier] || tierMeta.free;
  const emailVerified = !!user?.email_confirmed_at;
  const tg = integrations.find(i => i.provider === "telegram" && i.status === "connected");
  const initials = useMemo(() =>
    (profile?.display_name || user?.email || "?").slice(0, 2).toUpperCase(),
  [profile, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-44 rounded-2xl" />
          <div className="grid md:grid-cols-4 gap-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Profile | HustleAI Workspace" description="Your workspace identity, integrations, and activity." path="/profile" noindex />
      <Navbar />

      <div className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Identity header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card"
          >
            <div className="h-28 bg-gradient-to-br from-primary/30 via-accent/15 to-transparent" />
            <div className="px-5 sm:px-7 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
              <Avatar className="h-24 w-24 ring-4 ring-card shadow-md">
                <AvatarImage src={(profile as any)?.avatar_url || ""} />
                <AvatarFallback className="text-2xl font-display">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 sm:pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-display font-semibold tracking-tight truncate">
                    {profile?.display_name || "Your workspace"}
                  </h1>
                  <Badge className={tm.cls}>
                    {tier === "infinity" && <Crown className="h-3 w-3 mr-1" />}
                    {tm.label}
                  </Badge>
                  {emailVerified ? (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500"><BadgeCheck className="h-3 w-3 mr-0.5" /> Verified</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500"><AlertCircle className="h-3 w-3 mr-0.5" /> Email unverified</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {(profile as any)?.headline || profile?.email || ""}
                </p>
              </div>
              <div className="flex gap-2 sm:pb-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/settings/profile"><Cog className="h-4 w-4 mr-1.5" /> Edit profile</Link>
                </Button>
                {tier === "free" && (
                  <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground">
                    <Link to="/payment"><Crown className="h-4 w-4 mr-1.5" /> Upgrade</Link>
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile icon={Sparkles} label="XP points" value={profile?.xp_points ?? 0} />
            <StatTile icon={Zap} label="Search credits" value={(profile as any)?.referral_credits ?? 0} />
            <StatTile icon={FileDown} label="Recent exports" value={loadingData ? "…" : exports.length} />
            <StatTile icon={Activity} label="Member since" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"} small />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Telegram integration card */}
              <Card>
                <CardHeader
                  icon={Send}
                  title="Telegram delivery"
                  meta={tg ? <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-500"><CheckCircle2 className="h-3 w-3 mr-0.5" /> Connected</Badge>
                            : <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">Not connected</Badge>}
                  cta={<Link to="/settings/telegram" className="text-xs text-primary inline-flex items-center gap-1">Manage <ArrowRight className="h-3 w-3" /></Link>}
                />
                <div className="px-5 pb-5">
                  {tg ? (
                    <div className="text-sm text-muted-foreground">
                      Linked to <span className="text-foreground font-medium">@{tg.provider_username || "telegram"}</span>
                      {tg.last_active_at && <> · last active {new Date(tg.last_active_at).toLocaleDateString()}</>}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Receive exports, payment alerts, and AI completions instantly in Telegram.
                    </div>
                  )}
                </div>
              </Card>

              {/* Recent exports */}
              <Card>
                <CardHeader icon={FileDown} title="Recent exports"
                  cta={<Link to="/settings/exports" className="text-xs text-primary inline-flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>}
                />
                <div className="px-5 pb-5">
                  {loadingData ? (
                    <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-12 rounded-md" />)}</div>
                  ) : exports.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No exports yet. Generate something first.</p>
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {exports.map(e => (
                        <li key={e.id} className="py-3 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
                            <FileDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{e.title}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <span className="uppercase">{e.export_type}</span>
                              <span>·</span>
                              <Clock className="h-3 w-3" />
                              {new Date(e.created_at).toLocaleDateString()}
                              {e.telegram_file_id && <> · <Send className="h-3 w-3 text-emerald-500" /> cached</>}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{e.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>

              {/* Billing snapshot */}
              <Card>
                <CardHeader icon={Receipt} title="Billing snapshot"
                  cta={<Link to="/settings/billing" className="text-xs text-primary inline-flex items-center gap-1">Manage <ArrowRight className="h-3 w-3" /></Link>}
                />
                <div className="px-5 pb-5">
                  {loadingData ? (
                    <Skeleton className="h-14 rounded-md" />
                  ) : payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No payments yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {payments.map(p => (
                        <li key={p.id} className="flex items-center justify-between text-sm py-1.5">
                          <div>
                            <span className="font-medium">{(p.plan || "—").toUpperCase()}</span>
                            <span className="text-muted-foreground"> · {new Date(p.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">₹{p.amount}</span>
                            <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Quick actions */}
              <Card>
                <CardHeader icon={Cog} title="Quick actions" />
                <div className="px-3 pb-3">
                  {[
                    { to: "/settings/profile",        label: "Edit profile",        icon: Cog },
                    { to: "/settings/security",       label: "Security & password", icon: Shield },
                    { to: "/settings/notifications",  label: "Notifications",       icon: Bell },
                    { to: "/settings/telegram",       label: "Telegram delivery",   icon: Send },
                    { to: "/settings/billing",        label: "Billing & invoices",  icon: CreditCard },
                    { to: "/settings/integrations",   label: "Integrations",        icon: Plug },
                    { to: "/settings/api",            label: "API keys",            icon: Key },
                  ].map(a => (
                    <Link key={a.to} to={a.to}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-muted/60 transition group">
                      <a.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      <span className="flex-1">{a.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                    </Link>
                  ))}
                </div>
              </Card>

              {/* Connected accounts */}
              <Card>
                <CardHeader icon={Plug} title="Connected accounts"
                  cta={<Link to="/settings/integrations" className="text-xs text-primary inline-flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>}
                />
                <div className="px-5 pb-5 space-y-2">
                  <Row label="Telegram" status={tg ? "connected" : "disconnected"} />
                  <Row label="Discord"  status="soon" />
                  <Row label="Slack"    status="soon" />
                </div>
              </Card>

              {/* Verification trust */}
              <Card>
                <CardHeader icon={BadgeCheck} title="Verification" />
                <div className="px-5 pb-5 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    {emailVerified
                      ? <span className="text-emerald-500 inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
                      : <Link to="/settings/security" className="text-amber-500 inline-flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Verify</Link>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Telegram</span>
                    {tg
                      ? <span className="text-emerald-500 inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Linked</span>
                      : <Link to="/settings/telegram" className="text-primary inline-flex items-center gap-1">Connect <ExternalLink className="h-3 w-3" /></Link>}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- presentational helpers ---------- */
function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border/50 bg-card overflow-hidden">{children}</section>;
}
function CardHeader({ icon: Icon, title, meta, cta }: { icon: any; title: string; meta?: React.ReactNode; cta?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between px-5 py-4 border-b border-border/40">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight truncate">{title}</h2>
        {meta}
      </div>
      {cta}
    </header>
  );
}
function StatTile({ icon: Icon, label, value, small }: { icon: any; label: string; value: any; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className={`mt-2 font-display ${small ? "text-base" : "text-2xl"} font-semibold`}>{value}</div>
    </div>
  );
}
function Row({ label, status }: { label: string; status: "connected" | "disconnected" | "soon" }) {
  const cfg = {
    connected:    { dot: "bg-emerald-500",  text: "Connected",   cls: "text-emerald-500" },
    disconnected: { dot: "bg-muted-foreground/40", text: "Not connected", cls: "text-muted-foreground" },
    soon:         { dot: "bg-amber-500/60", text: "Soon",        cls: "text-amber-500" },
  }[status];
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs ${cfg.cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} /> {cfg.text}
      </span>
    </div>
  );
}
