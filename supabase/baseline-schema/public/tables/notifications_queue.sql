-- notifications_queue: lightweight queue for async delivery of notifications
CREATE TABLE IF NOT EXISTS public.notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz DEFAULT NULL,
  processed_by text DEFAULT NULL,
  attempts int NOT NULL DEFAULT 0,
  payload jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_notifications_queue_processed_at ON public.notifications_queue(processed_at);

