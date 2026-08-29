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

function normalizePhone(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
}

const bodySchema = (body: unknown) => {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const fullName = typeof value.fullName === "string" ? value.fullName.trim() : "";
  const phone = typeof value.phone === "string" ? value.phone.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";
  const role = value.role === "staff" || value.role === "user" ? value.role : null;
  const permissions = Array.isArray(value.permissions)
    ? value.permissions.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 50)
    : [];

  if (fullName.length < 2 || fullName.length > 120) return null;
  if (!/^\+?[1-9]\d{7,14}$/.test(phone)) return null;
  if (password.length < 6 || password.length > 72) return null;
  if (!role) return null;
  return { fullName, phone, password, role, permissions };
};

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

  const { data: actor, error: actorError } = await admin
    .from("profiles")
    .select("id, business_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (actorError || !actor || actor.role !== "admin" || !actor.is_active || !actor.business_id) {
    return json({ error: "Admin access required." }, 403);
  }

  const parsed = bodySchema(await request.json().catch(() => null));
  if (!parsed) return json({ error: "Invalid account details. Check name, mobile number, password and account type." }, 400);

  const { fullName, phone, password, role, permissions } = parsed;
  let createdUserId: string | null = null;
  let createdPartyId: string | null = null;

  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      phone,
      password,
      phone_confirm: true,
      // The auth trigger uses account_type + business_id to distinguish
      // internal shop accounts from a brand-new shop-admin signup.
      user_metadata: {
        full_name: fullName,
        business_id: actor.business_id,
        role,
        account_type: role,
      },
    });

    if (createError || !created.user) {
      const message = errorMessage(createError, "Unable to create account.");
      const lower = message.toLowerCase();
      if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
        return json({ error: "An account already exists for this mobile number. Use a different number or edit the existing account." }, 409);
      }
      return json({ error: message }, 400);
    }

    createdUserId = created.user.id;

    const { data: profile, error: profileLookupError } = await admin
      .from("profiles")
      .select("id, business_id, role")
      .eq("id", createdUserId)
      .maybeSingle();

    if (profileLookupError || !profile || profile.business_id !== actor.business_id || profile.role !== role) {
      await admin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;
      return json({ error: profileLookupError?.message ?? "Account profile was not created correctly. Please try again." }, 500);
    }

    if (role === "user") {
      const { data: parties, error: partyLookupError } = await admin
        .from("parties")
        .select("id,name,phone,party_type,is_active")
        .eq("business_id", actor.business_id)
        .in("party_type", ["customer", "both"])
        .eq("is_active", true);

      if (partyLookupError) {
        await admin.auth.admin.deleteUser(createdUserId);
        return json({ error: partyLookupError.message }, 500);
      }

      const phoneMatches = (parties ?? []).filter((party) => normalizePhone(party.phone) === normalizePhone(phone) && normalizePhone(phone) !== "");
      const nameMatches = (parties ?? []).filter((party) => normalizeName(party.name) === normalizeName(fullName));

      let partyId: string | null = null;
      if (phoneMatches.length === 1) partyId = phoneMatches[0].id;
      else if (nameMatches.length === 1) partyId = nameMatches[0].id;
      else if (phoneMatches.length === 0 && nameMatches.length === 0) {
        const { data: createdParty, error: partyCreateError } = await admin
          .from("parties")
          .insert({ business_id: actor.business_id, party_type: "customer", name: fullName, phone, created_by: actor.id })
          .select("id")
          .single();
        if (partyCreateError) {
          await admin.auth.admin.deleteUser(createdUserId);
          return json({ error: partyCreateError.message }, 500);
        }
        partyId = createdParty.id;
        createdPartyId = partyId;
      }

      if (partyId) {
        const { error: profileLinkError } = await admin
          .from("profiles")
          .update({ party_id: partyId })
          .eq("id", createdUserId)
          .eq("business_id", actor.business_id);
        if (profileLinkError) {
          if (createdPartyId) await admin.from("parties").delete().eq("id", createdPartyId).eq("business_id", actor.business_id);
          await admin.auth.admin.deleteUser(createdUserId);
          return json({ error: profileLinkError.message }, 500);
        }
      }
    }

    if (permissions.length > 0) {
      const { data: permissionRows, error: permissionError } = await admin
        .from("permissions")
        .select("id, code")
        .in("code", permissions);

      if (permissionError) {
        if (createdPartyId) await admin.from("parties").delete().eq("id", createdPartyId).eq("business_id", actor.business_id);
        await admin.auth.admin.deleteUser(createdUserId);
        return json({ error: permissionError.message }, 500);
      }

      const rows = (permissionRows ?? []).map((permission) => ({
        profile_id: createdUserId,
        permission_id: permission.id,
        granted_by: actor.id,
      }));

      if (rows.length > 0) {
        const { error: grantError } = await admin.from("profile_permissions").insert(rows);
        if (grantError) {
          if (createdPartyId) await admin.from("parties").delete().eq("id", createdPartyId).eq("business_id", actor.business_id);
          await admin.auth.admin.deleteUser(createdUserId);
          return json({ error: grantError.message }, 500);
        }
      }
    }

    const { error: auditError } = await admin.from("audit_logs").insert({
      business_id: actor.business_id,
      actor_id: actor.id,
      action: "team.member_created",
      entity_type: "profile",
      entity_id: createdUserId,
      metadata: { role, permissions },
    });
    if (auditError) console.warn("team audit log failed", auditError.message);

    return json({ message: `${role === "staff" ? "Staff" : "User"} account created.`, memberId: createdUserId }, 201);
  } catch (error) {
    console.error("team member creation failed", error);
    if (createdPartyId) await admin.from("parties").delete().eq("id", createdPartyId).eq("business_id", actor.business_id);
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    return json({ error: errorMessage(error, "Unable to create account. Please try again.") }, 500);
  }
});
