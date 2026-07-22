/*
# Notifications between two different users were silently failing

`notifications_own_insert` only allows `auth.uid() = user_id`, so every
"notify the other party" call in the app (new order, new chat message, bid
response, job application status, identity verification result, etc.) has
been silently failing under RLS since migration 001 — the actor is never
the same person as the notification's recipient. Confirmed live: placing a
test order through the new Specialists flow inserted the order successfully
but the accompanying notification for the seller never landed.

Fix: allow any authenticated user to INSERT a notification for any other
user. This does not weaken privacy — SELECT/UPDATE/DELETE stay strictly
owner-scoped (migration 001), so a user can still only read or manage
their own notification list. The only thing this grants is the ability to
place a row in someone else's notification feed, which mirrors what already
happens for chats/messages (anyone can message anyone) and is the intended
behavior for every existing "notify" call site in the codebase.
*/

DROP POLICY IF EXISTS "notifications_authenticated_insert" ON notifications;
CREATE POLICY "notifications_authenticated_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);
