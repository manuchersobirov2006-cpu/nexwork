import { supabase } from './supabase';
import { getOrCreateChat } from './bids';
import type { JobApplicationMessageMetadata } from './types';

export async function sendJobApplicationMessage(metadata: JobApplicationMessageMetadata, content: string) {
  const chatId = await getOrCreateChat(metadata.applicant_id, metadata.employer_id);
  await supabase.from('messages').insert({
    chat_id: chatId,
    sender_id: metadata.applicant_id,
    content,
    message_type: 'job_application',
    metadata,
  });
  await supabase.from('chats').update({ last_message: content, last_message_at: new Date().toISOString() }).eq('id', chatId);
}

export async function setJobApplicationStatus(applicationId: string, status: 'accepted' | 'rejected') {
  const { error } = await supabase.from('job_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', applicationId);
  return { error };
}
