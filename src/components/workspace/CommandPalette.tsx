/**
 * WorkspaceCommandPalette — Raycast/Linear-style ⌘K quick-switcher.
 *
 * Surfaces: workspaces, recent outputs, pinned assets, and a small set of
 * navigation actions. Intentionally tiny — no fuzzy search lib, just
 * substring filter; no remote search; debounced render is unnecessary.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Briefcase, Sparkles, Star, ArrowRight, KeyRound, Layers, Map, FileText, Cpu,
  Target, Send, Megaphone, Library, Package, Plus, Zap, FileSignature, Calculator, FileEdit, Wallet, CalendarDays, ClipboardList,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace/context";
import { wp, wpProject } from "@/lib/workspace/paths";
import { usePinnedProjects, trackProjectVisit } from "@/lib/workspace/operator";
import { suggestChainFromOutput } from "@/lib/workspace/operationalChains";
import { MARKETING_SURFACES, goCrossHost } from "@/lib/workspace/surfaces";
import { useOperatorMode, OPERATOR_MODES } from "@/lib/operator-mode";
import { getPaletteTopActions } from "@/lib/workspace/persona-actions";

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Sparkles;
  group: "For you" | "Actions" | "Tools" | "Pinned" | "Continue" | "Workspaces" | "Outputs" | "Assets" | "Go to";
  run: () => void;
};

const INTENT_ACTIONS = (navigate: (p: string) => void): Item[] => [
  { id: "act-strategy",     label: "Build Client Strategy",  hint: "Blueprint · best with Claude", icon: Target,    group: "Actions", run: () => navigate(wp("blueprint")) },
  { id: "act-outreach",     label: "Create Outreach System", hint: "Canvas · best with GPT",       icon: Send,      group: "Actions", run: () => navigate(wp("canvas") + "?intent=outreach") },
  { id: "act-content",      label: "Generate Content Plan",  hint: "Canvas · best with Gemini",    icon: Megaphone, group: "Actions", run: () => navigate(wp("canvas") + "?intent=content") },
  { id: "act-research",     label: "Organize Research",      hint: "Assets",                       icon: Library,   group: "Actions", run: () => navigate(wp("assets")) },
  { id: "act-deliverables", label: "Prepare Deliverables",   hint: "Canvas · best with Claude",    icon: Package,   group: "Actions", run: () => navigate(wp("canvas") + "?intent=deliverables") },
  { id: "act-new",          label: "New Project",            hint: "Start AI intake",              icon: Plus,      group: "Actions", run: () => navigate(wp("projects/new")) },
  { id: "act-providers",    label: "Switch AI Provider",     hint: "Connect or rotate keys",       icon: Zap,       group: "Actions", run: () => navigate(wp("providers")) },
];

const NAV_ACTIONS = (navigate: (p: string) => void): Item[] => [
  { id: "nav-overview",  label: "Overview",  hint: wp(""),          icon: Briefcase, group: "Go to", run: () => navigate(wp("")) },
  { id: "nav-canvas",    label: "Canvas",    hint: wp("canvas"),    icon: Layers,    group: "Go to", run: () => navigate(wp("canvas")) },
  { id: "nav-blueprint", label: "Blueprint", hint: wp("blueprint"), icon: Map,       group: "Go to", run: () => navigate(wp("blueprint")) },
  { id: "nav-assets",    label: "Assets",    hint: wp("assets"),    icon: FileText,  group: "Go to", run: () => navigate(wp("assets")) },
  { id: "nav-clients",   label: "Clients",   hint: wp("clients"),   icon: Briefcase, group: "Go to", run: () => navigate(wp("clients")) },
  { id: "nav-providers", label: "AI Providers", hint: wp("providers"), icon: Cpu,    group: "Go to", run: () => navigate(wp("providers")) },
];

// Standalone tools elsewhere in the product — surfaced here so an operator
// can type "invoice" or "pdf" and jump straight to the right tool.
// These live on the marketing host; we hard-navigate via `goCrossHost` so a
// click from `workspace.hustlaiapp.in` doesn't fall through to `/` (dead click).
const TOOL_ACTIONS = (navigate: (p: string) => void): Item[] => [
  { id: "tool-invoice",   label: "Invoice generator",   hint: "Create + export PDF invoices", icon: FileSignature, group: "Tools", run: () => goCrossHost(navigate as any, MARKETING_SURFACES.invoiceTool) },
  { id: "tool-proposal",  label: "Proposal generator",  hint: "Branded client proposals",     icon: FileEdit,      group: "Tools", run: () => goCrossHost(navigate as any, MARKETING_SURFACES.proposalTool) },
  { id: "tool-contract",  label: "Contract generator",  hint: "Draft service agreements",     icon: FileText,      group: "Tools", run: () => goCrossHost(navigate as any, MARKETING_SURFACES.contractTool) },
  { id: "tool-pricing",   label: "Pricing calculator",  hint: "Quote your work fast",         icon: Calculator,    group: "Tools", run: () => goCrossHost(navigate as any, MARKETING_SURFACES.pricingTool) },
  { id: "tool-calendar",  label: "Content calendar",    hint: "Plan posts + drops",           icon: CalendarDays,  group: "Tools", run: () => goCrossHost(navigate as any, MARKETING_SURFACES.calendarTool) },
  { id: "tool-onboard",   label: "Onboarding form",     hint: "Build client intake forms",    icon: ClipboardList, group: "Tools", run: () => goCrossHost(navigate as any, MARKETING_SURFACES.onboardingTool) },
  { id: "tool-portfolio", label: "Portfolio bio",       hint: "One-page personal site",       icon: Star,          group: "Tools", run: () => goCrossHost(navigate as any, MARKETING_SURFACES.portfolioTool) },
  { id: "tool-card",      label: "Business card",       hint: "Generate + download card",     icon: Layers,        group: "Tools", run: () => goCrossHost(navigate as any, MARKETING_SURFACES.businessCard) },
  { id: "tool-wallet",    label: "Wallet",              hint: "Credits + billing",            icon: Wallet,        group: "Tools", run: () => goCrossHost(navigate as any, MARKETING_SURFACES.wallet) },
];

export function WorkspaceCommandPalette() {
  const { user } = useAuth();
  const { setActiveProject } = useWorkspace();
  const { pinned } = usePinnedProjects();
  const { mode } = useOperatorMode();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [outputs, setOutputs] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  // Hotkey: ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const onCustom = () => setOpen(o => !o);
    window.addEventListener("ws-cmdk-toggle", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ws-cmdk-toggle", onCustom);
    };
  }, []);

  // Lazy load when opened
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [ws, recent, pinned] = await Promise.all([
        (supabase as any).from("workspaces").select("id,client_name,status").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(15),
        (supabase as any).from("workspace_outputs").select("id,tool,title,project_id").eq("user_id", user.id).eq("is_asset", false).order("created_at", { ascending: false }).limit(15),
        (supabase as any).from("workspace_outputs").select("id,tool,title,asset_kind,project_id").eq("user_id", user.id).eq("is_asset", true).order("created_at", { ascending: false }).limit(15),
      ]);
      setWorkspaces(ws.data || []);
      setOutputs(recent.data || []);
      setAssets(pinned.data || []);
    })();
  }, [open, user]);

  const close = useCallback(() => { setOpen(false); setQ(""); }, []);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];

    // 1. Persona top actions — re-ranked by operator mode. Same backend,
    //    feels like a different product per persona. Surfaces FIRST so the
    //    most relevant verbs are one keystroke away.
    const personaLabel = mode ? (OPERATOR_MODES.find(m => m.id === mode)?.label || "") : "";
    for (const a of getPaletteTopActions(mode)) {
      out.push({
        id: a.id,
        label: a.label,
        hint: personaLabel ? `${personaLabel} · ${a.hint}` : a.hint,
        icon: Sparkles,
        group: "For you",
        run: () => {
          if (a.crossHost) goCrossHost(navigate, a.href);
          else navigate(a.href);
          close();
        },
      });
    }

    out.push(...INTENT_ACTIONS(navigate).map(it => ({ ...it, run: () => { it.run(); close(); } })));
    out.push(...TOOL_ACTIONS(navigate).map(it => ({ ...it, run: () => { it.run(); close(); } })));

    // Continue chains — derived from the most-recent output per project.
    // Surfaces the natural "next move" for the operator's last 4 generations.
    const seenProjects = new Set<string>();
    const latestPerProject = outputs.filter((o: any) => {
      if (!o.project_id || seenProjects.has(o.project_id)) return false;
      seenProjects.add(o.project_id);
      return true;
    }).slice(0, 4);
    const projectName = (pid: string) => workspaces.find(w => w.id === pid)?.client_name || "Project";
    for (const latest of latestPerProject) {
      const steps = suggestChainFromOutput(latest as any, []);
      const step = steps[0];
      if (!step) continue;
      out.push({
        id: `chain-${latest.id}`,
        label: step.label,
        hint: `Continue · ${projectName(latest.project_id)}`,
        icon: step.icon as any,
        group: "Continue",
        run: () => {
          setActiveProject(latest.project_id);
          trackProjectVisit(latest.project_id);
          navigate(`${wpProject(latest.project_id)}/${step.href}?intent=${encodeURIComponent(step.intent)}`);
          close();
        },
      });
    }

    // Pinned projects — surfaced first for instant jump
    const pinnedSet = new Set(pinned);
    const pinnedWs = workspaces.filter(w => pinnedSet.has(w.id));
    for (const w of pinnedWs) {
      out.push({
        id: `p-${w.id}`,
        label: w.client_name,
        hint: `Pinned · ${w.status}`,
        icon: Star,
        group: "Pinned",
        run: () => { setActiveProject(w.id); trackProjectVisit(w.id); navigate(wpProject(w.id)); close(); },
      });
    }
    for (const w of workspaces) {
      if (pinnedSet.has(w.id)) continue;
      out.push({
        id: `w-${w.id}`,
        label: w.client_name,
        hint: `Workspace · ${w.status}`,
        icon: Briefcase,
        group: "Workspaces",
        run: () => { setActiveProject(w.id); trackProjectVisit(w.id); navigate(wpProject(w.id)); close(); },
      });
    }
    for (const o of outputs) {
      out.push({
        id: `o-${o.id}`,
        label: o.title,
        hint: o.tool,
        icon: Sparkles,
        group: "Outputs",
        run: () => { if (o.project_id) { setActiveProject(o.project_id); trackProjectVisit(o.project_id); } navigate(wp("canvas")); close(); },
      });
    }
    for (const a of assets) {
      out.push({
        id: `a-${a.id}`,
        label: a.title,
        hint: a.asset_kind || "asset",
        icon: Star,
        group: "Assets",
        run: () => { if (a.project_id) { setActiveProject(a.project_id); trackProjectVisit(a.project_id); } navigate(wp("canvas")); close(); },
      });
    }
    out.push(...NAV_ACTIONS(navigate).map(it => ({ ...it, run: () => { it.run(); close(); } })));
    if (!q.trim()) return out.slice(0, 30);
    const needle = q.toLowerCase();
    return out.filter(i => i.label.toLowerCase().includes(needle) || (i.hint || "").toLowerCase().includes(needle)).slice(0, 30);
  }, [workspaces, outputs, assets, pinned, q, navigate, setActiveProject, close, mode]);

  // Group for render
  const grouped = useMemo(() => {
    const g: Record<string, Item[]> = {};
    for (const it of items) (g[it.group] ||= []).push(it);
    return g;
  }, [items]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-start justify-center sm:pt-[12vh] sm:px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={close} />
      <div
        className="
          relative w-full sm:max-w-xl
          rounded-t-2xl sm:rounded-2xl
          border-t sm:border border-border/70 bg-background
          shadow-2xl shadow-black/30 overflow-hidden ws-handoff-enter
          max-h-[92dvh] sm:max-h-none
          pb-[env(safe-area-inset-bottom)] sm:pb-0
        "
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search workspaces, outputs, assets…"
            className="flex-1 bg-transparent outline-none text-base sm:text-sm placeholder:text-muted-foreground min-w-0"
          />
          <button
            type="button"
            onClick={close}
            className="sm:hidden text-[11px] text-muted-foreground px-2 py-1 rounded-md hover:bg-muted/60"
            aria-label="Close"
          >
            Close
          </button>
          <kbd className="hidden sm:inline-flex text-[10px] uppercase tracking-wider text-muted-foreground/70 border border-border/60 rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="max-h-[70dvh] sm:max-h-[60vh] overflow-y-auto overscroll-contain py-2">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No matches.</div>
          ) : (
            Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="mb-1">
                <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">{group}</div>
                {list.map(it => (
                  <button
                    key={it.id}
                    onClick={it.run}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 sm:py-2 active:bg-muted/70 hover:bg-muted/60 group min-h-[44px]"
                  >
                    <div className="h-8 w-8 sm:h-7 sm:w-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                      <it.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{it.label}</p>
                      {it.hint && <p className="text-[11px] text-muted-foreground truncate">{it.hint}</p>}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="hidden sm:flex border-t border-border/50 px-4 py-2 items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground/60">
          <span>Workspace quick switch</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="border border-border/60 rounded px-1 py-px">⌘</kbd>
            <kbd className="border border-border/60 rounded px-1 py-px">K</kbd>
            to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
