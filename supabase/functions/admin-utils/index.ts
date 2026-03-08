import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, user_id, email, password } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Bootstrap action - verify service role key is used
    if (action === "bootstrap_password") {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      if (token !== serviceKey) throw new Error("Unauthorized bootstrap");
      
      let targetId = user_id;
      if (!targetId && email) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const found = users?.find(u => u.email === email);
        if (!found) throw new Error("User not found");
        targetId = found.id;
      }
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, { password });
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller is admin
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not admin");

    if (action === "set_password") {
      let targetId = user_id;
      if (!targetId && email) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const found = users?.find(u => u.email === email);
        if (!found) throw new Error("User not found");
        targetId = found.id;
      }
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, { password });
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Unknown action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
