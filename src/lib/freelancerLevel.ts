import type { Profile } from './types';

export function isTopSpecialist(p: Pick<Profile, 'is_premium' | 'premium_until'>): boolean {
  if (!p.is_premium) return false;
  if (!p.premium_until) return true;
  return new Date(p.premium_until).getTime() > Date.now();
}

// Rating alone rewards a single 5-star review as much as a track record — weight
// by volume (orders + reviews) so quality ranking favors proven specialists.
export function getQualityScore(p: Pick<Profile, 'rating' | 'completed_orders' | 'review_count'>): number {
  return p.rating * Math.log10(p.completed_orders + p.review_count + 2);
}
