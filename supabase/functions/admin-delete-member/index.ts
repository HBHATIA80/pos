import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Supabase function environment is incomplete");
    return json({ error: "Account service is not configured. Please contact the administrator." }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Authentication required." }, 401);

  const body = await request.json().catch(() => null);
  const profileId = body && typeof body.profileId === "string" ? body.profileId : "";
  if (!profileId) return json({ error: "Team member is required." }, 400);

  const { data: actor, error: actorError } = await admin
    .from("profiles")
    .select("id, business_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (actorError || !actor || actor.role !== "admin" || !actor.is_active || !actor.business_id) {
    return json({ error: "Admin access required." }, 403);
  }

  if (profileId === actor.id) return json({ error: "You cannot delete your own admin account." }, 400);

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, business_id, role, full_name, party_id")
    .eq("id", profileId)
    .eq("business_id", actor.business_id)
    .maybeSingle();

  if (targetError || !target) return json({ error: "Team member not found." }, 404);
  if (target.role === "admin") return json({ error: "The primary admin account cannot be deleted here." }, 400);

  // Delete only the authentication/profile account. Do not delete the linked
  // party or transaction rows because those are business records and may be
  // referenced by invoices, ledgers, payments or receipts.
  const { error: deleteError } = await admin.auth.admin.deleteUser(target.id);
  if (deleteError) {
    console.error("admin member deletion failed", deleteError);
    return json({ error: deleteError.message || "Unable to delete account." }, 400);
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    business_id: actor.business_id,
    actor_id: actor.id,
    action: "team.member_deleted",
    entity_type: "profile",
    entity_id: target.id,
    metadata: { role: target.role, full_name: target.full_name, party_id: target.party_id },
  });
  if (auditError) console.warn("team deletion audit log failed", auditError.message);

  return json({ message: "Login account deleted. Business records were preserved." });
});
