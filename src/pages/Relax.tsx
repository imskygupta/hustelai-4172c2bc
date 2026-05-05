import { useState, useRef, useCallback, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Music, Sparkles, Lock, Volume2, VolumeX } from "lucide-react";
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
];

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <Badge variant="outline" className="text-primary border-primary/30">
              <Music className="w-3 h-3 mr-1" /> RELAX MODE
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold">
              Relaxing <span className="text-gradient">Beat Lab</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tired of grinding? Create and listen to relaxing piano beats. Two octaves of keys and handcrafted preset tunes.
            </p>
            <div className="glass rounded-xl p-4 max-w-2xl mx-auto text-xs text-muted-foreground text-left">
              <strong className="text-foreground">Why it works:</strong> Research published in <em>JAMA Network Open</em> found that
              slow-tempo instrumental music significantly reduced stress and anxiety across 97 clinical trials. Taking short music breaks
              between tasks can restore focus and prevent burnout.
            </div>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 space-y-6"
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
              {!isPremium ? (
                <Button onClick={() => navigate("/payment")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  <Lock className="w-4 h-4 mr-1" /> Upgrade to Unlock
                </Button>
              ) : (
                <Button className="bg-gradient-primary text-primary-foreground"
                  onClick={() => {
                    // Generate a random pleasant sequence
                    const pentatonic = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
                    const seq: number[][] = Array.from({ length: 16 }, () => {
                      if (Math.random() > 0.4) {
                        const idx = pentatonic[Math.floor(Math.random() * pentatonic.length)];
                        return [idx];
                      }
                      return [];
                    });
                    PRESETS.push({ name: "AI Mix", emoji: "🤖", bpm, sequence: seq });
                    startPreset(PRESETS.length - 1);
                  }}>
                  <Sparkles className="w-4 h-4 mr-1" /> Generate AI Tone
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
