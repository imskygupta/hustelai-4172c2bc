import { useState } from "react";
import { subscribe, markSubscribed } from "@/lib/newsletter/capture";

/** Editorial inline subscribe — no DB schema changes; reuses existing capture helper. */
export function NewsletterBlock({
  variant = "wide",
  source = "blog",
}: {
  variant?: "wide" | "compact";
  source?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email)) return setState("err");
    setState("loading");
    try {
      await subscribe({ email, source });
      markSubscribed();
      setState("ok");
    } catch {
      setState("err");
    }
  }

  return (
    <section
      className={`relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-amber-500/[0.03] ${
        variant === "wide" ? "px-6 py-8 sm:px-10 sm:py-10" : "p-6"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="grid gap-6 sm:grid-cols-[1.4fr_1fr] items-center">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400 font-medium mb-2">
            The Operator&apos;s Brief
          </div>
          <h3 className="font-serif text-2xl sm:text-[26px] tracking-tight leading-tight">
            One operational note per week. No fluff, no funnels.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Async workflows, client systems, and AI exports we actually run. Read it in three minutes.
          </p>
        </div>
        {state === "ok" ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.05] p-4 text-sm">
            <div className="font-medium text-emerald-700 dark:text-emerald-400">You&apos;re in.</div>
            <p className="text-muted-foreground mt-1">Check your inbox to confirm — first issue ships within the week.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-2">
            <label className="block text-[11px] uppercase tracking-wide text-muted-foreground">Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@operator.com"
                className="flex-1 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-foreground/40"
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="rounded-md bg-foreground text-background text-sm px-4 py-2 hover:opacity-90 disabled:opacity-60 transition"
              >
                {state === "loading" ? "…" : "Subscribe"}
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {state === "err" ? <span className="text-red-500">Couldn&apos;t subscribe — try again.</span> : "No spam · unsubscribe in one click"}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
