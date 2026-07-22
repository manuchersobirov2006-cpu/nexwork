import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BIPlG5s2cOH6D8g1bMv3j9VZqcp7v1aVFcie23ystdTXiNBmjN19uP1M2cmEnwcIH-tVsm8FszsEEJwQxDnIMEU';

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIosNotStandalone(): boolean {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  return isIos && !isStandalone;
}

const NOTIF_PROMPT_KEY = (uid: string) => `NexWork_notif_prompt_pending_${uid}`;

export function markNotifPromptPending(userId: string): void {
  localStorage.setItem(NOTIF_PROMPT_KEY(userId), '1');
}

export function consumeNotifPromptPending(userId: string): boolean {
  const key = NOTIF_PROMPT_KEY(userId);
  const pending = localStorage.getItem(key) === '1';
  if (pending) localStorage.removeItem(key);
  return pending;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64Safe);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function getPushSubscriptionStatus(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function isCurrentDeviceSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

export async function subscribeToPush(userId: string): Promise<{ error: string | null }> {
  if (!isPushSupported()) return { error: 'unsupported' };

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { error: 'denied' };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    }, { onConflict: 'endpoint' });

    return { error: error?.message ?? null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function unsubscribeFromPush(): Promise<{ error: string | null }> {
  if (!isPushSupported()) return { error: 'unsupported' };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
