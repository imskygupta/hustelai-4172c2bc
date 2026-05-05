import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Bell, Copy, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { WORK_TOOLS } from "@/lib/work-tools";
import { WORK_SETUP_SQL } from "@/lib/work-sql";
import { useFeatureFlags, flagAccess, type Tier } from "@/lib/feature-flags";
import { track } from "@/lib/analytics";
import { InvoicesTab } from "@/components/work/InvoicesTab";
import { ChecklistsTab } from "@/components/work/ChecklistsTab";
import { DailyTab } from "@/components/work/DailyTab";
import { TimeTab } from "@/components/work/TimeTab";
import { ClientsTab } from "@/components/work/ClientsTab";
import { FilesTab } from "@/components/work/FilesTab";
import { NotesTab } from "@/components/work/NotesTab";
import { ExpensesTab } from "@/components/work/ExpensesTab";
import { CommTab } from "@/components/work/CommTab";
import { DeadlinesTab } from "@/components/work/DeadlinesTab";
import { AnalyticsTab } from "@/components/work/AnalyticsTab";
import { PortalsTab } from "@/components/work/PortalsTab";

export default function WorkTool() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const tool = WORK_TOOLS.find(t => t.slug === slug);
  const [missing, setMissing] = useState(false);
  const { byKey, loading: flagsLoading } = useFeatureFlags();
  const flag = byKey(`work.${slug}`);
  const tier = (profile?.subscription_tier || "free") as Tier;
  const acc = flagAccess(flag, tier);

  useEffect(() => {
    if (!slug) return;
    if (acc.locked) {
      track("locked_feature_clicked", { feature: slug, reason: acc.reason });
    } else {
      track("tool_opened", { tool: slug });
    }
  }, [slug, acc.locked, acc.reason]);

  if (!tool) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-slate-600">Unknown tool.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/work")}><ArrowLeft className="w-4 h-4 mr-1" /> Back to Work</Button>
        </div>
      </div>
    );
  }

  const onMissing = () => setMissing(true);
  const onReady = () => setMissing(false);

  if (!flagsLoading && acc.locked) {
    const isTier = acc.reason === "tier";
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate("/work")} className="text-slate-600 mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Work
          </Button>
          <Card className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{tool.label}</h1>
            <p className="text-sm text-slate-600 mt-2">
              {isTier
                ? `This tool is available on the ${flag?.min_tier?.toUpperCase()} plan and above.`
                : "Coming soon — we're polishing this tool. Check back shortly."}
            </p>
            {isTier && (
              <Button className="mt-5" onClick={() => navigate("/plans")}>Upgrade plan</Button>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const Body = () => {
    switch (slug) {
      case "invoices":   return <InvoicesTab userId={user?.id} onMissing={onMissing} onReady={onReady} />;
      case "checklists": return <ChecklistsTab userId={user?.id} onMissing={onMissing} onReady={onReady} />;
      case "daily":      return <DailyTab userId={user?.id} onMissing={onMissing} onReady={onReady} />;
      case "time":       return <TimeTab userId={user?.id} />;
      case "clients":    return <ClientsTab userId={user?.id} />;
      case "files":      return <FilesTab userId={user?.id} />;
      case "notes":      return <NotesTab userId={user?.id} />;
      case "expenses":   return <ExpensesTab userId={user?.id} />;
      case "comm":       return <CommTab userId={user?.id} />;
      case "deadlines":  return <DeadlinesTab userId={user?.id} />;
      case "analytics":  return <AnalyticsTab userId={user?.id} />;
      case "portals":    return <PortalsTab userId={user?.id} />;
      default: return null;
    }
  };

  const Icon = tool.icon;
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/work")} className="text-slate-600">
            <ArrowLeft className="w-4 h-4 mr-1" /> Work
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${tool.tone}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">{tool.label}</h1>
            <p className="text-xs text-slate-500">{tool.desc}</p>
          </div>
        </div>

        {missing && (
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-2 mb-2">
              <Bell className="w-4 h-4 text-amber-700 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-amber-900">One-time setup needed</div>
                <div className="text-xs text-amber-800 mt-1">An admin needs to run the Workspace Core SQL block once. Until then, this tool can't load data.</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(WORK_SETUP_SQL); toast.success("SQL copied"); }}>
                <Copy className="w-3 h-3 mr-1" /> Copy SQL
              </Button>
            </div>
          </Card>
        )}

        <Body />
      </div>
    </div>
  );
}