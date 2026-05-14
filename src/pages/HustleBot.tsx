import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Sparkles, Loader2, Lock, Crown, Rocket, MessageCircle, TrendingUp, Lightbulb, Target, Calendar } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TIER_LIMITS } from "@/lib/tool-limits";
import { PETS, PetKey, setMascotPet } from "@/components/MascotCompanion";

import { SEO } from "@/components/SEO";

interface Message {
  role: "user" | "assistant";
  content: string;
  is_admin_reply?: boolean;
}

const ONBOARDING_QUESTIONS = [
  "First, what's your **core skill** right now? (e.g. coding, design, writing, video editing, none yet)",
  "Cool. What's your **monthly income goal** in ₹? (rough number is fine)",
  "How many **hours a week** can you actually put in?",
  "Last one — pick your **pet PA**: type **cat**, **dog**, **fox** or **bunny**. (Free plan stays on cat — upgrade later to switch.)",
];

// Per-tier monthly chat-message budget. Free is locked entirely.
function chatLimitFor(tier: string): number {
  if (tier === "infinity") return Infinity;
  if (tier === "elite") return 25;
  if (tier === "pro") return 5;
  return 0; // free → locked
}

export default function HustleBot() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const tier = (profile?.subscription_tier as string) || "free";
  const isFree = tier === "free";
  const monthlyLimit = chatLimitFor(tier);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingAnswers, setOnboardingAnswers] = useState<string[]>([]);
  const [usedThisMonth, setUsedThisMonth] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true })
      .limit(80);

    // Count messages this calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const monthly = (data || []).filter((m: any) =>
      m.role === "user" && new Date(m.created_at) >= startOfMonth,
    ).length;
    setUsedThisMonth(monthly);

    if (data && data.length > 0) {
      setMessages(data.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        is_admin_reply: m.is_admin_reply,
      })));
    } else {
      const name = profile?.display_name || "Hustler";
      const bio = (profile as any)?.bio as string | undefined;
      const needsProfiling = !bio || bio.trim().length < 10;
      if (needsProfiling) {
        setOnboardingStep(1);
        setMessages([{
          role: "assistant",
          content: `Hey ${name}! 👋✨ I'm **HustleBot** — your personal AI mentor (think custom Gemini Gem, tuned to *you*).\n\nGimme 4 quick answers and every reply will be personalised.\n\n**Q1/4 —** ${ONBOARDING_QUESTIONS[0]}`,
        }]);
      } else {
        setMessages([{
          role: "assistant",
          content: `Hey ${name}! 👋🔥 I'm **HustleBot**. Ask me anything about freelancing, side hustles, or growing your income.`,
        }]);
      }
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;

    // Onboarding flow — no AI, no quota usage
    if (onboardingStep > 0 && onboardingStep <= 4) {
      const userMsg: Message = { role: "user", content: input.trim() };
      const updated = [...messages, userMsg];
      setMessages(updated);
      const ans = [...onboardingAnswers, input.trim()];
      setOnboardingAnswers(ans);
      setInput("");
      if (onboardingStep < 4) {
        setMessages([...updated, {
          role: "assistant",
          content: `Got it 🔥\n\n**Q${onboardingStep + 1}/4 —** ${ONBOARDING_QUESTIONS[onboardingStep]}`,
        }]);
        setOnboardingStep(onboardingStep + 1);
      } else {
        const raw = (ans[3] || "").toLowerCase().trim();
        const requested = (["cat","dog","fox","bunny"] as PetKey[]).find(k => raw.includes(k)) || "cat";
        const finalPet: PetKey = isFree ? "cat" : requested;
        try { setMascotPet(finalPet); } catch {}
        const summary = `Skill: ${ans[0]} | Income goal: ${ans[1]} | Weekly hours: ${ans[2]} | Pet PA: ${finalPet}`;
        try {
          if (user) await supabase.from("profiles").update({ bio: summary } as any).eq("user_id", user.id);
        } catch {}
        const petNote = isFree && requested !== "cat"
          ? `\n\n_(Free plan is locked to the **Cat** ${PETS.cat.emoji} — upgrade to Pro to switch to **${PETS[requested].label}** ${PETS[requested].emoji}.)_`
          : `\n\nYour pet PA: **${PETS[finalPet].label}** ${PETS[finalPet].emoji} — drag it anywhere on screen.`;
        setMessages([...updated, {
          role: "assistant",
          content: `Locked in 🚀\n\n• Skill → **${ans[0]}**\n• Goal → **₹${ans[1]}**\n• Hours → **${ans[2]}/wk**${petNote}\n\nNow ask me anything — gigs, pricing, scripts, scaling. I'll always answer with *your* situation in mind.`,
        }]);
        setOnboardingStep(0);
      }
      return;
    }

    // Free tier → locked. Non-onboarding messages blocked.
    if (isFree) return;

    if (usedThisMonth >= monthlyLimit) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chatbot", {
        body: { messages: newMessages.map(m => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      if (data?.error) {
        setMessages([...newMessages, { role: "assistant", content: `⚠️ ${data.error}` }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
        setUsedThisMonth(c => c + 1);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again 🙏" }]);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !profile) {
    return (
      <AppShell title="HustleBot">
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="HustleBot — Your AI Mentor"
      breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "HustleBot" }]}
      actions={
        <Badge className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 text-white border-0">
          <Sparkles className="w-3 h-3 mr-1" /> {tier.toUpperCase()}
          {!isFree && monthlyLimit !== Infinity && ` · ${usedThisMonth}/${monthlyLimit}`}
          {monthlyLimit === Infinity && " · Unlimited"}
        </Badge>
      }
    >
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div
          className="rounded-none sm:rounded-2xl sm:border border-slate-200 bg-white overflow-hidden flex flex-col h-[calc(100dvh-220px)] sm:h-[calc(100vh-230px)] min-h-[60vh] sm:min-h-[480px]"
        >
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-amber-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-display font-semibold text-slate-900 text-sm flex items-center gap-2">
                HustleBot <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700 font-medium">AI Mentor</span>
              </div>
              <div className="text-[11px] text-slate-500">Personalised hustle coach · Trained on 50K+ gigs</div>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5 space-y-3 sm:space-y-4 bg-slate-50/40 overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" as any }}
          >
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 mr-2 mt-0.5 shrink-0 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-3.5 sm:px-4 py-2.5 text-sm leading-relaxed break-words ${
                  m.role === "user"
                    ? "bg-emerald-500 text-white rounded-br-sm"
                    : m.is_admin_reply
                      ? "bg-amber-50 border border-amber-200 text-slate-800 rounded-bl-sm"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
                }`}>
                  {m.is_admin_reply && <span className="text-[10px] text-amber-700 block mb-1 font-semibold">👑 Expert Reply</span>}
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  ) : m.content}
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> HustleBot is thinking…
              </div>
            )}
          </div>

          {/* Free-user lock overlay */}
          {isFree && onboardingStep === 0 && (
            <div className="border-t border-slate-200 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50 p-5 text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-fuchsia-200 text-fuchsia-700 text-[11px] font-semibold mb-2">
                <Lock className="w-3 h-3" /> Your chats are loaded
              </div>
              <h3 className="font-display font-bold text-slate-900 text-lg">Upgrade to chat with HustleBot</h3>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                HustleBot is a premium AI mentor. Pro gets <strong>5 deep convos / month</strong>, Infinity is <strong>unlimited</strong>.
              </p>
              <div className="mt-3 flex justify-center gap-2 flex-wrap">
                <Button onClick={() => navigate("/payment")} className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 hover:opacity-90 text-white font-semibold">
                  <Crown className="w-4 h-4 mr-1" /> Upgrade to Pro
                </Button>
                <Button variant="outline" onClick={() => navigate("/plans")} className="border-slate-300">
                  <Rocket className="w-4 h-4 mr-1" /> See plans
                </Button>
              </div>
            </div>
          )}

          {/* Quota exhausted */}
          {!isFree && monthlyLimit !== Infinity && usedThisMonth >= monthlyLimit && (
            <div className="border-t border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-sm text-amber-900">
                You've used all <strong>{monthlyLimit}</strong> mentor chats this month.
                <Button size="sm" variant="link" className="text-amber-900 font-semibold" onClick={() => navigate("/payment")}>
                  Upgrade to Infinity for unlimited →
                </Button>
              </p>
            </div>
          )}

          {/* Input — sticky compose, safe-area aware */}
          {(!isFree || onboardingStep > 0) && (
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="border-t border-slate-200 bg-white p-2.5 sm:p-3 flex gap-2 pb-safe sticky bottom-0"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={onboardingStep > 0 ? "Type your answer…" : "Ask HustleBot anything…"}
                className="flex-1 h-12 sm:h-11 text-base sm:text-sm bg-slate-50 border-slate-200 focus-visible:ring-emerald-300"
                enterKeyHint="send"
                autoComplete="off"
                disabled={loading || (!isFree && monthlyLimit !== Infinity && usedThisMonth >= monthlyLimit && onboardingStep === 0)}
              />
              <Button
                type="submit"
                aria-label="Send message"
                className="h-12 sm:h-11 min-w-tap px-4 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 hover:opacity-90 text-white font-semibold active:scale-95 transition-transform"
                disabled={loading || !input.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          )}
        </div>

        {/* Helpful chips */}
        {!isFree && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center lg:col-span-2 lg:mt-2">
            {[
              "Pricing strategy for my niche",
              "Cold DM script for Instagram outreach",
              "How to scale to ₹50k/month part-time",
              "Find me 3 sub-niches with low competition",
            ].map(q => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-fuchsia-300 hover:text-fuchsia-700 transition-colors text-slate-600 inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-3 h-3" /> {q}
              </button>
            ))}
          </div>
        )}

        {/* Desktop side rail — uses the otherwise-empty whitespace on wide
            screens to surface helpful prompts, mentor facts and quick
            shortcuts. Hidden on mobile to keep the chat full-width. */}
        <aside className="hidden lg:flex flex-col gap-3 sticky top-20 self-start">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-semibold text-fuchsia-700">
              <Lightbulb className="w-3.5 h-3.5" /> Did you know
            </div>
            <p className="text-xs text-slate-700 mt-2 leading-relaxed">
              Freelancers who niche down to <strong>one specific industry</strong> earn
              up to <strong>2.3× more</strong> per project than generalists.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Try asking
            </div>
            <div className="space-y-2">
              {[
                { icon: Target,    text: "Audit my current rates vs market" },
                { icon: TrendingUp,text: "Build me a 30-day client outreach plan" },
                { icon: Calendar,  text: "Plan my week around 12 focused hours" },
                { icon: MessageCircle, text: "Draft a follow-up DM that doesn't feel pushy" },
              ].map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => setInput(text)}
                  disabled={isFree && onboardingStep === 0}
                  className="w-full text-left text-xs text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:border-fuchsia-300 hover:bg-fuchsia-50/40 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-start gap-2"
                >
                  <Icon className="w-3.5 h-3.5 mt-0.5 text-fuchsia-600 shrink-0" />
                  <span>{text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-amber-300">Mentor tip</div>
            <p className="text-xs mt-2 leading-relaxed text-slate-200">
              Send HustleBot your <strong>actual numbers</strong> — current rate,
              hours/week, niche — for replies tuned to your situation, not generic advice.
            </p>
            {isFree && (
              <Button
                size="sm"
                onClick={() => navigate("/payment")}
                className="w-full mt-3 h-8 text-[11px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 hover:opacity-90 text-white font-semibold"
              >
                <Crown className="w-3.5 h-3.5 mr-1" /> Unlock chats with Pro
              </Button>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
