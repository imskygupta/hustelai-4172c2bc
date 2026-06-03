import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, ArrowUpRight, Sparkles } from "lucide-react";

/**
 * WorkspaceAssistantCard — compact, inline HustleBot widget for the
 * dashboard. Replaces the previously floating Copilot popup so the
 * dashboard reads as one calm column instead of a feature directory.
 */

const PROMPTS = [
  "Draft a follow-up to a quiet client",
  "Summarise this week's deliverables",
  "Suggest pricing for a website project",
];

export default function WorkspaceAssistantCard() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");

  function send(text: string) {
    const q = text.trim();
    if (!q) {
      navigate("/hustlebot");
      return;
    }
    navigate(`/hustlebot?q=${encodeURIComponent(q)}`);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 items-center justify-center text-white">
            <Bot className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="font-display font-semibold text-sm text-foreground">Workspace assistant</h2>
            <p className="text-[11px] text-muted-foreground">HustleBot — ask anything about your operations.</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/hustlebot")}
          className="text-[11px] uppercase tracking-wider font-semibold text-primary inline-flex items-center gap-1 hover:underline"
        >
          Open <ArrowUpRight className="w-3 h-3" />
        </button>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); send(draft); }}
        className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 focus-within:border-primary/40 transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask the assistant…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
        />
        <button
          type="submit"
          className="text-[11px] font-semibold uppercase tracking-wider text-primary hover:underline"
        >
          Send
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => send(p)}
            className="text-[11px] rounded-full border border-border bg-background/40 px-2.5 py-1 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    </section>
  );
}