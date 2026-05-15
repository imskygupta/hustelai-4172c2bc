import { useState, useRef, useCallback, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Music, Sparkles, Lock, Volume2, VolumeX, Headphones, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const NOTES = [
  { note: "C4", freq: 261.63, label: "C", black: false },
  { note: "C#4", freq: 277.18, label: "C#", black: true },
  { note: "D4", freq: 293.66, label: "D", black: false },
  { note: "D#4", freq: 311.13, label: "D#", black: true },
  { note: "E4", freq: 329.63, label: "E", black: false },
  { note: "F4", freq: 349.23, label: "F", black: false },
  { note: "F#4", freq: 369.99, label: "F#", black: true },
  { note: "G4", freq: 392.0, label: "G", black: false },
  { note: "G#4", freq: 415.3, label: "G#", black: true },
  { note: "A4", freq: 440.0, label: "A", black: false },
  { note: "A#4", freq: 466.16, label: "A#", black: true },
  { note: "B4", freq: 493.88, label: "B", black: false },
  { note: "C5", freq: 523.25, label: "C", black: false },
  { note: "C#5", freq: 554.37, label: "C#", black: true },
  { note: "D5", freq: 587.33, label: "D", black: false },
  { note: "D#5", freq: 622.25, label: "D#", black: true },
  { note: "E5", freq: 659.25, label: "E", black: false },
  { note: "F5", freq: 698.46, label: "F", black: false },
  { note: "F#5", freq: 739.99, label: "F#", black: true },
  { note: "G5", freq: 783.99, label: "G", black: false },
  { note: "G#5", freq: 830.61, label: "G#", black: true },
  { note: "A5", freq: 880.0, label: "A", black: false },
  { note: "A#5", freq: 932.33, label: "A#", black: true },
  { note: "B5", freq: 987.77, label: "B", black: false },
];

interface Preset {
  name: string;
  emoji: string;
  bpm: number;
  sequence: number[][]; // array of step arrays, each step has indices into NOTES
}

const PRESETS: Preset[] = [
  {
    name: "Golden Hour",
    emoji: "🌅",
    bpm: 68,
    sequence: [[0], [], [4], [], [7], [], [4], [], [0, 12], [], [7], [], [4], [], [2], []],
  },
  {
    name: "Clear Day",
    emoji: "☀️",
    bpm: 72,
    sequence: [[4], [], [7], [], [12], [], [7], [], [4, 16], [], [12], [], [9], [], [7], []],
  },
  {
    name: "First Snow",
    emoji: "❄️",
    bpm: 60,
    sequence: [[12], [], [9], [], [7], [], [4], [], [0], [], [4], [], [7], [], [12], []],
  },
  {
    name: "Moonlight",
    emoji: "🌙",
    bpm: 55,
    sequence: [[0], [4], [], [7], [], [12], [], [], [9], [4], [], [7], [], [2], [], []],
  },
  {
    name: "Starlight",
    emoji: "✨",
    bpm: 65,
    sequence: [[12], [], [16], [], [19], [], [16], [], [12, 7], [], [9], [], [7], [], [4], []],
  },
  {
    name: "Indian Raga",
    emoji: "🪔",
    bpm: 70,
    // S R G M P D N – using close white-key approximation
    sequence: [[0], [2], [4], [5], [7], [9], [11], [12], [11], [9], [7], [5], [4], [2], [0], []],
  },
  {
    name: "Hip Hop Lo-Fi",
    emoji: "🎧",
    bpm: 84,
    sequence: [[0], [], [3], [], [7], [], [3], [], [0, 10], [], [7], [], [3], [], [5], []],
  },
  {
    name: "Pop Sparkle",
    emoji: "💖",
    bpm: 92,
    sequence: [[7], [12], [14], [12], [9], [7], [4], [], [7], [12], [14], [16], [14], [12], [9], []],
  },
];

// Vibe-aware AI tone generator scales (used when user picks a vibe).
const VIBE_SCALES: Record<string, number[]> = {
  chill:  [0, 2, 4, 7, 9, 12, 14, 16, 19, 21],   // pentatonic major
  indian: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16],    // raga-ish
  hiphop: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22],  // minor pentatonic
  pop:    [0, 4, 7, 9, 12, 16, 19, 21, 24],      // major triad + extensions
  lofi:   [0, 3, 5, 8, 10, 12, 15, 17, 20],      // dorian-ish
};

