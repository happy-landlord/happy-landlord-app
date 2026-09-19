import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const bodyJson = await req.json().catch(() => null);

    const agentName = bodyJson?.agent_name?.trim() || null;
    const agentUserId = bodyJson?.agent_user_id || null;
    const registrationRequestId = bodyJson?.registration_request_id || null;

    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("status", "approved");

    if (adminsError) {
      throw adminsError;
    }

    const adminIds = (admins ?? []).map((admin) => admin.id);

    if (adminIds.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: 0,
          reason: "No approved admins found",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const title = "New Agent Request";

    const notificationBody = agentName
      ? `${agentName} has submitted a registration request.`
      : "A user has submitted a registration request.";

    const rows = adminIds.map((adminId) => ({
      recipient_user_id: adminId,
      title,
      body: notificationBody,
      type: "USER_REGISTRATION_REQUESTED",
      related_property_id: null,
      related_key_set_id: null,
      related_checkout_id: null,
      created_by: agentUserId,
      data: {
        screen: "RegistrationRequests",
        agent_user_id: agentUserId,
        registration_request_id: registrationRequestId,
      },
    }));

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert(rows)
      .select("id");

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted: insertedRows?.length ?? 0,
        notification_ids: insertedRows?.map((row) => row.id) ?? [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unexpected server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});