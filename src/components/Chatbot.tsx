import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Loader2, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  is_admin_reply?: boolean;
}

export function Chatbot() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [onboardingAnswers, setOnboardingAnswers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Workspace Copilot lives on a dedicated full page. Any "open-hustlebot"
  // event routes there. If a `prefill` detail is supplied we pass it through
  // the URL so the Copilot page can seed its input.
  useEffect(() => {
    const openHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prefill?: string } | undefined;
      if (detail?.prefill) {
        navigate(`/hustlebot?prefill=${encodeURIComponent(detail.prefill)}`);
      } else {
        navigate("/hustlebot");
      }
    };
    window.addEventListener("open-hustlebot", openHandler);
    return () => window.removeEventListener("open-hustlebot", openHandler);
  }, [navigate]);

  // Don't render the floating bubble on the dedicated HustleBot page.
  if (pathname.startsWith("/hustlebot")) return null;

  // Load existing chat messages and set greeting
  useEffect(() => {
    if (user) loadExistingMessages();
  }, [user]);

  const ONBOARDING_QUESTIONS = [
    "First, what's your **core skill** right now? (e.g. coding, design, writing, video editing, none yet)",
    "Cool. What's your **monthly income goal** in ₹? (rough number is fine)",
    "Last one — how many **hours a week** can you actually put in?",
  ];

  const loadExistingMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (data && data.length > 0) {
      setMessages(data.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        is_admin_reply: m.is_admin_reply,
      })));
    } else {
      const name = profile?.display_name || "there";
      // First-ever chat → run a tiny profiling flow so HustleBot becomes
      // a personal "Gem" before answering generic questions.
      const bio = (profile as any)?.bio as string | undefined;
      const needsProfiling = !bio || bio.trim().length < 10;
      if (needsProfiling) {
        setOnboardingStep(1);
        setMessages([
          {
            role: "assistant",
            content: `Hi ${name} — I'm your **Workspace Copilot**. Three quick questions and I'll tailor everything to your work.\n\n**Q1/3 —** ${ONBOARDING_QUESTIONS[0]}`,
          },
        ]);
      } else {
        setMessages([
          { role: "assistant", content: `Hi ${name} — I'm your **Workspace Copilot**. Ask me to draft proposals, summarise client notes, build checklists or plan your week.` },
        ]);
      }
    }
  };

  // Listen for admin replies via realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new.is_admin_reply) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: payload.new.content,
            is_admin_reply: true,
          }]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const userInput = input.trim();
    setInput("");

    // === Onboarding flow (no AI call needed) ===
    if (onboardingStep > 0 && onboardingStep <= 3) {
      const updatedAnswers = [...onboardingAnswers, userInput];
      setOnboardingAnswers(updatedAnswers);
      if (onboardingStep < 3) {
        const nextQ = ONBOARDING_QUESTIONS[onboardingStep];
        setMessages([...newMessages, {
          role: "assistant",
          content: `Got it 🔥\n\n**Q${onboardingStep + 1}/3 —** ${nextQ}`,
        }]);
        setOnboardingStep(onboardingStep + 1);
      } else {
        // Finalize: persist as bio so the edge function can use it as RAG context.
        const summary = `Skill: ${updatedAnswers[0]} | Income goal: ${updatedAnswers[1]} | Weekly hours: ${updatedAnswers[2]}`;
        try {
          if (user) {
            await supabase.from("profiles").update({ bio: summary } as any).eq("user_id", user.id);
          }
        } catch (e) { console.error("Save bio failed", e); }
        setMessages([...newMessages, {
          role: "assistant",
          content: `Locked in 🚀 You're now my personalised hustle student.\n\n• Skill → **${updatedAnswers[0]}**\n• Goal → **₹${updatedAnswers[1]}**\n• Hours → **${updatedAnswers[2]}/wk**\n\nAsk me anything — gigs, pricing, scripts, scaling. I'll always answer with *your* situation in mind.`,
        }]);
        setOnboardingStep(0);
      }
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chatbot", {
        body: {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: `⚠️ ${data.error}` }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again! 🙏" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher removed — the Mascot Companion now occupies this
          spot and acts as the primary HustleBot launcher. */}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] glass rounded-2xl border border-primary/20 flex flex-col overflow-hidden shadow-card"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <span className="font-display font-semibold text-sm">Workspace Copilot</span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">Operations Assistant</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" :
                    m.is_admin_reply ? "bg-destructive/20 text-foreground border border-destructive/30" :
                    "bg-secondary text-secondary-foreground"
                  }`}>
                    {m.is_admin_reply && <span className="text-[10px] text-destructive block mb-1">👑 Expert Reply</span>}
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border/50">
              <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask your Workspace Copilot…" className="flex-1 h-9 text-sm" />
                <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:opacity-90 h-9 w-9" disabled={loading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
