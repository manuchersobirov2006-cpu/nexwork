/*
# Fix: employer couldn't actually accept/reject bids

## Bug
`bids_update_own` only let the freelancer who placed a bid update it
(auth.uid() = freelancer_id). But accepting a bid is done by the
employer (project owner), setting the winning bid to 'accepted' and
the rest to 'rejected' — that UPDATE was silently rejected by RLS the
whole time. The UI optimistically showed "Принято" until the next
reload, when it reverted to "Ожидает" because the bids.status column
was never actually changed in the database.

## Fix
Allow UPDATE on bids by either the bid's own freelancer (e.g. to
withdraw) or the employer who owns the bid's project (to accept /
reject).
*/

DROP POLICY IF EXISTS "bids_update_own" ON bids;
CREATE POLICY "bids_update_status" ON bids
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = freelancer_id
    OR EXISTS (SELECT 1 FROM projects WHERE projects.id = bids.project_id AND projects.employer_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = freelancer_id
    OR EXISTS (SELECT 1 FROM projects WHERE projects.id = bids.project_id AND projects.employer_id = auth.uid())
  );
