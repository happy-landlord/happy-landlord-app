# Supabase notification automation

This folder contains SQL setup scripts for Happy Landlord notifications.

## Files

- `sql/20260521_notification_automation.sql`
  - Dispatches inserted `notifications` rows to the `send-push-notification` Edge Function.
  - Adds triggers for:
    - `USER_REGISTRATION_REQUESTED`
    - `KEY_CHECKOUT_CREATED`
    - `KEY_RETURNED`
    - `KEY_LOST_REPORTED`
  - Adds scheduled helper function for:
    - `KEY_DUE_SOON`
    - `KEY_OVERDUE`
  - Adds callable helper for:
    - `KEY_RECALL_REQUESTED`

## Required Edge Function

You said this already exists:

```text
send-push-notification
```

The SQL dispatch trigger sends this payload:

```json
{ "notification_id": "<uuid>" }
```

The Edge Function should:

1. Load the notification by `notification_id`.
2. Find active Expo tokens from `user_push_tokens` for `recipient_user_id`.
3. Send to Expo Push API.
4. Update `notifications.sent_at = now()` after successful send.

## Required Vault secrets

Before enabling the DB trigger, store these secrets in Supabase Vault:

```
select vault.create_secret('https://<project-ref>.supabase.co', 'SUPABASE_URL');
select vault.create_secret('<service-role-key>', 'SUPABASE_SERVICE_ROLE_KEY');
```

## Install

Run the SQL file in the Supabase SQL editor, or via CLI if you keep this repo connected to a Supabase project.

## Scheduled due soon / overdue job

The SQL file defines `public.create_due_key_notifications()`.

The cron schedule is included but commented out. Enable it after `pg_cron` is available:

```
select cron.schedule(
  'happy-landlord-due-key-notifications',
  '*/30 * * * *',
  $$select public.create_due_key_notifications();$$
);
```

