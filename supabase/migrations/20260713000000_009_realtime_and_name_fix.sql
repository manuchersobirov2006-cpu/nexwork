/*
# Fix: messages require manual refresh + registered name not shown

## Bug 1 — Realtime never fires
`messages`, `chats`, and `notifications` were never added to the
`supabase_realtime` publication, so the client's `postgres_changes`
subscriptions (see ChatScreen.tsx) never receive events. Users have to
manually reload the page to see new messages, updated chat previews,
or notifications.

## Bug 2 — display_name silently overrides the name typed at signup
`handle_new_user()` defaulted `display_name` to the email local-part
independently of `full_name`, and the UI shows `display_name` first.
So the name a user typed into the signup form was discarded in favor
of their email prefix. Fix the trigger to fall back to `full_name`
before the email prefix, and backfill existing rows accordingly.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$function$;

-- Backfill: correct display_name where it was defaulted to the email
-- prefix even though a real full_name was available, or where it's blank.
UPDATE profiles
SET display_name = COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1))
WHERE (display_name IS NULL OR display_name = '')
   OR (display_name = split_part(email, '@', 1) AND full_name IS NOT NULL AND full_name <> '' AND full_name <> split_part(email, '@', 1));

UPDATE profiles
SET full_name = split_part(email, '@', 1)
WHERE full_name IS NULL OR full_name = '';
