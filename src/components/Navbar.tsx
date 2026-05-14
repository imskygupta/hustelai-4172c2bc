import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Menu, X, LogOut, User, ChevronDown, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isAppShellRoute } from "@/components/app-shell-routes";
import { NotificationCenter } from "@/components/NotificationCenter";

const navLinks = [
  { label: "Platform", href: "/platform" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Workspace", href: "/workspaces" },
  { label: "Free tools", href: "/tools" },
  { label: "Pricing", href: "/pricing" },
  {
    label: "More",
    children: [
      { label: "Trust & security", href: "/trust" },
      { label: "Integrations", href: "/integrations" },
      { label: "Explore guides", href: "/explore" },
      { label: "Blog", href: "/blog" },
      { label: "API Docs", href: "https://docs.hustlaiapp.in", external: true },
      { label: "Compare plans", href: "/plans" },
      { label: "About", href: "/about" },
      { label: "Company", href: "/company" },
      { label: "Careers", href: "/career" },
      { label: "Affiliates", href: "/affiliates" },
      { label: "Reviews", href: "/reviews" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Hide the marketing navbar on in-app SaaS-shell routes — the sidebar +
  // topbar in AppShell replaces it. Cannot be overridden by individual pages.
  if (isAppShellRoute(pathname)) return null;
  // Free-tool pages (/tools/*, but NOT the /tools hub) wear the
  // dashboard-mirage shell which has its own top bar — suppress this one.
  if (pathname.startsWith("/tools/")) return null;
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkAdminRole = async () => {
      if (!user) {
        if (mounted) setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (mounted) setIsAdmin(!error && !!data);
    };

    void checkAdminRole();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  const isActive = (href: string) => location.pathname === href;
  const isHome = location.pathname === "/";

  return (
    <nav className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
      isHome
        ? scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-slate-200/70 shadow-sm"
          : "bg-white/70 backdrop-blur-md md:bg-transparent md:backdrop-blur-none border-b border-slate-200/50 md:border-transparent"
        : scrolled
          ? "glass border-b border-border/50 shadow-card"
          : "bg-background/70 backdrop-blur-md md:bg-transparent md:backdrop-blur-none border-b border-border/40 md:border-transparent"
    }`}>
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <Zap className={`w-6 h-6 group-hover:scale-110 transition-transform ${isHome ? "text-emerald-600" : "text-primary"}`} />
          <span className={`font-display font-bold text-xl ${isHome ? "text-slate-900" : ""}`}>HustleAI</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) =>
            l.children ? (
              <div key={l.label} className="relative"
                onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
                <Button variant="ghost" size="sm" className={isHome ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-muted-foreground hover:text-foreground"}>
                  {l.label} <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                </Button>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className={`absolute top-full right-0 mt-1 w-48 rounded-xl p-2 ${
                        isHome
                          ? "bg-white border border-slate-200 shadow-lg"
                          : "glass border border-border/50 shadow-card"
                      }`}
                    >
                      {l.children.map((child) => (
                        <button key={child.href}
                          onClick={() => {
                            setMoreOpen(false);
                            if ((child as any).external) {
                              window.location.href = child.href;
                            } else {
                              navigate(child.href);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive(child.href)
                              ? isHome ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"
                              : isHome ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}>
                          {child.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                key={l.href}
                onClick={() => {
                  if ((l as any).external) window.location.href = l.href!;
                  else navigate(l.href!);
                }}
                className={`group relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive(l.href!)
                    ? isHome ? "text-emerald-700" : "text-primary"
                    : isHome ? "text-slate-600 hover:text-slate-900" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative z-10">{l.label}</span>
                <span
                  className={`absolute left-2 right-2 -bottom-0.5 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ${
                    isHome ? "bg-emerald-500" : "bg-primary"
                  } ${isActive(l.href!) ? "scale-x-100" : ""}`}
                />
                <span className={`absolute inset-0 rounded-md scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ${
                  isHome ? "bg-emerald-50/70" : "bg-secondary/40"
                }`} />
              </button>
            )
          )}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="secondary" size="sm" onClick={() => navigate("/admin-dashboard")}
                  className={isActive("/admin-dashboard") ? "bg-primary/10 text-primary" : ""}>
                  <Shield className="w-4 h-4 mr-1" /> Admin Panel
                </Button>
              )}
              <NotificationCenter />
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}
                className={isHome ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : ""}>
                Dashboard
              </Button>
              <Button size="sm"
                className={isHome ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-gradient-primary text-primary-foreground"}
                onClick={() => navigate("/profile")}>
                <User className="w-4 h-4 mr-1" /> Profile
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}
                className={isHome ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : ""}>Login</Button>
              <Button size="sm"
                className={`btn-press ${isHome ? "bg-slate-900 hover:bg-slate-800 text-white" : "bg-gradient-primary text-primary-foreground"}`}
                onClick={() => navigate("/signup")}>
                Get Started <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className={`md:hidden p-1 ${isHome ? "text-slate-900" : "text-foreground"}`} onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden glass border-t border-border/50 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((l) =>
                l.children ? (
                  l.children.map((child) => (
                    <Button key={child.href} variant="ghost" className={`w-full justify-start ${isActive(child.href) ? "text-primary bg-primary/10" : ""}`}
                      onClick={() => {
                        if ((child as any).external) window.location.href = child.href;
                        else navigate(child.href);
                      }}>
                      {child.label}
                    </Button>
                  ))
                ) : (
                  <Button key={l.href} variant="ghost" className={`w-full justify-start ${isActive(l.href!) ? "text-primary bg-primary/10" : ""}`}
                    onClick={() => {
                      if ((l as any).external) window.location.href = l.href!;
                      else navigate(l.href!);
                    }}>
                    {l.label}
                  </Button>
                )
              )}
              <div className="border-t border-border/50 pt-2 mt-2 space-y-1">
                {user ? (
                  <>
                    {isAdmin && (
                      <Button variant="secondary" className="w-full justify-start" onClick={() => navigate("/admin-dashboard")}>
                        <Shield className="w-4 h-4 mr-1" /> Admin Panel
                      </Button>
                    )}
                    <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/saved")}>Saved guides</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/profile")}>Profile</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/settings/profile")}>Settings</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                    <Button variant="outline" className="w-full border-destructive/30 text-destructive" onClick={() => { signOut(); navigate("/"); }}>
                      <LogOut className="w-4 h-4 mr-1" /> Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/login")}>Login</Button>
                    <Button className="w-full bg-gradient-primary text-primary-foreground" onClick={() => navigate("/signup")}>Get Started</Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
