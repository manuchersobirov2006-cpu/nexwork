/*
# Admin-created notifications

Adds an admin-scoped INSERT policy on `notifications` so admins can create
notifications for any user (needed for the new admin panel "Notifications"
section, which lets admins broadcast a message to all users, one role, or
a specific user). The existing owner-only INSERT policy from migration 001
is left untouched.
*/

DROP POLICY IF EXISTS "notifications_admin_insert" ON notifications;
CREATE POLICY "notifications_admin_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
