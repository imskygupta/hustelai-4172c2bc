import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

import {
  Target, GraduationCap, Sparkles, Clock, Wallet, ArrowRight, ArrowLeft,
  CheckCircle2, Zap, Loader2,
} from "lucide-react";

interface OnboardingData {
  goal: string;
  experience: string;
  interests: string[];
  timePerWeek: string;
  income: string;
}

const goals = [
  { id: "side-income", label: "Earn side income", desc: "Add a few thousand on the side", icon: "💰" },
  { id: "full-time", label: "Go full-time freelance", desc: "Replace my 9–5 with hustles", icon: "🚀" },
  { id: "learn", label: "Learn & build skills", desc: "Sharpen tools and explore", icon: "🧠" },
  { id: "scale", label: "Scale a business", desc: "I already earn — help me grow", icon: "📈" },
];

const experienceLevels = [
  { id: "beginner", label: "Just starting", desc: "Never freelanced before" },
  { id: "intermediate", label: "Some gigs done", desc: "A few projects under my belt" },
  { id: "advanced", label: "Experienced", desc: "Regular client work" },
  { id: "expert", label: "Pro hustler", desc: "Full-time entrepreneur" },
];

const interestOptions = [
  "AI & Automation", "Freelancing", "Content Creation", "Web Development",
  "Graphic Design", "Digital Marketing", "E-commerce", "Investing",
  "Writing & Copy", "Video Editing", "Consulting", "No-Code/SaaS",
];

const timeOptions = [
  { id: "0-5", label: "0–5 hrs/week", desc: "Tiny side project" },
  { id: "5-15", label: "5–15 hrs/week", desc: "Serious side hustle" },
  { id: "15-30", label: "15–30 hrs/week", desc: "Half-time grind" },
  { id: "30+", label: "30+ hrs/week", desc: "Full focus" },
];

const incomeOptions = [
  { id: "0", label: "₹0", desc: "Just starting out" },
  { id: "0-10k", label: "₹0 – 10k", desc: "Earning a little" },
  { id: "10k-50k", label: "₹10k – 50k", desc: "Solid side income" },
  { id: "50k-2L", label: "₹50k – 2L", desc: "Strong freelancer" },
  { id: "2L+", label: "₹2L+", desc: "Full-time pro" },
];

export default function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    goal: "", experience: "", interests: [], timePerWeek: "", income: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && profile?.onboarding_completed) navigate("/dashboard");
  }, [loading, user, profile, navigate]);

  const totalSteps = 5;
  const pct = ((step + 1) / totalSteps) * 100;

  const canNext = () => {
    switch (step) {
      case 0: return !!data.goal;
      case 1: return !!data.experience;
      case 2: return data.interests.length > 0;
      case 3: return !!data.timePerWeek;
      case 4: return !!data.income;
    }
    return false;
  };

  const toggleInterest = (i: string) => {
    setData(p => ({
      ...p,
      interests: p.interests.includes(i) ? p.interests.filter(x => x !== i) : [...p.interests, i],
    }));
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding: data as any, onboarding_completed: true })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    if (refreshProfile) await refreshProfile();
    toast({ title: "You're all set! 🎉", description: "Welcome to your personalized workspace." });
    navigate("/dashboard");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
      <SEO title="Onboarding | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const stepIcons = [Target, GraduationCap, Sparkles, Clock, Wallet];
  const StepIcon = stepIcons[step];

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Choices
            label="What's your primary goal?"
            sublabel="We'll tailor your dashboard to fit."
            options={goals}
            selected={data.goal}
            onSelect={(v) => setData(p => ({ ...p, goal: v }))}
          />
        );
      case 1:
        return (
          <Choices
            label="How experienced are you?"
            sublabel="No wrong answer. Just helps us match content."
            options={experienceLevels}
            selected={data.experience}
            onSelect={(v) => setData(p => ({ ...p, experience: v }))}
          />
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-900">What interests you?</h2>
              <p className="text-sm text-slate-500 mt-1">Pick 2–5 categories. You can change later.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
              {interestOptions.map(i => {
                const active = data.interests.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      active
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    {active && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />}
                    {i}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 3:
        return (
          <Choices
            label="How much time can you invest weekly?"
            sublabel="We'll surface hustles that fit your schedule."
            options={timeOptions}
            selected={data.timePerWeek}
            onSelect={(v) => setData(p => ({ ...p, timePerWeek: v }))}
          />
        );
      case 4:
        return (
          <Choices
            label="Current monthly hustle income?"
            sublabel="Helps us suggest realistic next steps. Honest answers welcome."
            options={incomeOptions}
            selected={data.income}
            onSelect={(v) => setData(p => ({ ...p, income: v }))}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-200/60">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center text-white">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-slate-900">HustleAI</span>
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Skip for now
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <StepIcon className="w-3.5 h-3.5" />
                </div>
                <span>Step {step + 1} of {totalSteps}</span>
              </div>
              <span className="text-xs font-medium text-emerald-600">{Math.round(pct)}%</span>
            </div>
            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-10">
            <Button
              variant="ghost"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-slate-600"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>

            {step < totalSteps - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={!canNext() || saving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Finish setup <ArrowRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Choices({
  label, sublabel, options, selected, onSelect,
}: {
  label: string;
  sublabel: string;
  options: { id: string; label: string; desc: string; icon?: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-900">{label}</h2>
        <p className="text-sm text-slate-500 mt-1">{sublabel}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {options.map(o => {
          const active = selected === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                active
                  ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/15"
                  : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {o.icon && <span className="text-xl">{o.icon}</span>}
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    {o.label}
                    {active && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{o.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}