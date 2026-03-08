import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle, Sparkles, Plus, X } from "lucide-react";

interface OnboardingData {
  interests: string[];
  experienceLevel: string;
  goals: string[];
  workStyle: string;
  preferredCategories: string[];
  customCategories: string[];
}

interface Props {
  availableCategories: { id: string; name: string; icon: string }[];
  maxChannels: number;
  tierName: string;
  canRequestCategories: boolean;
  onComplete: (data: OnboardingData) => void;
}

const interestOptions = [
  "Freelancing", "E-commerce", "Content Creation", "Web Development",
  "App Development", "AI & Automation", "Graphic Design", "Digital Marketing",
  "Investing", "Dropshipping", "Affiliate Marketing", "Consulting",
];

const experienceLevels = [
  { value: "beginner", label: "🌱 Beginner", desc: "Just getting started" },
  { value: "intermediate", label: "🌿 Intermediate", desc: "Some experience" },
  { value: "advanced", label: "🌳 Advanced", desc: "Seasoned hustler" },
  { value: "expert", label: "🏆 Expert", desc: "Full-time entrepreneur" },
];

const goalOptions = [
  "Earn side income", "Build a business", "Learn new skills",
  "Network with peers", "Find mentors", "Sell products/courses",
];

const workStyleOptions = [
  { value: "solo", label: "🧑‍💻 Solo Worker", desc: "I prefer working alone" },
  { value: "collaborative", label: "🤝 Collaborative", desc: "I love teamwork" },
  { value: "hybrid", label: "⚡ Hybrid", desc: "Mix of both" },
];

export function CommunityOnboarding({ availableCategories, maxChannels, tierName, canRequestCategories, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    interests: [],
    experienceLevel: "",
    goals: [],
    workStyle: "",
    preferredCategories: [],
    customCategories: [],
  });
  const [customInput, setCustomInput] = useState("");

  const totalSteps = 5;

  const toggleItem = (arr: string[], item: string, key: keyof OnboardingData) => {
    const current = arr;
    const updated = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
    setData(prev => ({ ...prev, [key]: updated }));
  };

  const toggleCategory = (name: string) => {
    const current = data.preferredCategories;
    if (current.includes(name)) {
      setData(prev => ({ ...prev, preferredCategories: current.filter(c => c !== name) }));
    } else if (current.length < maxChannels) {
      setData(prev => ({ ...prev, preferredCategories: [...current, name] }));
    }
  };

  const addCustomCategory = () => {
    if (customInput.trim() && !data.customCategories.includes(customInput.trim())) {
      setData(prev => ({ ...prev, customCategories: [...prev.customCategories, customInput.trim()] }));
      setCustomInput("");
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return data.interests.length > 0;
      case 1: return data.experienceLevel !== "";
      case 2: return data.goals.length > 0;
      case 3: return data.workStyle !== "";
      case 4: return true;
      default: return false;
    }
  };

  const stepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">What are you interested in?</h2>
              <p className="text-sm text-muted-foreground">Select all that apply — this helps us recommend the right channels</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {interestOptions.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleItem(data.interests, interest, "interests")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    data.interests.includes(interest)
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50"
                  }`}
                >
                  {data.interests.includes(interest) && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                  {interest}
                </button>
              ))}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">What's your experience level?</h2>
              <p className="text-sm text-muted-foreground">We'll tailor content to match your journey</p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {experienceLevels.map(level => (
                <button
                  key={level.value}
                  onClick={() => setData(prev => ({ ...prev, experienceLevel: level.value }))}
                  className={`p-4 rounded-xl text-left transition-all duration-200 border ${
                    data.experienceLevel === level.value
                      ? "border-primary bg-primary/10 shadow-glow"
                      : "border-border/50 bg-secondary/30 hover:border-primary/30"
                  }`}
                >
                  <div className="text-lg">{level.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{level.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">What are your goals?</h2>
              <p className="text-sm text-muted-foreground">Pick what matters most to you</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {goalOptions.map(goal => (
                <button
                  key={goal}
                  onClick={() => toggleItem(data.goals, goal, "goals")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    data.goals.includes(goal)
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-border/50"
                  }`}
                >
                  {data.goals.includes(goal) && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                  {goal}
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">How do you prefer to work?</h2>
              <p className="text-sm text-muted-foreground">This helps match you with the right community vibe</p>
            </div>
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              {workStyleOptions.map(style => (
                <button
                  key={style.value}
                  onClick={() => setData(prev => ({ ...prev, workStyle: style.value }))}
                  className={`p-4 rounded-xl text-left transition-all duration-200 border ${
                    data.workStyle === style.value
                      ? "border-primary bg-primary/10 shadow-glow"
                      : "border-border/50 bg-secondary/30 hover:border-primary/30"
                  }`}
                >
                  <div className="text-lg">{style.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold">Choose your channels</h2>
              <p className="text-sm text-muted-foreground">
                You can join up to <span className="text-primary font-semibold">{maxChannels}</span> channels as a {tierName} member
                {maxChannels === 0 && " — upgrade to join premium channels"}
              </p>
            </div>
            {availableCategories.length > 0 && maxChannels > 0 ? (
              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                {availableCategories.map(cat => {
                  const selected = data.preferredCategories.includes(cat.name);
                  const disabled = !selected && data.preferredCategories.length >= maxChannels;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => !disabled && toggleCategory(cat.name)}
                      className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                        selected
                          ? "border-primary bg-primary/10 shadow-glow"
                          : disabled
                            ? "border-border/30 bg-secondary/10 opacity-40 cursor-not-allowed"
                            : "border-border/50 bg-secondary/30 hover:border-primary/30"
                      }`}
                    >
                      <span className="text-lg mr-2">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.name}</span>
                      {selected && <CheckCircle className="w-4 h-4 text-primary inline ml-2" />}
                    </button>
                  );
                })}
              </div>
            ) : maxChannels === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Free users get access to default channels only. Upgrade to Pro to join premium channels!
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">No additional channels available</div>
            )}

            {canRequestCategories && (
              <div className="space-y-3 max-w-lg mx-auto pt-4 border-t border-border/30">
                <p className="text-sm font-medium text-center">
                  <Sparkles className="w-4 h-4 inline mr-1 text-primary" />
                  Request a new category (Elite/Infinity perk)
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Crypto Trading, SaaS Builders..."
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomCategory()}
                    className="focus:border-primary"
                  />
                  <Button onClick={addCustomCategory} size="sm" variant="outline" className="shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {data.customCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.customCategories.map(cat => (
                      <Badge key={cat} variant="secondary" className="gap-1">
                        {cat}
                        <button onClick={() => setData(prev => ({ ...prev, customCategories: prev.customCategories.filter(c => c !== cat) }))}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <p className="text-[10px] text-muted-foreground w-full">These will be sent to admin for review</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Step {step + 1} of {totalSteps}</span>
          <span className="text-xs text-primary font-medium">{Math.round(((step + 1) / totalSteps) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-2xl"
        >
          {stepContent()}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-3 mt-8">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        {step < totalSteps - 1 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
            className="bg-gradient-primary text-primary-foreground gap-1"
          >
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={() => onComplete(data)}
            className="bg-gradient-primary text-primary-foreground gap-1"
          >
            <Sparkles className="w-4 h-4" /> Join Community
          </Button>
        )}
      </div>
    </div>
  );
}
