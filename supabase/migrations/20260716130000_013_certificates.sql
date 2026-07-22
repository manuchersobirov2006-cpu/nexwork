/*
# Certificates (admin-verified)

## What
Freelancers request certificate verification by sending their document
to the platform's Telegram. An admin manually checks it and adds a
certificate record to that user's profile from the Admin panel. The
certificate then displays on the user's Personal Account and public
portfolio page as a verified privilege badge.

## Table
- `certificates`: one row per awarded certificate, always admin-issued
  (no self-service insert). Owner + public (anon) can read so it shows
  on the public portfolio link; only admins can insert/update/delete.
*/

CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  issuer text,
  issued_at date,
  image_url text,
  issued_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certificates_user_id_idx ON certificates(user_id);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certificates_read_authenticated" ON certificates;
CREATE POLICY "certificates_read_authenticated" ON certificates
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "certificates_read_anon" ON certificates;
CREATE POLICY "certificates_read_anon" ON certificates
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "certificates_admin_insert" ON certificates;
CREATE POLICY "certificates_admin_insert" ON certificates
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "certificates_admin_update" ON certificates;
CREATE POLICY "certificates_admin_update" ON certificates
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "certificates_admin_delete" ON certificates;
CREATE POLICY "certificates_admin_delete" ON certificates
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
