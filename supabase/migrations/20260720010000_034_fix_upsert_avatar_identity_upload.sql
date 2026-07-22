/*
# Fix: avatar and identity-document uploads always failed with a fake RLS error

## Root cause
Migration 007 dropped the broad `avatars_public_read` /
`service_images_public_read` SELECT policies on storage.objects to
stop anyone from listing every file in those public buckets (a real
fix — getPublicUrl() doesn't need a SELECT policy to read a file you
already know the path to).

But `AvatarUpload.tsx` and `IdentityVerificationModal.tsx` both call
`.upload(path, file, { upsert: true, ... })`. Supabase Storage's
upsert path needs to SELECT the object first to decide whether to
insert or update it — with *zero* SELECT policy left on those
buckets, that internal existence check has nothing to work with, and
the whole upload fails with a misleading "new row violates row-level
security policy" error, even though the INSERT policy itself is
correct.

Confirmed live: an upload with `x-upsert: true` failed 403 against
`avatars`; the identical upload without the upsert header succeeded
200; re-adding an owner-scoped (not public) SELECT policy made the
upsert path succeed 200 too. `storage.objects` in this project had
literally zero rows in the `avatars` and `identity-documents`
buckets — this bug has silently blocked every avatar upload and every
identity verification submission since migration 007 shipped.

## Fix
Add SELECT policies scoped to the caller's own folder only (matching
the existing owner-scoped INSERT/UPDATE/DELETE pattern) — this lets
the upsert existence-check work without reopening the "list every
user's files" leak that migration 007 fixed. `service-images` isn't
touched: `GigImageUpload.tsx` only ever uses `upsert: false`.
*/

DROP POLICY IF EXISTS "avatars_owner_read" ON storage.objects;
CREATE POLICY "avatars_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "identity_docs_owner_read" ON storage.objects;
CREATE POLICY "identity_docs_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
