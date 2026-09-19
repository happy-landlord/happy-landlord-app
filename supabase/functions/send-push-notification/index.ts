import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
function isValidExpoPushToken(token) {
  return typeof token === "string" && (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));
}
function getPushText(notification) {
  const keyRelatedTypes = [
    "KEY_DUE_SOON",
    "KEY_OVERDUE",
    "KEY_RECALL_REQUESTED",
    "KEY_LOST_REPORTED"
  ];
  const registrationTypes = [
    "USER_REGISTRATION_REQUESTED"
  ];
  if (keyRelatedTypes.includes(notification.type)) {
    return {
      title: notification.title || "Happy Landlord",
      body: notification.body || "Key update. Open Happy Landlord for details."
    };
  }
  if (registrationTypes.includes(notification.type)) {
    return {
      title: notification.title || "Happy Landlord",
      body: notification.body || "Action required. Open Happy Landlord."
    };
  }
  return {
    title: notification.title || "Happy Landlord",
    body: notification.body || "Open Happy Landlord for details."
  };
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    const body = await req.json().catch(()=>null);
    const notificationId = body?.notification_id;
    if (!notificationId) {
      return new Response(JSON.stringify({
        error: "notification_id is required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const { data: notification, error: notificationError } = await supabaseAdmin.from("notifications").select(`
          id,
          recipient_user_id,
          title,
          body,
          type,
          related_property_id,
          related_key_set_id,
          related_checkout_id,
          sent_at
        `).eq("id", notificationId).single();
    if (notificationError || !notification) {
      return new Response(JSON.stringify({
        error: "Notification not found",
        details: notificationError?.message
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (notification.sent_at) {
      return new Response(JSON.stringify({
        ok: true,
        skipped: true,
        reason: "Notification already sent",
        notification_id: notification.id
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const { data: tokens, error: tokensError } = await supabaseAdmin.from("user_push_tokens").select("id, expo_push_token").eq("user_id", notification.recipient_user_id).eq("is_active", true);
    if (tokensError) {
      return new Response(JSON.stringify({
        error: "Could not load push tokens",
        details: tokensError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const allTokens = tokens || [];
    const validTokens = allTokens.filter((row)=>isValidExpoPushToken(row.expo_push_token));
    const invalidTokens = allTokens.filter((row)=>!isValidExpoPushToken(row.expo_push_token));
    if (invalidTokens.length > 0) {
      await supabaseAdmin.from("user_push_tokens").update({
        is_active: false
      }).in("id", invalidTokens.map((row)=>row.id));
    }
    if (validTokens.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        sent: 0,
        reason: "No active valid Expo push tokens found"
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const pushText = getPushText(notification);
    const messages = validTokens.map((row)=>({
        to: row.expo_push_token,
        sound: "default",
        title: pushText.title,
        body: pushText.body,
        data: {
          notification_id: notification.id,
          type: notification.type,
          related_property_id: notification.related_property_id,
          related_key_set_id: notification.related_key_set_id,
          related_checkout_id: notification.related_checkout_id
        }
      }));
    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });
    const expoResult = await expoResponse.json().catch(()=>null);
    if (!expoResponse.ok) {
      return new Response(JSON.stringify({
        error: "Expo push API failed",
        status: expoResponse.status,
        details: expoResult
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const tickets = Array.isArray(expoResult?.data) ? expoResult.data : [];
    const tokenIdsToDeactivate = [];
    tickets.forEach((ticket, index)=>{
      const tokenRow = validTokens[index];
      if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered" && tokenRow?.id) {
        tokenIdsToDeactivate.push(tokenRow.id);
      }
    });
    if (tokenIdsToDeactivate.length > 0) {
      await supabaseAdmin.from("user_push_tokens").update({
        is_active: false
      }).in("id", tokenIdsToDeactivate);
    }
    await supabaseAdmin.from("notifications").update({
      sent_at: new Date().toISOString()
    }).eq("id", notification.id);
    return new Response(JSON.stringify({
      ok: true,
      notification_id: notification.id,
      attempted: messages.length,
      deactivated_tokens: tokenIdsToDeactivate.length,
      expo: expoResult
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Unexpected server error",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
