/*
# Resume attachments on job applications

## What
- `job_applications.resume_url`: optional file the applicant attaches
  when applying (PDF/DOC/etc.), stored in a new `resumes` bucket.
- `resumes` storage bucket: public read (so the employer can open the
  file via a plain link, same pattern as chat-attachments), writes
  scoped to the uploader's own folder. Includes an owner-scoped SELECT
  policy up front this time — migration 034 already showed that
  Supabase Storage's `upsert` path needs one, and this app's other
  buckets tend to use upsert eventually.
*/

ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_url text;

-- Extend migration 028's job_applications trigger to also protect resume_url
CREATE OR REPLACE FUNCTION enforce_job_application_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.job_id IS DISTINCT FROM OLD.job_id
     OR NEW.applicant_id IS DISTINCT FROM OLD.applicant_id
     OR NEW.cover_letter IS DISTINCT FROM OLD.cover_letter
     OR NEW.resume_url IS DISTINCT FROM OLD.resume_url
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Cannot modify application identity fields';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() = OLD.applicant_id THEN
      IF NEW.status <> 'withdrawn' THEN
        RAISE EXCEPTION 'Applicant may only withdraw their application';
      END IF;
    ELSIF EXISTS (SELECT 1 FROM jobs WHERE jobs.id = OLD.job_id AND jobs.employer_id = auth.uid()) THEN
      IF OLD.status <> 'pending' OR NEW.status NOT IN ('accepted','rejected') THEN
        RAISE EXCEPTION 'Invalid application status transition from % to %', OLD.status, NEW.status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Not authorized to change application status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "resumes_owner_insert" ON storage.objects;
CREATE POLICY "resumes_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "resumes_owner_read" ON storage.objects;
CREATE POLICY "resumes_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "resumes_owner_update" ON storage.objects;
CREATE POLICY "resumes_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "resumes_owner_delete" ON storage.objects;
CREATE POLICY "resumes_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
