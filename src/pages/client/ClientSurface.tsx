import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Globe, FolderOpen, MessageSquare, AlarmClock, Receipt, FileText,
  PlusCircle, ArrowLeft, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { SEO } from "@/components/SEO";

/**
 * /client — the dedicated "client world".
 *
 * This is intentionally OUTSIDE the main AppShell. It has its own
 * minimal collaboration-focused chrome so it feels like a standalone
 * SaaS product, not "another dashboard module".
 *
 * For now we stub the data layer with a tiny in-memory list of recent
 * portals. Real data is wired through /portal/:token (existing).
 */

const NAV = [
  { label: "Overview",    icon: Globe,        to: "/client" },
  { label: "Files",       icon: FolderOpen,   to: "/client?tab=files" },
  { label: "Messages",    icon: MessageSquare,to: "/client?tab=messages" },
  { label: "Deadlines",   icon: AlarmClock,   to: "/client?tab=deadlines" },
  { label: "Invoices",    icon: Receipt,      to: "/client?tab=invoices" },
  { label: "Documents",   icon: FileText,     to: "/client?tab=documents" },
];

function ClientSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to workspace
        </Link>
        <p className="font-display font-semibold text-sm text-foreground mt-2">Client world</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Engagement</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((n) => (
                <SidebarMenuItem key={n.label}>
                  <SidebarMenuButton asChild>
                    <Link to={n.to} className="flex items-center gap-2">
                      <n.icon className="w-4 h-4" /> <span>{n.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3 text-[10px] text-muted-foreground">
        Collaboration · powered by HustleAI
      </SidebarFooter>
    </Sidebar>
  );
}

export default function ClientSurface() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  return (
    <SidebarProvider>
      <SEO title="Client portals · HustleAI" description="A standalone collaboration surface for every client engagement." path="/client" noindex />
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <ClientSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Minimal external-facing top bar — purposefully lighter than AppShell */}
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center px-4 gap-3">
            <SidebarTrigger className="text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="font-display font-semibold text-sm text-foreground">Client portals</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search portals…"
                  className="h-8 pl-8 w-56 text-xs"
                />
              </div>
              <Button size="sm" className="h-8" onClick={() => navigate("/work/portals")}>
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> New portal
              </Button>
            </div>
          </header>

          <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-primary">Client surface</p>
              <h1 className="font-display font-semibold text-2xl sm:text-3xl text-foreground mt-1">A focused world for your clients</h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                Each engagement gets a clean, branded space — files, deadlines, invoices and documents in one
                link your client can open. No clutter, no operator-side noise.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: FolderOpen, title: "Files & deliveries", desc: "Versioned uploads with a final flag." },
                { icon: AlarmClock, title: "Upcoming",            desc: "Color-coded deadlines and milestones." },
                { icon: Receipt,    title: "Invoices",            desc: "What was billed, what was paid." },
                { icon: FileText,   title: "Documents",           desc: "Proposals, contracts and briefs." },
                { icon: MessageSquare, title: "Messages",         desc: "Async updates threaded by week." },
                { icon: Globe,      title: "Public link",         desc: "One URL the client opens. No login." },
              ].map((b) => (
                <Card key={b.title} className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <b.icon className="w-4 h-4" />
                    </span>
                    <p className="font-semibold text-sm text-foreground">{b.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.desc}</p>
                </Card>
              ))}
            </div>

            <Card className="p-5 border-border bg-muted/30">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Get started</p>
              <p className="font-display font-semibold text-base text-foreground mt-1">Open the portals manager</p>
              <p className="text-xs text-muted-foreground mt-1">
                Manage portal links, share with clients and revoke access — all from one screen.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => navigate("/work/portals")}>Manage portals</Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/client-portal-software")}>
                  Learn more
                </Button>
              </div>
            </Card>
          </main>

          <footer className="border-t border-border py-3 text-center text-[10px] text-muted-foreground">
            HustleAI · client surface
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}