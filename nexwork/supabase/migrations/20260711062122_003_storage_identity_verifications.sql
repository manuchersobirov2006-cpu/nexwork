/*
# Storage buckets + identity_verifications table

## Changes
1. Creates `avatars` storage bucket (PUBLIC) for user profile photos.
2. Creates `identity-documents` storage bucket (PRIVATE) for face + passport photos.
3. RLS policies on storage.objects for both buckets.
4. New `identity_verifications` table for the admin review queue.
5. RLS on identity_verifications.
*/

-- ==================== STORAGE BUCKETS ====================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ==================== STORAGE RLS: avatars (public read, owner write) ====================

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ==================== STORAGE RLS: identity-documents (private, write-only for users, admin read) ====================

DROP POLICY IF EXISTS "identity_docs_user_insert" ON storage.objects;
CREATE POLICY "identity_docs_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "identity_docs_admin_read" ON storage.objects;
CREATE POLICY "identity_docs_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'identity-documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "identity_docs_admin_delete" ON storage.objects;
CREATE POLICY "identity_docs_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'identity-documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ==================== identity_verifications TABLE ====================

CREATE TABLE IF NOT EXISTS identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  face_photo_path text NOT NULL,
  passport_photo_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "identity_verif_user_read" ON identity_verifications;
CREATE POLICY "identity_verif_user_read" ON identity_verifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "identity_verif_user_insert" ON identity_verifications;
CREATE POLICY "identity_verif_user_insert" ON identity_verifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "identity_verif_user_update" ON identity_verifications;
CREATE POLICY "identity_verif_user_update" ON identity_verifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "identity_verif_admin_update" ON identity_verifications;
CREATE POLICY "identity_verif_admin_update" ON identity_verifications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX IF NOT EXISTS idx_identity_verif_user ON identity_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verif_status ON identity_verifications(status);
