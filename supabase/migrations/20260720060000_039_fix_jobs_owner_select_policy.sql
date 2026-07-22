/*
# Fix: employer couldn't change their own job's status away from 'active'

## Bug
`jobs_public_read` only granted SELECT when `status = 'active'` or the
caller is an admin — it never included the job's own employer. This
has two consequences:
1. An employer could never view/manage their own draft or closed job
   through the normal read path.
2. Changing a job's status via UPDATE (e.g. to 'closed' or the new
   'filled') made the row invisible under every SELECT policy right
   after the write. PostgREST wraps mutations in a query that needs
   to re-select the affected row, and since that re-select found
   nothing visible, it surfaced as "new row violates row-level
   security policy" — even though the UPDATE policy itself
   (auth.uid() = employer_id) was perfectly satisfied.

Confirmed live: PATCHing a job's own status to 'active' (no-op)
succeeded, but to 'closed'/'draft'/'filled' all failed with that
exact 403, while unrelated field updates (e.g. location) succeeded —
isolating the cause to the SELECT policy, not the UPDATE policy or
the new 'filled' value itself.

## Fix
Add `auth.uid() = employer_id` to `jobs_public_read` so an employer
can always see their own job regardless of status.
*/

DROP POLICY IF EXISTS "jobs_public_read" ON jobs;
CREATE POLICY "jobs_public_read" ON jobs
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR auth.uid() = employer_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
