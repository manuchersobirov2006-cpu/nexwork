/*
# Web push notifications

## What
- `push_subscriptions` — one row per browser/device a user has enabled
  push on (endpoint + encryption keys from the PushSubscription API).
  Owner-only read/write via RLS, matching the pattern used everywhere
  else in this schema.
- `app_secrets` — tiny key/value table with RLS enabled and *no*
  policies at all, so PostgREST can never read it (only SECURITY
  DEFINER functions running as the table owner can). Holds the shared
  secret the `notify_push` trigger sends to the `/api/send-push`
  Vercel function, so that secret never has to appear in a migration
  file that gets committed to git. The actual value is inserted
  separately, outside version control.
- `notify_push()` trigger (AFTER INSERT ON notifications) — for every
  new notification, looks up the recipient's push subscriptions and
  fires an async HTTP POST to /api/send-push via the pg_net
  extension, one per device. pg_net calls are fire-and-forget from
  Postgres's perspective (queued, not awaited), so this doesn't slow
  down the notification insert itself.
*/

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ==================== push_subscriptions ====================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_owner_read" ON push_subscriptions;
CREATE POLICY "push_subscriptions_owner_read" ON push_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_owner_insert" ON push_subscriptions;
CREATE POLICY "push_subscriptions_owner_insert" ON push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_owner_delete" ON push_subscriptions;
CREATE POLICY "push_subscriptions_owner_delete" ON push_subscriptions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ==================== app_secrets (no RLS policies = PostgREST-inaccessible) ====================

CREATE TABLE IF NOT EXISTS app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: only SECURITY DEFINER functions (running
-- as the table owner) can read this table. No one else, admin
-- included, can select from it through the API.

-- ==================== notify_push trigger ====================

CREATE OR REPLACE FUNCTION notify_push()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  secret text;
  sub record;
BEGIN
  SELECT value INTO secret FROM app_secrets WHERE key = 'push_secret';
  IF secret IS NULL THEN
    RETURN NEW;
  END IF;

  FOR sub IN SELECT * FROM push_subscriptions WHERE user_id = NEW.user_id LOOP
    PERFORM net.http_post(
      url := 'https://nexwork.uz/api/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
      body := jsonb_build_object(
        'subscription', jsonb_build_object(
          'endpoint', sub.endpoint,
          'keys', jsonb_build_object('p256dh', sub.p256dh, 'auth', sub.auth)
        ),
        'title', NEW.title,
        'body', NEW.body,
        'url', CASE WHEN NEW.link IS NOT NULL THEN '/#/' || NEW.link ELSE '/' END
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notification_push ON notifications;
CREATE TRIGGER on_notification_push
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_push();
