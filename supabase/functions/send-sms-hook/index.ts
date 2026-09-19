import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type AnyPayload = Record<string, any>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function maskPhone(phone: string) {
  if (!phone) return "missing";

  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.length <= 6) return "***";

  return `${cleaned.slice(0, 4)}*****${cleaned.slice(-3)}`;
}

function normalizePhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("61")) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("04")) {
    return `+61${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("4") && cleaned.length === 9) {
    return `+61${cleaned}`;
  }

  return cleaned;
}

function extractPhone(payload: AnyPayload): string | null {
  return (
    payload?.user?.phone ||
    payload?.phone ||
    payload?.data?.phone ||
    payload?.record?.phone ||
    null
  );
}

function extractOtp(payload: AnyPayload): string | null {
  return (
    payload?.sms?.otp ||
    payload?.otp ||
    payload?.token ||
    payload?.data?.otp ||
    payload?.data?.token ||
    null
  );
}

function extractFallbackMessage(payload: AnyPayload): string | null {
  return (
    payload?.sms?.message ||
    payload?.message ||
    payload?.data?.message ||
    null
  );
}

async function sendClickSendSms(phone: string, message: string) {
  const username = Deno.env.get("CLICKSEND_USERNAME");
  const apiKey = Deno.env.get("CLICKSEND_API_KEY");
  const from = Deno.env.get("CLICKSEND_FROM");

  if (!username || !apiKey) {
    console.error("ClickSend config missing");
    throw new Error("ClickSend configuration missing");
  }

  const auth = btoa(`${username}:${apiKey}`);

  const smsMessage: Record<string, string> = {
    source: "sdk",
    body: message,
    to: phone,
  };

  // Keep sender optional. First test is safer without a custom sender ID.
  if (from && from.trim().length > 0) {
    smsMessage.from = from.trim();
  }

  const response = await fetch("https://rest.clicksend.com/v3/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      messages: [smsMessage],
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error("ClickSend failed", {
      status: response.status,
      phone: maskPhone(phone),
      response: responseText,
    });

    throw new Error(`ClickSend failed with status ${response.status}`);
  }

  console.info("ClickSend SMS sent", {
    status: response.status,
    phone: maskPhone(phone),
  });

  return responseText;
}

serve(async (req) => {
  try {
    console.info("send-sms-hook invoked");

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    /**
     * Supabase custom secrets cannot start with SUPABASE_.
     * Add this in Edge Function secrets:
     *
     * AUTH_HOOK_SECRET = v1,whsec_xxxxxxxxx
     *
     * The value comes from:
     * Authentication → Hooks → Send SMS Hook → Secret
     */
    const hookSecretRaw = Deno.env.get("AUTH_HOOK_SECRET");

    const hookSecret = hookSecretRaw?.startsWith("v1,")
      ? hookSecretRaw.split(",")[1]
      : hookSecretRaw;

    if (!hookSecret) {
      console.error("AUTH_HOOK_SECRET missing");
      return jsonResponse({ error: "Hook secret missing" }, 500);
    }

    const rawBody = await req.text();

    try {
      const webhook = new Webhook(hookSecret);

      webhook.verify(rawBody, {
        "webhook-id": req.headers.get("webhook-id") ?? "",
        "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
        "webhook-signature": req.headers.get("webhook-signature") ?? "",
      });
    } catch (error) {
      console.error("Invalid webhook signature", {
        hasWebhookId: Boolean(req.headers.get("webhook-id")),
        hasWebhookTimestamp: Boolean(req.headers.get("webhook-timestamp")),
        hasWebhookSignature: Boolean(req.headers.get("webhook-signature")),
        message: error instanceof Error ? error.message : "Unknown error",
      });

      return jsonResponse({ error: "Invalid webhook signature" }, 401);
    }

    const payload = JSON.parse(rawBody);

    const rawPhone = extractPhone(payload);
    const phone = rawPhone ? normalizePhone(rawPhone) : null;

    const otp = extractOtp(payload);
    const fallbackMessage = extractFallbackMessage(payload);

    if (!phone) {
      console.error("Missing phone in hook payload");
      return jsonResponse({ error: "Missing phone number" }, 400);
    }

    if (!otp && !fallbackMessage) {
      console.error("Missing OTP/message in hook payload", {
        phone: maskPhone(phone),
      });

      return jsonResponse({ error: "Missing OTP or message" }, 400);
    }

    const message = otp
      ? `Your Happy Landlord verification code is: ${otp}`
      : fallbackMessage;

    console.info("Sending OTP SMS", {
      phone: maskPhone(phone),
    });

    await sendClickSendSms(phone, message);

    return jsonResponse({
      success: true,
    });
  } catch (error) {
    console.error("send-sms-hook error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonResponse(
      {
        error: "Internal server error",
      },
      500,
    );
  }
});