import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Explore", href: "/explore" },
  { label: "Community", href: "/community" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Relax", href: "/relax" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Blog", href: "/blog" },
  {
    label: "More",
    children: [
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
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      scrolled ? "glass border-b border-border/50 shadow-card" : "bg-transparent"
    }`}>
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <Zap className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-display font-bold text-xl">HustleAI</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) =>
            l.children ? (
              <div key={l.label} className="relative"
                onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  {l.label} <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                </Button>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full right-0 mt-1 w-48 glass rounded-xl border border-border/50 p-2 shadow-card"
                    >
                      {l.children.map((child) => (
                        <button key={child.href}
                          onClick={() => { navigate(child.href); setMoreOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive(child.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}>
                          {child.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Button key={l.href} variant="ghost" size="sm"
                onClick={() => navigate(l.href!)}
                className={`transition-all ${isActive(l.href!) ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
                {l.label}
              </Button>
            )
          )}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/saved-hustles")}
                className={isActive("/saved-hustles") ? "text-primary bg-primary/10" : ""}>
                My Hustles
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}
                className={isActive("/profile") ? "text-primary bg-primary/10" : ""}>
                <User className="w-4 h-4 mr-1" /> Profile
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}
                className={isActive("/dashboard") ? "text-primary bg-primary/10" : ""}>
                Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}
                className="border-destructive/30 text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}
                className={isActive("/login") ? "text-primary" : ""}>Login</Button>
              <Button size="sm" className="bg-gradient-primary text-primary-foreground btn-press" onClick={() => navigate("/signup")}>
                Get Started <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground p-1" onClick={() => setMobileOpen(!mobileOpen)}>
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
                      onClick={() => navigate(child.href)}>
                      {child.label}
                    </Button>
                  ))
                ) : (
                  <Button key={l.href} variant="ghost" className={`w-full justify-start ${isActive(l.href!) ? "text-primary bg-primary/10" : ""}`}
                    onClick={() => navigate(l.href!)}>
                    {l.label}
                  </Button>
                )
              )}
              <div className="border-t border-border/50 pt-2 mt-2 space-y-1">
                {user ? (
                  <>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/saved-hustles")}>My Hustles</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/profile")}>Profile</Button>
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
