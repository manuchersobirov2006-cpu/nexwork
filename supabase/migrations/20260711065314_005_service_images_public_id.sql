/*
# Service images bucket + public_id for profiles

## Overview
1. Creates `service-images` public storage bucket for gig listing photos.
2. RLS policies on service-images: public read, owner-only upload/update/delete (folder = user_id).
3. Adds `public_id` column to profiles: 8-character uppercase alphanumeric, unique, auto-generated on creation.

## New Storage Bucket
- `service-images` (public = true) — gig listing photos visible to all users.

## Storage RLS
- service-images: public read (authenticated + anon), owner-only write/update/delete (foldername = auth.uid()).
- Admins can delete any service image (for cleanup when admin removes a gig).

## Modified Tables
- `profiles` — added `public_id` varchar(8) UNIQUE column. Backfill for existing profiles via random generation.

## Security
- identity-documents bucket: UNCHANGED. No storage.objects policies for identity-documents were added, modified, or removed.
- avatars bucket: UNCHANGED.
*/

-- ==================== SERVICE-IMAGES STORAGE BUCKET ====================

INSERT INTO storage.buckets (id, name, public) VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "service_images_public_read" ON storage.objects;
CREATE POLICY "service_images_public_read" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'service-images');

-- Owner can upload to their own folder
DROP POLICY IF EXISTS "service_images_owner_insert" ON storage.objects;
CREATE POLICY "service_images_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Owner can update their own files
DROP POLICY IF EXISTS "service_images_owner_update" ON storage.objects;
CREATE POLICY "service_images_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'service-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'service-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Owner can delete their own files
DROP POLICY IF EXISTS "service_images_owner_delete" ON storage.objects;
CREATE POLICY "service_images_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'service-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can delete any service image (for gig removal cleanup)
DROP POLICY IF EXISTS "service_images_admin_delete" ON storage.objects;
CREATE POLICY "service_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'service-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ==================== profiles: add public_id ====================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'public_id') THEN
    ALTER TABLE profiles ADD COLUMN public_id varchar(8);
  END IF;
END $$;

-- Backfill existing profiles with random 8-char alphanumeric public_id
DO $$
DECLARE
  rec RECORD;
  new_id TEXT;
BEGIN
  FOR rec IN SELECT id FROM profiles WHERE public_id IS NULL LOOP
    LOOP
      new_id := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE public_id = new_id);
    END LOOP;
    UPDATE profiles SET public_id = new_id WHERE id = rec.id;
  END LOOP;
END $$;

-- Make it NOT NULL and unique after backfill
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'public_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_public_id_key') THEN
      ALTER TABLE profiles ADD CONSTRAINT profiles_public_id_key UNIQUE (public_id);
    END IF;
  END IF;
END $$;

-- Add a trigger to auto-generate public_id on new profile insert
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS TRIGGER AS $$
DECLARE
  new_id TEXT;
BEGIN
  IF NEW.public_id IS NULL THEN
    LOOP
      new_id := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE public_id = new_id);
    END LOOP;
    NEW.public_id := new_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_generate_public_id ON profiles;
CREATE TRIGGER profiles_generate_public_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_public_id();

-- Index for fast public_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON profiles(public_id);
