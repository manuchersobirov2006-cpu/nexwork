/*
# Email notifications

Push and in-app notifications exist, but nothing reaches users who aren't
actively in the browser/app. Extends the existing notify_push() trigger to
also fire an email via /api/send-email (Resend), reusing the same
app_secrets-based shared-secret pattern as push. Users can opt out via
profiles.email_notifications_enabled.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION notify_push()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  secret text;
  sub record;
  recipient record;
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

  SELECT email, email_notifications_enabled INTO recipient FROM profiles WHERE id = NEW.user_id;
  IF recipient.email IS NOT NULL AND recipient.email_notifications_enabled THEN
    PERFORM net.http_post(
      url := 'https://nexwork.uz/api/send-email',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
      body := jsonb_build_object(
        'to', recipient.email,
        'title', NEW.title,
        'body', NEW.body,
        'url', CASE WHEN NEW.link IS NOT NULL THEN 'https://nexwork.uz/#/' || NEW.link ELSE 'https://nexwork.uz/' END
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
