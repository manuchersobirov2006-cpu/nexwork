/*
# Role-based access: freelancers search, employers post

## What
Accounts can switch role (freelancer <-> employer) at any time from
Settings; the same account keeps its history either way. This
migration enforces, at the RLS level, that:

- Only freelancers (with verified identity) can bid on tenders, apply
  to jobs, and create gigs.
- Only employers can post tenders (projects), post jobs, and create
  companies.

This tightens migration 014, which only checked "if role is
freelancer, must be verified" — an employer/admin account could
still bid/apply/create gigs. Now those three actions strictly require
role = 'freelancer'.
*/

DROP POLICY IF EXISTS "bids_insert_own" ON bids;
CREATE POLICY "bids_insert_own" ON bids
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = freelancer_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'freelancer'
        AND verification_level IN ('identity', 'full')
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
        AND role = 'freelancer'
        AND verification_level IN ('identity', 'full')
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
        AND role = 'freelancer'
        AND verification_level IN ('identity', 'full')
    )
  );

DROP POLICY IF EXISTS "projects_insert_own" ON projects;
CREATE POLICY "projects_insert_own" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = employer_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'employer')
  );

DROP POLICY IF EXISTS "jobs_insert_own" ON jobs;
CREATE POLICY "jobs_insert_own" ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = employer_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'employer')
  );

DROP POLICY IF EXISTS "companies_insert_own" ON companies;
CREATE POLICY "companies_insert_own" ON companies
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'employer')
  );
