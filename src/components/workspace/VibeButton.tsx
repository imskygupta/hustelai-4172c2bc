/**
 * VibeButton — a small chip that opens the Workspace Atmosphere panel.
 *
 * Lives next to "New Project" in the WorkspaceOS header. Tiny detail,
 * massive emotional effect: lets the operator pick a palette, dial
 * ambient intensity, and toggle focus / reduced-motion. Persisted via
 * useWorkspaceVibe.
 */
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Check, Moon, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { VIBE_PRESETS, useWorkspaceVibe, type VibeId } from "@/lib/workspace/vibe";

export function VibeButton() {
  const { vibe, update } = useWorkspaceVibe();
  const [open, setOpen] = useState(false);
  const active = VIBE_PRESETS.find(v => v.id === vibe.id) ?? VIBE_PRESETS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hidden md:inline-flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full bg-white/70 hover:bg-white border border-border/60 text-[12px] text-foreground/80 hover:text-foreground transition shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          aria-label="Workspace atmosphere"
        >
          <span className="flex h-6 w-6 rounded-full overflow-hidden ring-1 ring-black/10">
            <span className="flex-1" style={{ background: active.swatch[1] }} />
            <span className="flex-1" style={{ background: active.swatch[2] }} />
            <span className="flex-1" style={{ background: active.swatch[3] }} />
          </span>
          <span className="hidden lg:inline">{active.name}</span>
          <Sparkles className="h-3 w-3 text-muted-foreground/70" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="w-[340px] p-0 overflow-hidden border-border/60 shadow-2xl">
        <div className="px-4 pt-3.5 pb-2.5 border-b border-border/50 bg-gradient-to-br from-white to-muted/30">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Workspace atmosphere</p>
          <p className="text-sm text-foreground/85 mt-0.5">Make this space feel like yours.</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Palettes */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-foreground/70">Palette</p>
            <div className="grid grid-cols-3 gap-2">
              {VIBE_PRESETS.map(p => {
                const selected = vibe.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => update({ id: p.id as VibeId })}
                    className={cn(
                      "relative rounded-lg overflow-hidden border transition-all text-left group",
                      selected ? "border-foreground/60 ring-2 ring-foreground/20" : "border-border/60 hover:border-foreground/30"
                    )}
                    title={p.tagline}
                  >
                    <div className="flex h-10">
                      {p.swatch.map((c, i) => (
                        <span key={i} className="flex-1" style={{ background: c }} />
                      ))}
                    </div>
                    <div className="px-2 py-1.5 bg-white">
                      <p className="text-[11px] font-medium text-foreground truncate">{p.name}</p>
                    </div>
                    {selected && (
                      <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-foreground/70 inline-flex items-center gap-1.5">
                <Activity className="h-3 w-3" /> Ambient intensity
              </p>
              <span className="text-[11px] tabular-nums text-muted-foreground">{vibe.intensity}%</span>
            </div>
            <Slider
              value={[vibe.intensity]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => update({ intensity: v[0] ?? 50 })}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2.5 pt-1 border-t border-border/40">
            <ToggleRow
              icon={<Moon className="h-3.5 w-3.5" />}
              label="Focus mode"
              hint="Dim ambient layers, slow motion"
              checked={vibe.focus}
              onChange={(b) => update({ focus: b })}
            />
            <ToggleRow
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Reduce motion"
              hint="Disable animations and pulses"
              checked={vibe.reducedMotion}
              onChange={(b) => update({ reducedMotion: b })}
            />
          </div>

          <p className="text-[10px] text-muted-foreground pt-1">
            Saved on this device. Your AI provider tints the glow automatically.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ToggleRow({ icon, label, hint, checked, onChange }: {
  icon: React.ReactNode; label: string; hint: string; checked: boolean; onChange: (b: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <p className="text-[12px] text-foreground leading-tight">{label}</p>
          <p className="text-[10.5px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
