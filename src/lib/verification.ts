import type { Profile } from './types';

export function isIdentityVerified(profile: Profile | null): boolean {
  if (!profile) return false;
  return profile.verification_level === 'identity' || profile.verification_level === 'full';
}

export function needsIdentityVerification(profile: Profile | null): boolean {
  return !!profile && profile.role === 'freelancer' && !isIdentityVerified(profile);
}
