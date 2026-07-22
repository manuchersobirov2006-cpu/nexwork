/*
# 'filled' status for jobs — track successful hires

## What
Adds a distinct `filled` status (separate from `closed`) so an
employer can mark "found a specialist" on their own vacancy, and this
becomes a real statistic (successful hires) rather than being lumped
in with jobs that were just closed/withdrawn without a hire.
*/

ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('active','closed','draft','filled'));
