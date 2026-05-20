import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2 } from "lucide-react";
import { useEventStream, clearEvents, summarizeRecent, type RuntimeEvent } from "@/lib/runtime/eventStream";
import { SEVERITY } from "@/lib/runtime/severity";

function timeAgo(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

function EventRow({ e }: { e: RuntimeEvent }) {
  const s = SEVERITY[e.severity];
  const Icon = s.icon;
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 border-l-2 ${s.ring} text-sm`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${s.text}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{e.title}</span>
          <Badge variant={s.badge} className="text-[10px] py-0 px-1.5">{s.label}</Badge>
        </div>
        {e.detail && <div className="text-xs text-muted-foreground mt-0.5">{e.detail}</div>}
      </div>
      <div className="text-[11px] text-muted-foreground shrink-0">{timeAgo(e.at)}</div>
    </div>
  );
}

export default function SystemEventsPanel({ limit = 60 }: { limit?: number }) {
  const events = useEventStream();
  const summary = useMemo(() => summarizeRecent(), [events]);
  const visible = events.slice(0, limit);

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          Operational summary
        </div>
        <div className="text-sm leading-relaxed">{summary}</div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="text-sm font-medium">System events</div>
          <Button size="sm" variant="ghost" onClick={clearEvents} disabled={events.length === 0}>
            <Trash2 className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>
        {visible.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No events recorded yet — runtime steady.</div>
        ) : (
          <div className="divide-y">
            {visible.map((e) => <EventRow key={e.id} e={e} />)}
          </div>
        )}
      </Card>
    </div>
  );
}