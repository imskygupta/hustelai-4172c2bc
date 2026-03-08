import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing chat messages and set greeting
  useEffect(() => {
    if (user) loadExistingMessages();
  }, [user]);

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
      const name = profile?.display_name || "Hustler";
      setMessages([
        { role: "assistant", content: `Hey ${name}! 👋🔥 I'm **HustleBot**, your personal AI mentor. Ask me anything about freelancing, side hustles, or growing your income!` },
      ]);
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
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chatbot", {
        body: {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          user_id: user?.id,
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
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow hover:scale-110 transition-transform"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] glass rounded-2xl border border-primary/20 flex flex-col overflow-hidden shadow-card"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <span className="font-display font-semibold text-sm">HustleBot</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">AI Mentor</span>
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
                <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask HustleBot anything..." className="flex-1 h-9 text-sm" />
                <Button type="submit" size="icon" className="bg-gradient-primary h-9 w-9" disabled={loading || !input.trim()}>
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
