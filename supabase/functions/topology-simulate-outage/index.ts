import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Dry-run topology outage simulator. Reads topology + blast radius,
// produces a descriptive predicted-impact record. NEVER mutates production data.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(url, key);
    const body = await req.json().catch(() => ({}));
    const scenario = String(body.scenario || 'edge-timeout');
    const target = body.target_node_key ? String(body.target_node_key) : null;

    // Look up dependents from edges
    let dependents: string[] = [];
    if (target) {
      const { data } = await sb.from('topology_edges').select('source_key').eq('target_key', target);
      dependents = (data || []).map((r: any) => r.source_key);
    }

    // Predict per scenario (heuristics)
    const scen = scenario.toLowerCase();
    const isOwnedDb = scen.includes('owned-db');
    const isWorker = scen.includes('worker');
    const isQueueJam = scen.includes('queue');
    const isTelegram = scen.includes('telegram');
    const isCronDup = scen.includes('cron');
    const isStaleLease = scen.includes('lease');

    const predicted = {
      dependents,
      auth_impact: dependents.some((d) => /auth|profile/i.test(d)),
      billing_impact: dependents.some((d) => /billing|wallet|cashfree/i.test(d)),
      notification_impact: isTelegram || dependents.some((d) => /telegram|notif/i.test(d)),
      fallback_path: isOwnedDb ? 'router falls back to primary; mirror_to_primary keeps data' :
                     isWorker ? 'lease expires; secondary worker claims after fence delay' :
                     isQueueJam ? 'replay retries with exponential backoff; dead-letter after 8 tries' :
                     isTelegram ? 'router buffers to replay queue; retries 15s..15m' :
                     isCronDup ? 'lease prevents both executions; loser becomes no-op' :
                     isStaleLease ? 'sweeper revokes lease >TTL; reassigned to next worker' :
                     'edge retried by caller; replay queue absorbs failures',
    };

    const rollback_correct = !isCronDup && !isStaleLease;
    const replay_recovered = !isQueueJam || true;
    const queue_pressure_pct = isQueueJam ? 85 : isOwnedDb ? 40 : 12;
    const duplicate_exec_prevented = !isCronDup ? true : false;
    const latency_impact_ms = isOwnedDb ? 120 : isWorker ? 800 : isTelegram ? 250 : 60;

    const { data, error } = await sb.from('topology_outage_simulations').insert({
      scenario,
      target_node_key: target,
      predicted_impact: predicted,
      rollback_correct,
      replay_recovered,
      queue_pressure_pct,
      duplicate_exec_prevented,
      latency_impact_ms,
      dry_run: true,
      finished_at: new Date().toISOString(),
      notes: `Heuristic dry-run; ${dependents.length} direct dependents.`,
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, simulation: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});