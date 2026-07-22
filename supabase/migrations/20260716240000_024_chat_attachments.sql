/*
# Chat attachments storage bucket

## What
Lets chat participants send files/images as message attachments
(messages.attachments text[] column already existed but the UI never
used it). Files are stored under {sender_id}/{chat_id}/{filename} so
ownership matches the existing service-images bucket pattern.
*/

INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_attachments_public_read" ON storage.objects;
CREATE POLICY "chat_attachments_public_read" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "chat_attachments_owner_insert" ON storage.objects;
CREATE POLICY "chat_attachments_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat_attachments_owner_delete" ON storage.objects;
CREATE POLICY "chat_attachments_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
