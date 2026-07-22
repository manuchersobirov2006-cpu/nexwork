/*
# Public landing page stats

## What
The landing page (unauthenticated) shows live counts of active
freelancers and open vacancies. Freelancer profiles are already
readable by anon (migration 012). Jobs need the same for anon so the
open-vacancies count can be queried without login.
*/

DROP POLICY IF EXISTS "jobs_public_read_anon" ON jobs;
CREATE POLICY "jobs_public_read_anon" ON jobs
  FOR SELECT TO anon
  USING (status = 'active');
