/*
# Fix gig admin-delete status value + add admin RLS for jobs/companies

## Problem
1. The admin panel's "delete gig" action set gigs.status = 'removed', but the
   gigs table CHECK constraint only allows ('active','paused','draft','deleted').
   The update was silently rejected by Postgres, so admins could never delete
   a gig from the admin panel.
2. The jobs and companies tables never received admin RLS policies (unlike
   gigs and projects in migration 004), so there was no way for an admin to
   edit or remove a job/company even at the application layer.

## Changes
1. companies — add admin_update_any / admin_delete_any policies, and expand
   companies_public_read is left as-is (already USING (true), no status column).
2. jobs — add admin_update_any / admin_delete_any policies, and expand
   jobs_public_read so admins can see closed/draft jobs too.
*/

-- ==================== companies: admin can update/delete any ====================

DROP POLICY IF EXISTS "companies_admin_update_any" ON companies;
CREATE POLICY "companies_admin_update_any" ON companies
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "companies_admin_delete_any" ON companies;
CREATE POLICY "companies_admin_delete_any" ON companies
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ==================== jobs: admin can update/delete any ====================

DROP POLICY IF EXISTS "jobs_admin_update_any" ON jobs;
CREATE POLICY "jobs_admin_update_any" ON jobs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "jobs_admin_delete_any" ON jobs;
CREATE POLICY "jobs_admin_delete_any" ON jobs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "jobs_public_read" ON jobs;
CREATE POLICY "jobs_public_read" ON jobs
  FOR SELECT TO authenticated
  USING (status = 'active' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
