/**
 * Compact topbar project switcher.
 *
 * Always-visible pill showing the active project + a dropdown with pinned,
 * recent, and a hint to use ⌘K for full search. Keeps movement between
 * many active operations effectively frictionless.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, ChevronDown, Star, Pin, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace/context";
import { useRecentProjects, usePinnedProjects, trackProjectVisit } from "@/lib/workspace/operator";
import { wp, wpProject } from "@/lib/workspace/paths";

export function ProjectSwitcher() {
  const { activeProjectId, setActiveProject } = useWorkspace();
  const { items: recents } = useRecentProjects(10);
  const { pinned, toggle, isPinned } = usePinnedProjects();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const active = useMemo(() => recents.find(r => r.id === activeProjectId), [recents, activeProjectId]);
  const pinnedItems = useMemo(() => recents.filter(r => pinned.includes(r.id)), [recents, pinned]);
  const recentItems = useMemo(() => recents.filter(r => !pinned.includes(r.id)).slice(0, 6), [recents, pinned]);

  const jump = (id: string) => {
    setActiveProject(id);
    trackProjectVisit(id);
    navigate(wpProject(id));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="hidden md:inline-flex items-center gap-2 h-9 pl-2.5 pr-2 rounded-full bg-white/70 hover:bg-white border border-border/60 text-[12px] text-foreground/85 transition shadow-[0_1px_2px_rgba(0,0,0,0.03)] max-w-[220px]"
        aria-label="Switch project"
      >
        <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate">
          {active ? active.client_name : "Switch project"}
        </span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-80 rounded-xl border border-border/70 bg-background shadow-2xl shadow-black/20 overflow-hidden z-40 ws-handoff-enter">
            <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Switch project</span>
              <button
                onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("ws-cmdk-toggle")); }}
                className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> ⌘K
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto py-1">
              {pinnedItems.length > 0 && (
                <Group label="Pinned">
                  {pinnedItems.map(p => (
                    <Row
                      key={p.id}
                      active={p.id === activeProjectId}
                      pinned
                      onPin={() => toggle(p.id)}
                      onClick={() => jump(p.id)}
                      name={p.client_name}
                      hint={(p.status || "—").replace(/_/g, " ")}
                    />
                  ))}
                </Group>
              )}
              <Group label="Recent">
                {recentItems.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground">No recent projects yet.</p>
                ) : recentItems.map(p => (
                  <Row
                    key={p.id}
                    active={p.id === activeProjectId}
                    pinned={false}
                    onPin={() => toggle(p.id)}
                    onClick={() => jump(p.id)}
                    name={p.client_name}
                    hint={(p.status || "—").replace(/_/g, " ")}
                  />
                ))}
              </Group>
              <div className="border-t border-border/40 mt-1">
                <button
                  onClick={() => { setOpen(false); navigate(wp("pipeline")); }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40"
                >
                  <span>See all projects</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">{label}</div>
      {children}
    </div>
  );
}

function Row({ name, hint, active, pinned, onPin, onClick }: {
  name: string; hint: string; active: boolean; pinned: boolean; onPin: () => void; onClick: () => void;
}) {
  return (
    <div className={cn(
      "group flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer",
      active && "bg-muted/40",
    )} onClick={onClick}>
      <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">{name}</p>
        <p className="text-[10px] capitalize text-muted-foreground/70 truncate">{hint}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onPin(); }}
        className={cn(
          "h-6 w-6 rounded-md flex items-center justify-center transition",
          pinned ? "text-amber-500 opacity-100" : "text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:text-foreground",
        )}
        aria-label={pinned ? "Unpin" : "Pin"}
      >
        {pinned ? <Star className="h-3.5 w-3.5 fill-amber-500" /> : <Pin className="h-3 w-3" />}
      </button>
    </div>
  );
}