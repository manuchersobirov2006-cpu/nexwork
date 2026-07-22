/*
# Currency selection for tenders (projects)

`jobs` already has a `currency text DEFAULT 'USD'` column (migration 001),
but the UI never surfaced it and `projects` (tenders) had no currency
column at all — every budget was implicitly UZS. Adding UZS/USD selection
to the tender and vacancy forms, so `projects` needs the same column.
*/

ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'UZS';
