import { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw, Coffee, Flame, Clock, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { toast } from "sonner";

/**
 * Pomodoro + Freelancer Workspace Widgets — pure-client widgets:
 *   - Focus timer (25/5 default, configurable)
 *   - Project hour tracker (per session)
 *   - Daily earning tracker (rate × tracked hours)
 *   - Session-based invoice tracker
 */

const tickAudio = (() => {
  if (typeof window === "undefined") return null;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.06;
      o.start(); o.stop(ctx.currentTime + 0.18);
    };
  } catch { return null; }
})();

export default function PomodoroWidget() {
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [pomos, setPomos] = useState(0);
  const [trackedSecs, setTrackedSecs] = useState(0);
  const [rate, setRate] = useState(1500);
  const intervalRef = useRef<number | null>(null);

  // reset displayed seconds when the duration setting changes (and we're idle)
  useEffect(() => { if (!running) setSecs((phase === "focus" ? focusMin : breakMin) * 60); }, [focusMin, breakMin, phase, running]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          // phase complete
          if (phase === "focus") {
            setPomos((p) => p + 1);
            setTrackedSecs((t) => t + focusMin * 60);
            setPhase("break");
            tickAudio?.();
            toast.success("Focus done — take a break ☕");
            return breakMin * 60;
          } else {
            setPhase("focus");
            tickAudio?.();
            toast.success("Break over — back to focus 🔥");
            return focusMin * 60;
          }
        }
        return s - 1;
      });
    }, 1000) as unknown as number;
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running, phase, focusMin, breakMin]);

  const reset = () => { setRunning(false); setPhase("focus"); setSecs(focusMin * 60); };
  const total = (phase === "focus" ? focusMin : breakMin) * 60;
  const pct = ((total - secs) / total) * 100;
  const trackedH = trackedSecs / 3600;
  const earnings = trackedH * rate;
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <ToolPageLayout
      title="Pomodoro · Workspace Widgets"
      subtitle="Focus timer + hour & earnings tracker. Sit on top of any client work."
      icon={Timer}
      path="/tools/pomodoro"
      accent="from-orange-500 to-rose-600"
      back={{ href: "/tools", label: "All tools" }}
    >
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-6 lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/10">
                {phase === "focus" ? <><Flame className="w-3 h-3" /> Focus</> : <><Coffee className="w-3 h-3" /> Break</>}
              </span>
              <span className="text-xs text-white/60">{pomos} pomos done</span>
            </div>
            <div className="text-7xl font-bold tabular-nums tracking-tight my-3 text-center">{mm}:{ss}</div>
            <Progress value={pct} className="h-1.5 bg-white/10" />
            <div className="flex items-center justify-center gap-2 mt-5">
              <Button onClick={() => setRunning(r => !r)} className="bg-white text-slate-900 hover:bg-white/90">
                {running ? <><Pause className="w-4 h-4 mr-1" /> Pause</> : <><Play className="w-4 h-4 mr-1" /> Start</>}
              </Button>
              <Button variant="outline" onClick={reset} className="bg-transparent border-white/20 text-white hover:bg-white/10">
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div>
            <Label className="text-xs">Focus duration (min)</Label>
            <Input type="number" value={focusMin} min={5} max={120} onChange={(e) => setFocusMin(Number(e.target.value) || 25)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Break duration (min)</Label>
            <Input type="number" value={breakMin} min={1} max={60} onChange={(e) => setBreakMin(Number(e.target.value) || 5)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Hourly rate (₹)</Label>
            <Input type="number" value={rate} min={0} onChange={(e) => setRate(Number(e.target.value) || 0)} className="mt-1" />
          </div>
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        <Stat icon={Clock} label="Hours tracked today" value={`${trackedH.toFixed(2)} h`} accent="from-sky-500 to-indigo-500" />
        <Stat icon={Receipt} label="Today's earnings" value={`₹${Math.round(earnings).toLocaleString()}`} accent="from-emerald-500 to-teal-500" />
        <Stat icon={Flame} label="Pomodoros done" value={`${pomos}`} accent="from-orange-500 to-rose-500" />
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Tip: tracked hours & earnings reset on refresh. To save them automatically, use the
        <a className="text-emerald-700 hover:underline ml-1" href="/work/time">Time Tracker</a> in your dashboard.
      </p>
    </ToolPageLayout>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="text-xl font-bold text-slate-900">{value}</div>
        </div>
      </div>
    </Card>
  );
}