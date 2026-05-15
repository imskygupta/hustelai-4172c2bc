import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ADMIN_DOCS, DOC_CATEGORIES } from "@/lib/admin-docs/content";
import { OpsBadge } from "@/components/admin/OpsBadge";
import { OperatorLink } from "@/components/admin/OperatorLink";
import { Input } from "@/components/ui/input";
import { Loader2, BookOpen, Search, ChevronDown } from "lucide-react";
import { SEO } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDocs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate("/imskygupta-admin", { replace: true }); return; }
      const { data: ok } = await (supabase as any).rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!ok) { navigate("/", { replace: true }); return; }
      setAuthorized(true);
      setLoading(false);
    })();
  }, [navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_DOCS.filter((d) => {
      if (activeCat !== "All" && d.category !== activeCat) return false;
      if (!q) return true;
      const hay = [d.title, d.summary, d.category, d.keywords ?? "", ...d.body.flatMap((b) => [b.heading, b.text ?? "", ...(b.bullets ?? [])])]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, activeCat]);

  const grouped = useMemo(() => {
    const m: Record<string, typeof ADMIN_DOCS> = {};
    filtered.forEach((d) => { (m[d.category] ||= []).push(d); });
    return m;
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Operator Handbook | Admin" description="Internal operator handbook" path="" noindex />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">Operator Handbook</h1>
            <p className="text-xs text-muted-foreground">Internal documentation for HustleAI admins · do not share</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <OpsBadge kind="internal" />
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to admin
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the handbook (telegram, payments, workflow, …)"
              className="pl-9 h-10"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["All", ...DOC_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`px-2.5 py-1 rounded-full border text-[11px] uppercase tracking-wider transition ${
                  activeCat === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">No matches for "{query}"</div>
        )}
        {(DOC_CATEGORIES as readonly string[]).map((cat) => {
          const items = grouped[cat];
          if (!items?.length) return null;
          return (
            <section key={cat}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 mb-3">
                {cat}
              </h2>
              <div className="space-y-2">
                {items.map((d) => {
                  const open = openId === d.id;
                  const Icon = d.icon;
                  return (
                    <div
                      key={d.id}
                      className="rounded-xl border border-border/60 bg-card overflow-hidden transition hover:border-border"
                    >
                      <button
                        onClick={() => setOpenId(open ? null : d.id)}
                        className="w-full flex items-start gap-3 px-5 py-4 text-left"
                      >
                        <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-sm">{d.title}</span>
                            {d.badges?.map((b) => <OpsBadge key={b} kind={b} />)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.summary}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition ${open ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border/40">
                              {d.body.map((sec, i) => (
                                <div key={i}>
                                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{sec.heading}</h3>
                                  {sec.text && <p className="text-sm text-foreground/90 leading-relaxed">{sec.text}</p>}
                                  {sec.bullets && (
                                    <ul className="text-sm text-foreground/90 space-y-1 list-disc list-inside marker:text-muted-foreground/60">
                                      {sec.bullets.map((b, j) => <li key={j}>{b}</li>)}
                                    </ul>
                                  )}
                                  {sec.code && (
                                    <pre className="mt-2 rounded-md bg-muted/50 border border-border/40 p-3 text-xs overflow-x-auto"><code>{sec.code}</code></pre>
                                  )}
                                </div>
                              ))}
                              {d.related?.length ? (
                                <div className="pt-2 border-t border-border/30">
                                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Related surfaces</div>
                                  <div className="flex flex-wrap gap-2">
                                    {d.related.map((r) => (
                                      <OperatorLink
                                        key={r.href}
                                        to={r.href}
                                        showExternalHint
                                        className="group text-xs px-2.5 py-1 rounded-md border border-border/60 hover:border-primary/40 hover:text-primary"
                                      >
                                        {r.label}
                                      </OperatorLink>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
