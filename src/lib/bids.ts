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

export async function acceptBid(
  bid: { id: string; project_id: string; freelancer_id: string; bid_amount: number; delivery_days: number },
  employerId: string,
  notifTitle: string,
  notifBody: string
) {
  // Guard against double-clicks / the same bid being accepted from two
  // places (Board + Chat) — an order already exists for this bid means
  // it was accepted before, so skip creating a duplicate. orders.bid_id
  // also has a DB-level unique constraint as a second line of defense.
  const { data: existingOrder } = await supabase.from('orders').select('id').eq('bid_id', bid.id).maybeSingle();
  if (existingOrder) return;

  await supabase.from('bids').update({ status: 'accepted' }).eq('id', bid.id);
  await supabase.from('bids').update({ status: 'rejected' }).eq('project_id', bid.project_id).neq('id', bid.id);
  await supabase.from('projects').update({ status: 'in_progress' }).eq('id', bid.project_id);
  // An order-created DB trigger creates the linked Kanban task for the
  // freelancer (the employer's session can't write to that task row
  // directly under RLS), and moves it between columns as the order's
  // status changes.
  //
  // Starts 'pending' (not 'active') so the employer can still tweak the
  // price/deadline and the freelancer has to explicitly confirm the
  // (possibly revised) terms before the delivery countdown starts.
  const { error: orderError } = await supabase.from('orders').insert({
    project_id: bid.project_id,
    bid_id: bid.id,
    buyer_id: employerId,
    seller_id: bid.freelancer_id,
    price: bid.bid_amount,
    status: 'pending',
    delivery_deadline: new Date(Date.now() + bid.delivery_days * 86400000).toISOString(),
  });
  if (orderError) return; // unique violation: another request already created the order

  await supabase.from('notifications').insert({
    user_id: bid.freelancer_id,
    type: 'bid',
    title: notifTitle,
    body: notifBody,
    link: 'orders',
  });
}
