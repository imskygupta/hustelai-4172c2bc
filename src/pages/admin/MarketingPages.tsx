// Admin: Marketing Pages registry — ad landing pages used in paid campaigns.
// These pages are intentionally not surfaced anywhere on the public site.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Copy, Megaphone, Newspaper } from "lucide-react";
import { SEO } from "@/components/SEO";

const PAGES = [
  {
    id: "marketing-1",
    name: "Marketing Page 1",
    purpose: "Main HustleAI app — freelancer cockpit acquisition",
    audience: "Freelancers, agencies, solo operators",
    path: "/marketing-1",
    icon: Megaphone,
    accent: "from-emerald-500/20 to-violet-500/20",
  },
  {
    id: "marketing-2",
    name: "Marketing Page 2",
    purpose: "HustleAI Blogs — newsletter & playbook acquisition",
    audience: "Side-hustle searchers, blog readers",
    path: "/marketing-2",
    icon: Newspaper,
    accent: "from-amber-500/20 to-rose-500/20",
  },
];

export default function MarketingPages() {
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  const copyUrl = (path: string) => {
    const url = `${origin}${path}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied", description: url });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <SEO title="Marketing Pages — Admin" description="Ad landing page registry" path="/admin/marketing-pages" noindex />
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Marketing Pages</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dedicated landing pages for paid ad campaigns. Not linked from anywhere on the public site — only accessible via the URLs below.
          </p>
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/homepage-variants">
                Homepage Variants <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {PAGES.map((p) => {
            const Icon = p.icon;
            const url = `${origin}${p.path}`;
            return (
              <Card key={p.id} className="overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${p.accent}`} />
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${p.accent}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <Badge variant="outline" className="ml-auto text-[10px]">Hidden from nav</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.purpose}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Audience: </span>
                    <span className="font-medium">{p.audience}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Ad URL: </span>
                    <code className="font-mono text-[11px] break-all">{url}</code>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={p.path} target="_blank">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Preview
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => copyUrl(p.path)}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy URL
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How to use</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Pick the right page for your campaign — Page 1 for the main app, Page 2 for blog/newsletter growth.</p>
            <p>2. Copy the URL and paste it into your Google / Meta / X ads as the destination.</p>
            <p>3. Append UTM tags as needed — pages auto-fire the <code className="font-mono text-xs">marketing_page_viewed</code> analytics event.</p>
            <p>4. These pages set <code className="font-mono text-xs">noindex</code> so they won't appear in organic search and won't dilute your main funnel.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
