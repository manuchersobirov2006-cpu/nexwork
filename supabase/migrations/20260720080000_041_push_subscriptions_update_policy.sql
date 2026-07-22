/*
# Missing UPDATE policy on push_subscriptions

`subscribeToPush()` upserts on the `endpoint` unique constraint (so
re-subscribing the same browser updates the existing row instead of
erroring). That upsert path needs an UPDATE policy — migration 040
only added SELECT/INSERT/DELETE.
*/

DROP POLICY IF EXISTS "push_subscriptions_owner_update" ON push_subscriptions;
CREATE POLICY "push_subscriptions_owner_update" ON push_subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
