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

    // For bootstrap_admin, skip auth check (one-time setup)
    if (action === "bootstrap_admin") {
      const targetEmail = email || "support@skycart.xyz";
      const targetPassword = password || "Akash@123";
      
      // Check if user exists
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      let found = users?.find(u => u.email === targetEmail);
      
      if (!found) {
        // Create user
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: targetEmail,
          password: targetPassword,
          email_confirm: true,
        });
        if (createErr) throw createErr;
        found = newUser.user;
      } else {
        // Update password
        await supabaseAdmin.auth.admin.updateUserById(found.id, { password: targetPassword });
      }
      
      // Assign admin role
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: found!.id, role: "admin" },
        { onConflict: "user_id,role" }
      );
      
      // Set infinity tier
      await supabaseAdmin.from("profiles").update({ subscription_tier: "infinity" }).eq("user_id", found!.id);
      
      return new Response(JSON.stringify({ success: true, user_id: found!.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin for other actions
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
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
