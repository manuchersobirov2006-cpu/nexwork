import { supabase } from './supabase';
import type { Order } from './types';

export const ORDER_SELECT = '*, gig:gig_id(*), project:project_id(*), buyer:buyer_id(*), seller:seller_id(*)';

async function notify(userId: string, title: string, body: string) {
  await supabase.from('notifications').insert({ user_id: userId, type: 'order', title, body, link: 'orders' });
}

export async function acceptOrder(order: Order, notifTitle: string, notifBody: string): Promise<Order | null> {
  const { data } = await supabase.from('orders').update({ status: 'active' }).eq('id', order.id).select(ORDER_SELECT).single();
  if (data) await notify(order.buyer_id, notifTitle, notifBody);
  return data as Order | null;
}

export async function updateOrderTerms(order: Order, price: number, deliveryDeadline: string | null, notifTitle: string, notifBody: string): Promise<Order | null> {
  const { data } = await supabase.from('orders').update({ price, delivery_deadline: deliveryDeadline }).eq('id', order.id).select(ORDER_SELECT).single();
  if (data) await notify(order.seller_id, notifTitle, notifBody);
  return data as Order | null;
}

export async function deliverOrder(order: Order, note: string, link: string, notifTitle: string, notifBody: string): Promise<Order | null> {
  const { data } = await supabase.from('orders').update({
    status: 'delivered',
    delivered_at: new Date().toISOString(),
    delivery_note: note.trim() || null,
    delivery_link: link.trim() || null,
  }).eq('id', order.id).select(ORDER_SELECT).single();
  if (data) await notify(order.buyer_id, notifTitle, notifBody);
  return data as Order | null;
}

export async function requestRevision(order: Order, days: number, notifTitle: string, notifBody: string): Promise<Order | null> {
  const deadline = new Date(Date.now() + Math.max(1, days) * 86400000).toISOString();
  const { data } = await supabase.from('orders').update({
    status: 'active',
    delivered_at: null,
    delivery_deadline: deadline,
  }).eq('id', order.id).select(ORDER_SELECT).single();
  if (data) await notify(order.seller_id, notifTitle, notifBody);
  return data as Order | null;
}

export async function completeOrder(order: Order, notifTitle: string, notifBody: string): Promise<Order | null> {
  const { data } = await supabase.from('orders').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', order.id).select(ORDER_SELECT).single();
  // Seller's completed_orders / gig's orders_count are bumped by an
  // on_order_completed DB trigger (the buyer's session can't write to
  // the seller's profile row directly under RLS).
  if (data) await notify(order.seller_id, notifTitle, notifBody);
  return data as Order | null;
}

export async function cancelOrder(order: Order, actingUserId: string, notifTitle: string, notifBody: string): Promise<Order | null> {
  const { data } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id).select(ORDER_SELECT).single();
  if (data) {
    const other = order.buyer_id === actingUserId ? order.seller_id : order.buyer_id;
    await notify(other, notifTitle, notifBody);
  }
  return data as Order | null;
}
