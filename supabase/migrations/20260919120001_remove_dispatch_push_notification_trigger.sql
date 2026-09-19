-- Remove unnecessary trigger and function
-- The webhook now directly invokes the Edge Function without needing a database trigger
-- This is the modern Supabase pattern: no empty trigger functions

DROP TRIGGER IF EXISTS on_notification_created_dispatch_push ON public.notifications;

DROP FUNCTION IF EXISTS public.dispatch_push_notification();

