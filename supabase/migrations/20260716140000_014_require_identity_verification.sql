/*
# Require identity verification for freelancer work

## What
Freelancers must have verification_level 'identity' or 'full' before
they can: bid on tenders, apply to jobs, or create gigs. Enforced at
the RLS level (in addition to UI-side checks) so it can't be bypassed
by calling the API directly. Employers and admins are unaffected —
the check only applies when the acting user's own profile role is
'freelancer'.
*/

DROP POLICY IF EXISTS "bids_insert_own" ON bids;
CREATE POLICY "bids_insert_own" ON bids
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = freelancer_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role <> 'freelancer' OR verification_level IN ('identity', 'full'))
    )
  );

DROP POLICY IF EXISTS "job_applications_insert_own" ON job_applications;
CREATE POLICY "job_applications_insert_own" ON job_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = applicant_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role <> 'freelancer' OR verification_level IN ('identity', 'full'))
    )
  );

DROP POLICY IF EXISTS "gigs_insert_own" ON gigs;
CREATE POLICY "gigs_insert_own" ON gigs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = seller_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role <> 'freelancer' OR verification_level IN ('identity', 'full'))
    )
  );
