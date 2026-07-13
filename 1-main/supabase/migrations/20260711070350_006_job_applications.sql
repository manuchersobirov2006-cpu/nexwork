/*
# Job applications table

## Overview
Creates `job_applications` table to store applications from freelancers/users to job listings.
Previously, the "Откликнуться" (Apply) button on job listings had no onClick handler and no table
to write to. The `bids` table is for project/tender proposals, not job applications. The `jobs`
table has an `applicants_count` column but nothing backed it.

## New Table
- `job_applications` — id, job_id (FK to jobs), applicant_id (FK to profiles, defaults to auth.uid()),
  cover_letter (text, nullable), status (pending/accepted/rejected/withdrawn), created_at, updated_at.
  Unique constraint on (job_id, applicant_id) to prevent duplicate applications.

## Security (RLS)
- SELECT: applicant can read own applications; employer who owns the job can read applications on their jobs.
- INSERT: authenticated user can insert where applicant_id = auth.uid().
- UPDATE: employer who owns the job can update status (accept/reject); applicant can withdraw.
- DELETE: applicant can delete (withdraw) their own application.
- identity-documents / avatars / service-images storage policies: UNCHANGED.
*/

CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  cover_letter text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Applicant can read own applications; employer can read applications on their jobs
DROP POLICY IF EXISTS "job_applications_read" ON job_applications;
CREATE POLICY "job_applications_read" ON job_applications
  FOR SELECT TO authenticated
  USING (
    auth.uid() = applicant_id
    OR EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.employer_id = auth.uid())
  );

-- Authenticated user can apply (applicant_id defaults to auth.uid())
DROP POLICY IF EXISTS "job_applications_insert_own" ON job_applications;
CREATE POLICY "job_applications_insert_own" ON job_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

-- Employer can update status on their job's applications; applicant can withdraw
DROP POLICY IF EXISTS "job_applications_update" ON job_applications;
CREATE POLICY "job_applications_update" ON job_applications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.employer_id = auth.uid())
    OR auth.uid() = applicant_id
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.employer_id = auth.uid())
    OR auth.uid() = applicant_id
  );

-- Applicant can delete (fully withdraw) their own application
DROP POLICY IF EXISTS "job_applications_delete_own" ON job_applications;
CREATE POLICY "job_applications_delete_own" ON job_applications
  FOR DELETE TO authenticated
  USING (auth.uid() = applicant_id);

CREATE INDEX IF NOT EXISTS idx_job_apps_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_applicant ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_status ON job_applications(status);
