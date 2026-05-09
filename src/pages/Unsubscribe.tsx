import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function unsub() {
    if (!token) return setStatus("error");
    setStatus("loading");
    const { error } = await supabase.functions.invoke("brevo-newsletter", { body: { action: "unsubscribe", token } });
    if (error) { setStatus("error"); setMsg(error.message); } else setStatus("done");
  }

  useEffect(() => { if (token && token !== "test") unsub(); /* eslint-disable-next-line */ }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-6">
      <div className="max-w-md w-full bg-card border rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          {status === "done" ? <CheckCircle2 className="w-8 h-8 text-emerald-500" /> :
           status === "loading" ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> :
           <Mail className="w-8 h-8 text-primary" />}
        </div>
        <h1 className="text-2xl font-display font-bold">
          {status === "done" ? "You're unsubscribed" : status === "error" ? "Something went wrong" : "Unsubscribing..."}
        </h1>
        <p className="text-muted-foreground text-sm">
          {status === "done" && "You will no longer receive HustleAI newsletters. We're sad to see you go!"}
          {status === "error" && (msg || "Invalid or expired link.")}
          {(status === "idle" || status === "loading") && "Hold on while we update your preferences..."}
        </p>
        <Button onClick={() => (window.location.href = "/")} className="w-full">Back to HustleAI</Button>
      </div>
    </div>
  );
}