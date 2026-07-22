import { Send, Instagram, Facebook, MessageCircle, Linkedin, Youtube } from 'lucide-react';
import type { SocialLinks } from './types';

export const SOCIAL_PLATFORMS: {
  key: keyof SocialLinks;
  label: string;
  icon: typeof Send;
  placeholder: string;
  colorClass: string;
}[] = [
  { key: 'telegram', label: 'Telegram', icon: Send, placeholder: 'https://t.me/username', colorClass: 'bg-sky-500' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/username', colorClass: 'bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, placeholder: 'https://wa.me/998901234567', colorClass: 'bg-green-500' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/username', colorClass: 'bg-blue-600' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/username', colorClass: 'bg-blue-700' },
  { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@username', colorClass: 'bg-red-600' },
];

export function normalizeSocialUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