export default function Relax() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<number>(0);
  const [bpm, setBpm] = useState(68);
  const [currentStep, setCurrentStep] = useState(-1);
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const [muted, setMuted] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [vibe, setVibe] = useState<keyof typeof VIBE_SCALES>("chill");

  // ----- Free preview gating -----------------------------------------
  // Three tones. Each can be played ONCE per browser. After all three are
  // burned (or any one is replayed), the page nudges towards upgrade.
  const FREE_PREVIEWS = [
    { id: "lofi-rain",   label: "Lo-Fi Rain",   emoji: "🌧️", presetIndex: 6 }, // Hip Hop Lo-Fi
    { id: "indian-evening", label: "Indian Evening", emoji: "🪔", presetIndex: 5 }, // Indian Raga
    { id: "moonlight",   label: "Moonlight Drift", emoji: "🌙", presetIndex: 3 }, // Moonlight
  ] as const;
  const PREVIEW_KEY = "hustleai_relax_previews_v1";
  const [usedPreviews, setUsedPreviews] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(PREVIEW_KEY) || "[]")); } catch { return new Set(); }
  });
  const [previewLockOpen, setPreviewLockOpen] = useState(false);
  const burnPreview = (id: string) => {
    setUsedPreviews(prev => {
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem(PREVIEW_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };
  const tryFreePreview = (p: typeof FREE_PREVIEWS[number]) => {
    if (usedPreviews.has(p.id)) {
      setPreviewLockOpen(true);
      return;
    }
    burnPreview(p.id);
    startPreset(p.presetIndex);
  };

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      gainRef.current = audioCtxRef.current.createGain();
      gainRef.current.connect(audioCtxRef.current.destination);
    }
    return audioCtxRef.current;
  }, []);

  const playNote = useCallback((freq: number, duration = 0.6) => {
    if (muted) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(gainRef.current || ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }, [getAudioCtx, muted]);

  const handleKeyPress = (index: number) => {
    playNote(NOTES[index].freq, 0.8);
    setActiveKeys(prev => {
      const next = new Set(prev);
      next.add(index);
      setTimeout(() => setActiveKeys(p => { const n = new Set(p); n.delete(index); return n; }), 300);
      return next;
    });
  };

  const startPreset = (presetIndex: number) => {
    const preset = PRESETS[presetIndex];
    setActivePreset(presetIndex);
    setBpm(preset.bpm);
    setIsPlaying(true);
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    let step = 0;
    const interval = (60 / preset.bpm) * 1000 / 2; // 8th notes
    
    intervalRef.current = window.setInterval(() => {
      const noteIndices = preset.sequence[step % preset.sequence.length];
      setCurrentStep(step % preset.sequence.length);
      
      if (noteIndices.length > 0) {
        noteIndices.forEach(idx => {
          if (idx < NOTES.length) {
            playNote(NOTES[idx].freq);
            setActiveKeys(prev => {
              const next = new Set(prev);
              next.add(idx);
              setTimeout(() => setActiveKeys(p => { const n = new Set(p); n.delete(idx); return n; }), 200);
              return next;
            });
          }
        });
      }
      step++;
    }, interval);
  };

  const stopPlaying = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
    setCurrentStep(-1);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isPremium = profile && profile.subscription_tier !== "free";
  const allPreviewsUsed = FREE_PREVIEWS.every(p => usedPreviews.has(p.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50">
      <Navbar />
      {/* ambient soft blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[380px] h-[380px] rounded-full bg-emerald-200/40 blur-3xl" />
      </div>
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <Badge variant="outline" className="text-rose-700 border-rose-300 bg-white/70 backdrop-blur">
              <Music className="w-3 h-3 mr-1" /> RELAX MODE
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Relaxing{" "}
              <span className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">Beat Lab</span>
            </h1>
            <p className="text-foreground/70 max-w-xl mx-auto">
              Tired of grinding? Tap a free tone, breathe, and come back sharper. Three previews on the house — then your pet asks nicely.
            </p>
            <div className="rounded-xl p-4 max-w-2xl mx-auto text-xs text-foreground/70 text-left bg-white/60 backdrop-blur border border-white/80">
              <strong className="text-foreground">Why it works:</strong> Research in <em>JAMA Network Open</em> found that
              slow-tempo instrumental music significantly reduced stress and anxiety across 97 clinical trials. Taking short music breaks
              between tasks can restore focus and prevent burnout.
            </div>
          </motion.div>

          {/* Free preview tones — one play each per browser */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl bg-white/70 backdrop-blur border border-white/80 shadow-[0_8px_30px_-12px_rgba(244,114,182,0.25)] p-6 space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-rose-500" />
                <h2 className="font-display font-semibold text-lg">Free preview tones</h2>
              </div>
              <p className="text-[11px] text-foreground/60">
                {FREE_PREVIEWS.filter(p => !usedPreviews.has(p.id)).length} of {FREE_PREVIEWS.length} previews left
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FREE_PREVIEWS.map(p => {
                const used = usedPreviews.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => tryFreePreview(p)}
                    className={`relative text-left rounded-xl p-4 border transition-all ${
                      used
                        ? "bg-muted/40 border-border/60 opacity-70"
                        : "bg-gradient-to-br from-rose-100 via-amber-50 to-emerald-100 border-white/80 hover:scale-[1.02] hover:shadow-md"
                    }`}
                  >
                    <div className="text-2xl mb-2">{p.emoji}</div>
                    <p className="font-medium text-foreground">{p.label}</p>
                    <p className="text-[11px] text-foreground/60 mt-1">
                      {used ? "Preview used — upgrade for unlimited" : "Tap to preview · plays once"}
                    </p>
                    {used && (
                      <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {(previewLockOpen || allPreviewsUsed) && !isPremium && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-100 via-pink-50 to-amber-100 p-4"
                >
                  <span className="text-2xl shrink-0">🐱</span>
                  <div className="flex-1 text-sm text-foreground/85">
                    <p className="font-medium">That tune is on the house already 🎶</p>
                    <p className="text-foreground/70 text-[13px] mt-0.5">
                      Upgrade to keep me singing — unlimited tones, AI-composed melodies, and full piano on demand.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate("/payment")}
                    className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 text-white border-0 shrink-0"
                  >
                    <Sparkles className="w-4 h-4 mr-1" /> Upgrade
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6 space-y-6 bg-white/70 backdrop-blur border border-white/80 shadow-[0_8px_30px_-12px_rgba(120,80,200,0.18)]"
          >
            {/* Transport */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  className={`rounded-full w-14 h-14 ${isPlaying ? "bg-destructive hover:bg-destructive/80" : "bg-gradient-primary"} text-primary-foreground`}
                  onClick={() => isPlaying ? stopPlaying() : startPreset(activePreset)}
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </Button>
                <div>
                  <p className="font-display font-semibold">{isPlaying ? "Playing" : "Paused"}</p>
                  <p className="text-xs text-muted-foreground">BPM {bpm}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <span className="text-xs text-muted-foreground">BPM</span>
                  <Slider
                    value={[bpm]}
                    onValueChange={([v]) => setBpm(v)}
                    min={40}
                    max={120}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-6">{bpm}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMuted(!muted)}>
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Presets */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Presets:</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset, i) => (
                  <Button
                    key={preset.name}
                    variant={activePreset === i ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setActivePreset(i); if (isPlaying) { stopPlaying(); setTimeout(() => startPreset(i), 100); } }}
                    className={`transition-all ${activePreset === i ? "bg-gradient-primary text-primary-foreground" : "hover:border-primary/50"}`}
                  >
                    <span className="mr-1">{preset.emoji}</span>
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Step indicator */}
            {isPlaying && (
              <div className="flex gap-1">
                {PRESETS[activePreset].sequence.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-150 ${
                      i === currentStep ? "bg-primary shadow-glow" : "bg-secondary"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Piano */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Piano Keys:</p>
              <div className="relative flex justify-center overflow-x-auto pb-4">
                <div className="flex relative" style={{ minWidth: "fit-content" }}>
                  {NOTES.filter(n => !n.black).map((note, i) => {
                    const realIndex = NOTES.indexOf(note);
                    const isActive = activeKeys.has(realIndex);
                    return (
                      <button
                        key={note.note}
                        onClick={() => handleKeyPress(realIndex)}
                        className={`relative w-10 md:w-12 h-32 md:h-40 border border-border/50 rounded-b-lg transition-all duration-100 flex items-end justify-center pb-2 text-[10px] font-mono ${
                          isActive
                            ? "bg-primary/30 border-primary shadow-glow scale-[0.97]"
                            : "bg-card hover:bg-secondary"
                        }`}
                      >
                        {note.label}
                      </button>
                    );
                  })}
                  {/* Black keys overlay */}
                  {NOTES.filter(n => n.black).map((note) => {
                    const realIndex = NOTES.indexOf(note);
                    const whitesBefore = NOTES.slice(0, realIndex).filter(n => !n.black).length;
                    const isActive = activeKeys.has(realIndex);
                    return (
                      <button
                        key={note.note}
                        onClick={() => handleKeyPress(realIndex)}
                        className={`absolute top-0 w-6 md:w-8 h-20 md:h-24 rounded-b-md z-10 transition-all duration-100 text-[8px] flex items-end justify-center pb-1 ${
                          isActive
                            ? "bg-primary border-primary shadow-glow scale-[0.97]"
                            : "bg-background border border-border hover:bg-secondary"
                        }`}
                        style={{
                          left: `${whitesBefore * (window.innerWidth >= 768 ? 48 : 40) - (window.innerWidth >= 768 ? 16 : 12)}px`,
                        }}
                      >
                        <span className="text-muted-foreground">{note.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI Tone - Premium */}
            <div className="glass rounded-xl p-6 text-center space-y-3 border-accent/20">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h3 className="font-display font-semibold">AI-Generated Tones</h3>
                {!isPremium && <Lock className="w-4 h-4 text-muted-foreground" />}
              </div>
              <p className="text-sm text-muted-foreground">
                Let AI compose unique relaxing melodies based on your mood. Available for Pro, Elite, and Infinity members.
              </p>
              {/* Vibe selector — open to all so they can preview the choice */}
              <div className="flex flex-wrap gap-2 justify-center">
                {([
                  { key: "chill", label: "🌿 Chill" },
                  { key: "indian", label: "🪔 Indian" },
                  { key: "hiphop", label: "🎧 Hip Hop" },
                  { key: "pop", label: "💖 Pop" },
                  { key: "lofi", label: "🌙 Lo-Fi" },
                ] as const).map(v => (
                  <button
                    key={v.key}
                    onClick={() => setVibe(v.key)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      vibe === v.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              {!isPremium ? (
                <Button onClick={() => navigate("/payment")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  <Lock className="w-4 h-4 mr-1" /> Upgrade to Unlock
                </Button>
              ) : (
                <Button className="bg-gradient-primary text-primary-foreground"
                  onClick={() => {
                    // Vibe-aware AI mix using the selected scale + vibe BPM hint.
                    const scale = VIBE_SCALES[vibe];
                    const vibeBpm: Record<string, number> = { chill: 70, indian: 72, hiphop: 88, pop: 96, lofi: 74 };
                    const targetBpm = vibeBpm[vibe] ?? bpm;
                    const density = vibe === "hiphop" || vibe === "pop" ? 0.7 : 0.5;
                    const seq: number[][] = Array.from({ length: 16 }, () => {
                      if (Math.random() < density) {
                        const idx = scale[Math.floor(Math.random() * scale.length)];
                        return [Math.min(idx, NOTES.length - 1)];
                      }
                      return [];
                    });
                    setBpm(targetBpm);
                    PRESETS.push({ name: `AI · ${vibe}`, emoji: "🤖", bpm: targetBpm, sequence: seq });
                    startPreset(PRESETS.length - 1);
                  }}>
                  <Sparkles className="w-4 h-4 mr-1" /> Generate {vibe.charAt(0).toUpperCase() + vibe.slice(1)} Tone
                </Button>
              )}
            </div>
          </motion.div>

          <p className="text-[10px] text-center text-muted-foreground">
            This feature is for entertainment and relaxation only. It is not a medical device or therapeutic tool.
          </p>
        </div>
      </div>
    </div>
  );
}
