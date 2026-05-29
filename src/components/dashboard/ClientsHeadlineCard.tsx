/**
 * ClientsHeadlineCard
 *
 * High-impact "your business lives here" card surfaced at the top of the
 * dashboard. Tells the operator at a glance: how many active clients they
 * have, who they most recently worked with, and one click into that client.
 *
 * Reads from DB2 (`work_clients`) — same source as Operations Today and the
 * Client Activity page, so numbers stay consistent.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowRight, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listWorkClients, type WorkClientLite } from "@/lib/delivery/api";
import { formatDistanceToNowStrict } from "date-fns";

export default function ClientsHeadlineCard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<WorkClientLite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    listWorkClients(user.id)
      .then((rows) => setClients(rows || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user?.id]);

  const total = clients.length;
  const top = clients[0];
  const ago = (iso?: string | null) => {
    if (!iso) return "no activity yet";
    try { return formatDistanceToNowStrict(new Date(iso), { addSuffix: true }); } catch { return ""; }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Clients</div>
              <div className="text-sm font-semibold text-slate-900">This is where your business lives</div>
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            {loaded ? (
              <>
                <span className="text-2xl font-bold text-slate-900 tabular-nums">{total}</span>
                <span className="text-xs text-slate-500">
                  {total === 1 ? "active client" : "active clients"}
                </span>
              </>
            ) : (
              <span className="my-1 h-6 w-16 rounded bg-slate-100 animate-pulse" />
            )}
          </div>

          {top ? (
            <Link
              to={`/dashboard/clients/${top.id}`}
              className="group mt-3 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
            >
              <span className="font-medium text-slate-900 group-hover:text-emerald-700 transition">
                {top.name}
              </span>
              <span className="text-xs text-slate-500">
                Last activity: {ago(top.last_delivery_at)}
              </span>
              <span className="text-xs text-slate-500">
                · {top.delivery_count ?? 0} {(top.delivery_count ?? 0) === 1 ? "delivery" : "deliveries"}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                Open <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
              </span>
            </Link>
          ) : loaded ? (
            <p className="mt-3 text-xs text-slate-500">
              No clients yet — every delivery you send can attach to one.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link
            to="/work/clients"
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            All clients <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            to="/work/clients?new=1"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition"
          >
            <Plus className="w-3 h-3" /> New client
          </Link>
        </div>
      </div>
    </section>
  );
}