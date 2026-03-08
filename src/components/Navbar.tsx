import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Menu, X, LogOut, Users, User } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Explore", href: "/explore" },
  { label: "Community", href: "/community" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Reviews", href: "/reviews" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          <span className="font-display font-bold text-xl">HustleAI</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Button key={l.href} variant="ghost" size="sm" onClick={() => navigate(l.href)}>
              {l.label}
            </Button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/saved-hustles")}>
                My Hustles
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                <User className="w-4 h-4 mr-1" /> Profile
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Login</Button>
              <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/signup")}>
                Get Started <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden glass border-t border-border/50 px-4 py-4 space-y-2">
          {navLinks.map((l) => (
            <Button key={l.href} variant="ghost" className="w-full justify-start" onClick={() => { navigate(l.href); setMobileOpen(false); }}>
              {l.label}
            </Button>
          ))}
          <div className="border-t border-border/50 pt-2 space-y-2">
            {user ? (
              <>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/profile"); setMobileOpen(false); }}>Profile</Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/dashboard"); setMobileOpen(false); }}>Dashboard</Button>
                <Button variant="outline" className="w-full" onClick={() => { signOut(); navigate("/"); setMobileOpen(false); }}>
                  <LogOut className="w-4 h-4 mr-1" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/login"); setMobileOpen(false); }}>Login</Button>
                <Button className="w-full bg-gradient-primary text-primary-foreground" onClick={() => { navigate("/signup"); setMobileOpen(false); }}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
