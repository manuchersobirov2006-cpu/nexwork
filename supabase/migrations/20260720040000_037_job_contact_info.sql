/*
# Contact info on job postings

## What
- `jobs.contact_phone` — optional phone number applicants can call
  directly, shown on the job detail as a tel: link.
- `jobs.social_links` — same shape as `profiles.social_links` (jsonb:
  telegram, instagram, whatsapp, facebook, linkedin, youtube), for the
  company's own channels/website, set per-job at posting time.

No RLS changes needed: both columns are freely editable by the job's
owner via the existing `jobs_update_own` policy, same as title/salary/etc.
*/

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;
