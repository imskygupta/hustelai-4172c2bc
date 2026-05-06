import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Public client portal API. Auth-less, gated by portal token.
 * Actions:
 *   { action: "view",    token }
 *   { action: "comment", token, body, author_name, target_type?, target_id? }
 *   { action: "approve", token, target_type, target_id, status, comment? }
 *   { action: "track",   token, event_type, target_type?, target_id? }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { action, token } = body || {};
    if (!action || !token) return j({ error: "missing action/token" }, 400);

    const { data: portal } = await sb.from("workspace_portals").select("*").eq("token", token).maybeSingle();
    if (!portal) return j({ error: "portal not found" }, 404);
    if (portal.expires_at && new Date(portal.expires_at) < new Date()) return j({ error: "portal expired" }, 410);

    const wsId = portal.workspace_id;
    const ownerId = portal.owner_id;

    if (action === "view") {
      const [{ data: ws }, { data: docs }, { data: tasks }, { data: payments }, { data: comments }, { data: approvals }, { data: files }] = await Promise.all([
        sb.from("workspaces").select("client_name, company_name, logo_url, project_scope, ai_summary, deliverables, deadlines, pricing, status").eq("id", wsId).maybeSingle(),
        portal.show_docs ? sb.from("workspace_documents").select("id, doc_type, data, theme, status, created_at").eq("workspace_id", wsId) : Promise.resolve({ data: [] }),
        portal.show_tasks ? sb.from("workspace_tasks").select("id, title, stage, progress, due_date").eq("workspace_id", wsId) : Promise.resolve({ data: [] }),
        portal.show_payments ? sb.from("workspace_payments").select("id, label, amount, currency, status, payment_type, due_date").eq("workspace_id", wsId) : Promise.resolve({ data: [] }),
        sb.from("workspace_comments").select("*").eq("workspace_id", wsId).order("created_at"),
        sb.from("workspace_approvals").select("*").eq("workspace_id", wsId),
        sb.from("workspace_files").select("id, name, storage_path, mime_type, size_bytes").eq("workspace_id", wsId).eq("is_client_visible", true),
      ]);
      // Increment views
      await sb.from("workspace_portals").update({ views: (portal.views || 0) + 1, last_viewed_at: new Date().toISOString() }).eq("id", portal.id);
      // Log client event (only one per session-ish — let frontend dedupe)
      await sb.from("workspace_client_events").insert({
        workspace_id: wsId, owner_id: ownerId, portal_id: portal.id, event_type: "portal_viewed",
      });
      // Notify owner
      await sb.from("workspace_notifications").insert({
        user_id: ownerId, workspace_id: wsId, kind: "portal_viewed",
        title: `${ws?.client_name || "Client"} viewed the portal`, link: `/workspaces/${wsId}?tab=activity`,
      });
      // Sign file URLs
      const filesWithUrl = await Promise.all((files || []).map(async (f: any) => {
        const { data } = await sb.storage.from("workspace-files").createSignedUrl(f.storage_path, 3600);
        return { ...f, url: data?.signedUrl };
      }));
      return j({ portal, workspace: ws, docs, tasks, payments, comments, approvals, files: filesWithUrl });
    }

    if (action === "comment") {
      const { body: text, author_name, target_type, target_id, parent_id } = body;
      if (!text) return j({ error: "body required" }, 400);
      const { data, error } = await sb.from("workspace_comments").insert({
        workspace_id: wsId, owner_id: ownerId, author_type: "client",
        author_name: author_name || "Client", body: text,
        target_type: target_type || "workspace", target_id: target_id || null, parent_id: parent_id || null,
      }).select().single();
      if (error) return j({ error: error.message }, 500);
      await sb.from("workspace_client_events").insert({
        workspace_id: wsId, owner_id: ownerId, portal_id: portal.id, event_type: "commented",
        target_type: target_type || "workspace", target_id: target_id || null,
      });
      await sb.from("workspace_notifications").insert({
        user_id: ownerId, workspace_id: wsId, kind: "comment",
        title: `New client comment from ${author_name || "client"}`, body: text.slice(0, 120),
        link: `/workspaces/${wsId}?tab=collab`,
      });
      return j({ ok: true, comment: data });
    }

    if (action === "approve") {
      const { target_type, target_id, status, comment } = body;
      if (!target_type || !target_id || !status) return j({ error: "missing fields" }, 400);
      const patch: any = { status, comment, viewed_at: new Date().toISOString() };
      if (status === "approved") patch.approved_at = new Date().toISOString();
      if (status === "rejected") patch.rejected_at = new Date().toISOString();

      // upsert by (workspace, target)
      const { data: existing } = await sb.from("workspace_approvals")
        .select("id").eq("workspace_id", wsId).eq("target_type", target_type).eq("target_id", target_id).maybeSingle();
      let result;
      if (existing) {
        result = await sb.from("workspace_approvals").update(patch).eq("id", existing.id).select().single();
      } else {
        result = await sb.from("workspace_approvals").insert({
          workspace_id: wsId, owner_id: ownerId, target_type, target_id, ...patch,
        }).select().single();
      }
      await sb.from("workspace_client_events").insert({
        workspace_id: wsId, owner_id: ownerId, portal_id: portal.id, event_type: "approved",
        target_type, target_id, metadata: { status },
      });
      await sb.from("workspace_notifications").insert({
        user_id: ownerId, workspace_id: wsId, kind: "approval",
        title: `Client ${status.replace("_", " ")} a ${target_type}`,
        link: `/workspaces/${wsId}?tab=collab`,
      });
      return j({ ok: true, approval: result.data });
    }

    if (action === "track") {
      const { event_type, target_type, target_id } = body;
      await sb.from("workspace_client_events").insert({
        workspace_id: wsId, owner_id: ownerId, portal_id: portal.id,
        event_type, target_type, target_id,
      });
      return j({ ok: true });
    }

    return j({ error: "unknown action" }, 400);
  } catch (e: any) {
    return j({ error: e.message }, 500);
  }
});

function j(d: any, status = 200) {
  return new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}