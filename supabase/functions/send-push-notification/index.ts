import { withSupabase } from "npm:@supabase/server@^1";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  title: string;
  body: string;
  type: string;
  related_property_id?: string | null;
  related_key_set_id?: string | null;
  related_checkout_id?: string | null;
  sent_at?: string | null;
};

type WebhookPayload = {
  type: "INSERT";
  table: "notifications";
  schema: "public";
  record: NotificationRow;
  old_record: null;
};

function isValidExpoPushToken(token: string) {
  return (
    typeof token === "string" &&
    (token.startsWith("ExponentPushToken[") ||
      token.startsWith("ExpoPushToken["))
  );
}

function getPushText(notification: NotificationRow) {
  const keyRelatedTypes = [
    "KEY_DUE_SOON",
    "KEY_OVERDUE",
    "KEY_RECALL_REQUESTED",
    "KEY_LOST_REPORTED",
  ];

  const registrationTypes = [
    "USER_REGISTRATION_REQUESTED",
  ];

  if (keyRelatedTypes.includes(notification.type)) {
    return {
      title: notification.title || "Happy Landlord",
      body: notification.body || "Key update. Open Happy Landlord for details.",
    };
  }

  if (registrationTypes.includes(notification.type)) {
    return {
      title: notification.title || "Happy Landlord",
      body: notification.body || "Action required. Open Happy Landlord.",
    };
  }

  return {
    title: notification.title || "Happy Landlord",
    body: notification.body || "Open Happy Landlord for details.",
  };
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 },
      );
    }

    try {
      const payload: WebhookPayload = await req.json().catch(() => null);

      // 1. WEBHOOK VALIDATION
      if (
        !payload ||
        payload.type !== "INSERT" ||
        payload.schema !== "public" ||
        payload.table !== "notifications" ||
        !payload.record?.id ||
        !payload.record?.recipient_user_id
      ) {
        return Response.json(
          { error: "Invalid webhook payload" },
          { status: 400 },
        );
      }

      const supabaseAdmin = ctx.supabaseAdmin;
      const notificationId = payload.record.id;

      // 2. RE-FETCH NOTIFICATION FROM DATABASE (do not trust webhook record)
      const { data: notification, error: notificationError } =
        await supabaseAdmin
          .from("notifications")
          .select(
            "id, recipient_user_id, title, body, type, related_property_id, related_key_set_id, related_checkout_id, sent_at"
          )
          .eq("id", notificationId)
          .single();

      if (notificationError || !notification) {
        console.error("Notification not found:", notificationError);
        return Response.json(
          { error: "Notification not found" },
          { status: 404 },
        );
      }

      // 3. IDEMPOTENCY / DUPLICATE PROTECTION
      if (notification.sent_at) {
        console.log(
          `Notification ${notificationId} already sent at ${notification.sent_at}. Skipping.`
        );
        return Response.json({
          ok: true,
          skipped: true,
          notification_id: notificationId,
          reason: "Notification already sent",
        });
      }

      // 4. LOAD PUSH TOKENS
      const { data: tokens, error: tokensError } = await supabaseAdmin
        .from("user_push_tokens")
        .select("id, expo_push_token")
        .eq("user_id", notification.recipient_user_id)
        .eq("is_active", true);

      if (tokensError) {
        console.error("Could not load push tokens:", tokensError);
        return Response.json(
          {
            error: "Could not load push tokens",
            details: tokensError.message,
          },
          { status: 500 },
        );
      }

      const allTokens = tokens || [];

      // Separate valid and invalid tokens
      const validTokens = allTokens.filter((row) =>
        isValidExpoPushToken(row.expo_push_token)
      );

      const invalidTokens = allTokens.filter(
        (row) => !isValidExpoPushToken(row.expo_push_token),
      );

      // Deactivate invalid tokens
      if (invalidTokens.length > 0) {
        const { error: deactivateError } = await supabaseAdmin
          .from("user_push_tokens")
          .update({ is_active: false })
          .in(
            "id",
            invalidTokens.map((row) => row.id),
          );

        if (deactivateError) {
          console.error("Failed to deactivate invalid tokens:", deactivateError);
        } else {
          console.log(`Deactivated ${invalidTokens.length} invalid tokens`);
        }
      }

      // If no valid tokens, do NOT set sent_at. Return success with sent: 0.
      if (validTokens.length === 0) {
        console.log(
          `No active valid push tokens for notification ${notificationId}`
        );
        return Response.json({
          ok: true,
          sent: 0,
          notification_id: notificationId,
          reason: "No active valid Expo push tokens found",
        });
      }

      // 5. EXPO ENHANCED SECURITY - Use EXPO_ACCESS_TOKEN
      const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
      if (!expoAccessToken) {
        console.error("EXPO_ACCESS_TOKEN environment variable not set");
        return Response.json(
          { error: "Expo access token not configured" },
          { status: 500 },
        );
      }

      // 6. BUILD PUSH MESSAGES
      const pushText = getPushText(notification);

      const messages = validTokens.map((row) => ({
        to: row.expo_push_token,
        sound: "default",
        title: pushText.title,
        body: pushText.body,
        data: {
          notification_id: notification.id,
          type: notification.type,
          related_property_id: notification.related_property_id,
          related_key_set_id: notification.related_key_set_id,
          related_checkout_id: notification.related_checkout_id,
        },
      }));

      // SEND TO EXPO PUSH SERVICE
      const expoResponse = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${expoAccessToken}`,
        },
        body: JSON.stringify(messages),
      });

      const expoResult = await expoResponse.json().catch(() => null);

      if (!expoResponse.ok) {
        console.error("Expo push API failed:", expoResult);
        return Response.json(
          {
            error: "Expo push API failed",
            status: expoResponse.status,
          },
          { status: 502 },
        );
      }

      // 7. HANDLE EXPO PUSH TICKETS CORRECTLY
      const tickets = Array.isArray(expoResult?.data) ? expoResult.data : [];
      const tokenIdsToDeactivate: string[] = [];
      let successCount = 0;
      let failureCount = 0;

      tickets.forEach((ticket: any, index: number) => {
        const tokenRow = validTokens[index];

        if (ticket?.status === "ok") {
          successCount++;
        } else if (ticket?.status === "error") {
          failureCount++;

          // Deactivate only DeviceNotRegistered errors
          if (
            ticket?.details?.error === "DeviceNotRegistered" &&
            tokenRow?.id
          ) {
            tokenIdsToDeactivate.push(tokenRow.id);
          }
        }
      });

      // Deactivate DeviceNotRegistered tokens
      if (tokenIdsToDeactivate.length > 0) {
        const { error: deactivateError } = await supabaseAdmin
          .from("user_push_tokens")
          .update({ is_active: false })
          .in("id", tokenIdsToDeactivate);

        if (deactivateError) {
          console.error(
            "Failed to deactivate DeviceNotRegistered tokens:",
            deactivateError
          );
        } else {
          console.log(
            `Deactivated ${tokenIdsToDeactivate.length} DeviceNotRegistered tokens`
          );
        }
      }

      // 8. SET sent_at ONLY IF AT LEAST ONE SUCCEEDED
      let sentAtUpdated = false;
      if (successCount > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("notifications")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", notificationId);

        if (updateError) {
          console.error("Failed to update notification sent_at:", updateError);
        } else {
          sentAtUpdated = true;
          console.log(
            `Updated notification ${notificationId} sent_at. Success: ${successCount}, Failure: ${failureCount}`
          );
        }
      }

      return Response.json({
        ok: true,
        notification_id: notificationId,
        attempted: messages.length,
        success: successCount,
        failure: failureCount,
        deactivated_tokens: tokenIdsToDeactivate.length,
        sent_at_updated: sentAtUpdated,
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      return Response.json(
        {
          error: "Unexpected server error",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  }),
};
