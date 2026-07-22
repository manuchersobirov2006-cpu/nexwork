/*
# Recreate storage upload/update policies to force cache invalidation

## Problem
Avatar (and other bucket) uploads started failing with "new row
violates row-level security policy for table objects" even though
the policy definitions are logically correct (verified: the WITH
CHECK expression evaluates true when tested directly). This looks
like a stale plan/policy cache on pooled connections following the
DROP POLICY in migration 031 (chat_attachments_public_read) — DDL on
a table's RLS policies invalidates cached plans for that table across
sessions, and something in the pooling layer served requests with a
stale cache afterward.

## Fix
Drop and recreate the affected owner-scoped INSERT/UPDATE policies
with IDENTICAL definitions, forcing a fresh, unambiguous catalog
state that all subsequent connections must pick up cleanly.
*/

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

DROP POLICY IF EXISTS "service_images_owner_insert" ON storage.objects;
CREATE POLICY "service_images_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "service_images_owner_update" ON storage.objects;
CREATE POLICY "service_images_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'service-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'service-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "service_images_owner_delete" ON storage.objects;
CREATE POLICY "service_images_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'service-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat_attachments_owner_insert" ON storage.objects;
CREATE POLICY "chat_attachments_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat_attachments_owner_delete" ON storage.objects;
CREATE POLICY "chat_attachments_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "identity_docs_user_insert" ON storage.objects;
CREATE POLICY "identity_docs_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
