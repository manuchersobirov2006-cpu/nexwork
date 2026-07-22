/*
# Fix: private chat attachments were listable/enumerable by anyone

## Problem
`chat_attachments_public_read` (migration 024) is a broad
`USING (bucket_id = 'chat-attachments')` SELECT policy for both
`authenticated` AND `anon`. Migration 007 already established the
correct pattern for public buckets on this project — `getPublicUrl()`
doesn't query `storage.objects`, so no SELECT policy is needed for a
client to display/download a file it already knows the path to; a
SELECT policy on `storage.objects` only ever matters for *listing*.
This bucket kept the broad SELECT, which meant anyone — even a fully
anonymous, unauthenticated caller — could call the Storage list API
(`POST /storage/v1/object/list/chat-attachments`) and enumerate every
sender's folder and, recursively, every file ever attached to any
private 1:1 chat on the platform, then download it via its public
URL. Confirmed live: an anon-capable request against the list
endpoint returned real uploader folder names.

## Fix
Drop the SELECT policy, exactly like migration 007 did for
avatars/service-images. The client only ever calls `.upload()` and
`.getPublicUrl()` on this bucket (confirmed in ChatScreen.tsx) — never
`.list()` — so nothing legitimate breaks.
*/

DROP POLICY IF EXISTS "chat_attachments_public_read" ON storage.objects;
