# Push Notifications Implementation Guide

## Architecture

```
User Action/System Event
    ↓
INSERT INTO public.notifications
    ↓
Database Webhook (configured in Supabase Dashboard)
    ↓
send-push-notification Edge Function
    ↓
Reads SUPABASE_SERVICE_ROLE_KEY from environment (Supabase-managed)
    ↓
Queries user_push_tokens via Admin Client
    ↓
Expo Push Service API
    ↓
APNs / FCM / Device
```

## What's Implemented

### ✅ Database Schema
- `public.notifications` table with all required fields
- `public.user_push_tokens` table with unique constraint on (user_id, expo_push_token)
- RLS policies on both tables
- Database Webhook handles push notification delivery (no trigger function needed)

### ✅ Edge Function
- `supabase/functions/send-push-notification/index.ts`
- Uses modern `withSupabase` middleware with `auth: "secret"` (verifies webhook signature automatically)
- `ctx.supabaseAdmin` provides pre-authenticated client with service role permissions
- Validates webhook payload (type, schema, table, record)
- Queries notifications and tokens via admin client
- Sends batch to Expo Push API
- Handles invalid tokens (deactivates DeviceNotRegistered)
- Updates `notifications.sent_at` on success

### ✅ App-Side Integration
- `expo-notifications` installed
- `usePushTokenRegistration` hook: registers token on login (uses existing `saveUserPushToken` from services)
- `useNotificationListener` hook: handles foreground notifications and tap navigation
- Both hooks integrated in `app/_layout.tsx`
- Notification routing via `getNotificationTargetPath()` (existing service)

## What You MUST Configure Manually in Supabase Dashboard

### 1. Deploy Edge Function
```bash
supabase functions deploy send-push-notification --project-ref YOUR_PROJECT_REF
```

This deploys the function with the `withSupabase` middleware that handles webhook verification.

### 2. Create Database Webhook
**Path:** Database → Webhooks → Create Webhook

**Configuration:**
- **Name:** `send-push-notification`
- **Table:** `public.notifications`
- **Events:** `INSERT`
- **HTTP Method:** `POST`
- **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification`
  - Replace `YOUR_PROJECT_REF` with your project ref (e.g., `lpwahlwswtbgxwrnipoh`)
- **Headers:** Leave default (Supabase handles authentication automatically)
- **Webhook events message format:** Default (REST)
- **Retry strategy:** Enabled (recommended for reliability)

**Note:** The `withSupabase({ auth: "secret" })` middleware automatically:
- Verifies the webhook signature using Supabase's secret
- Provides `ctx.supabaseAdmin` with service role permissions
- Validates the webhook payload structure
- Rejects unauthorized requests

## Testing the Setup

### 1. Via Database
```sql
INSERT INTO public.notifications (
  recipient_user_id,
  title,
  body,
  type
) VALUES (
  'test-user-uuid',
  'Test Title',
  'Test Body',
  'KEY_DUE_SOON'
);
```

Check Edge Function logs in Supabase Dashboard → Functions → send-push-notification.

### 2. Via App (Production)
1. Log in with a user that has a registered push token
2. Trigger a notification event in your system
3. Verify the notification arrives on the device

## Security Notes

✅ **Modern Supabase Approach (What We're Using):**
- `withSupabase` middleware with `auth: "secret"` automatically verifies webhook signature
- No manual header validation needed - Supabase's official SDK handles it
- `ctx.supabaseAdmin` provides pre-authenticated client (service role permissions)
- Service role key never exposed to code, only via authenticated context
- Type-safe WebhookPayload validation ensures only valid notifications are processed
- RLS policies protect user data on client queries
- No tokens embedded in SQL or code

❌ **Legacy Approaches (What We Removed):**
- Embedding JWT tokens in SQL functions
- Calling external URLs directly from triggers with hardcoded auth
- Manual environment variable handling for service role key
- Unverified webhook calls without authentication

## Troubleshooting

### Webhook not triggering
- Verify the URL is correct (project ref, `/functions/v1/` path)
- Check Dashboard → Database → Webhooks → View failed deliveries
- Ensure webhook is "enabled" (toggle switch)

### Edge Function failing
- Check Dashboard → Functions → send-push-notification → Logs
- Verify webhook URL in webhook configuration is correct
- Confirm Edge Function is deployed: `supabase functions deploy send-push-notification`
- Check user has active push tokens in `user_push_tokens` table

### Notifications not reaching device
- Verify app-side: `usePushTokenRegistration` hook is running and tokens are registered
- Check `user_push_tokens` table has active tokens for the recipient user
- Verify Expo Push token format (`ExponentPushToken[...]` or `ExpoPushToken[...]`)
- Check app's notification listener is configured in root layout

## Next Steps (Phase 2 - Not Implemented)

- Expo receipt polling (delivery confirmation)
- Failed notification retry logic via Supabase Queues
- Push preference UI (enable/disable per device)
- Token refresh on expiry
- Analytics on push delivery rates

