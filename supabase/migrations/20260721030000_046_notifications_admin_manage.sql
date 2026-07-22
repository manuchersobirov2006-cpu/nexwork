/*
# Admin can view and delete any user's notifications

The new admin "Notifications" panel needs to browse and delete
notifications that were sent to users (e.g. to clean up a bad broadcast).
Existing policies only let admins INSERT (migration 042) and users manage
their own rows (migration 001). Add admin SELECT/DELETE.
*/

DROP POLICY IF EXISTS "notifications_admin_read" ON notifications;
CREATE POLICY "notifications_admin_read" ON notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "notifications_admin_delete" ON notifications;
CREATE POLICY "notifications_admin_delete" ON notifications
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
