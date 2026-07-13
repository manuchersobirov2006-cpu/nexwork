import { supabase } from './supabase';
import type { BidMessageMetadata } from './types';

export async function getOrCreateChat(userA: string, userB: string): Promise<string> {
  const { data: existing } = await supabase
    .from('chats')
    .select('id')
    .or(`and(participant_1.eq.${userA},participant_2.eq.${userB}),and(participant_1.eq.${userB},participant_2.eq.${userA})`)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created } = await supabase.from('chats').insert({ participant_1: userA, participant_2: userB }).select('id').single();
  return created!.id;
}

export async function sendBidMessage(metadata: BidMessageMetadata, content: string) {
  const chatId = await getOrCreateChat(metadata.freelancer_id, metadata.employer_id);
  await supabase.from('messages').insert({
    chat_id: chatId,
    sender_id: metadata.freelancer_id,
    content,
    message_type: 'bid',
    metadata,
  });
  await supabase.from('chats').update({ last_message: content, last_message_at: new Date().toISOString() }).eq('id', chatId);
}

export async function acceptBid(bid: { id: string; project_id: string; freelancer_id: string }, notifTitle: string, notifBody: string) {
  await supabase.from('bids').update({ status: 'accepted' }).eq('id', bid.id);
  await supabase.from('bids').update({ status: 'rejected' }).eq('project_id', bid.project_id).neq('id', bid.id);
  await supabase.from('projects').update({ status: 'in_progress' }).eq('id', bid.project_id);
  await supabase.from('notifications').insert({
    user_id: bid.freelancer_id,
    type: 'bid',
    title: notifTitle,
    body: notifBody,
    link: 'chat',
  });
}
