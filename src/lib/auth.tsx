import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  needsOnboarding: boolean;
  needsRoleSelection: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  completeOnboarding: () => void;
  setRoleAndComplete: (role: 'freelancer' | 'employer') => Promise<void>;
  isPasswordRecovery: boolean;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  clearPasswordRecovery: () => void;
  needsMfaVerification: boolean;
  verifyMfaChallenge: (code: string) => Promise<{ error: string | null }>;
  mfaEnroll: () => Promise<{ factorId: string | null; qrCode: string | null; secret: string | null; error: string | null }>;
  mfaVerifyEnrollment: (factorId: string, code: string) => Promise<{ error: string | null }>;
  mfaUnenroll: (factorId: string) => Promise<{ error: string | null }>;
  mfaListFactors: () => Promise<{ id: string; status: string }[]>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ONBOARDING_KEY = (uid: string) => `NexWork_onboarding_done_${uid}`;
export const DEVICE_REMEMBERED_KEY = 'NexWork_device_remembered';

function markDeviceRemembered() {
  localStorage.setItem(DEVICE_REMEMBERED_KEY, '1');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [needsMfaVerification, setNeedsMfaVerification] = useState(false);

  const checkMfaLevel = useCallback(async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
      setNeedsMfaVerification(true);
    } else {
      setNeedsMfaVerification(false);
    }
  }, []);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) {
      console.error('Profile load error:', error);
      return null;
    }

    if (data) {
      const p = data as Profile;
      setProfile(p);
      const onboarded = localStorage.getItem(ONBOARDING_KEY(uid));
      // Google users: have a name but no role chosen yet (default 'freelancer' with no bio/categories)
      const looksLikeGoogleUser = !onboarded && p.role === 'freelancer' && !p.bio && (!p.categories || p.categories.length === 0) && p.verification_level === 'none';
      setNeedsRoleSelection(looksLikeGoogleUser && !p.phone);
      setNeedsOnboarding(!onboarded && !looksLikeGoogleUser && (!p.categories || p.categories.length === 0) && !p.bio);
      return p;
    }
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        markDeviceRemembered();
        checkMfaLevel();
        loadProfile(session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        markDeviceRemembered();
        checkMfaLevel();
        (async () => {
          await loadProfile(session.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile, checkMfaLevel]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, display_name: fullName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      localStorage.removeItem(ONBOARDING_KEY(data.user.id));
    }
    return { error: null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsPasswordRecovery(false);
    return { error: error?.message ?? null };
  }, []);

  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  const mfaListFactors = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    return (data?.totp ?? []).map(f => ({ id: f.id, status: f.status }));
  }, []);

  const mfaEnroll = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) return { factorId: null, qrCode: null, secret: null, error: error.message };
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, error: null };
  }, []);

  const mfaVerifyEnrollment = useCallback(async (factorId: string, code: string) => {
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) return { error: challengeError.message };
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (!error) setNeedsMfaVerification(false);
    return { error: error?.message ?? null };
  }, []);

  const mfaUnenroll = useCallback(async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    return { error: error?.message ?? null };
  }, []);

  const verifyMfaChallenge = useCallback(async (code: string) => {
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) return { error: listError.message };
    const factor = factors.totp.find(f => f.status === 'verified');
    if (!factor) return { error: 'No verified 2FA factor found' };
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError) return { error: challengeError.message };
    const { error } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code });
    if (!error) setNeedsMfaVerification(false);
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user' };
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : prev);
    }
    return { error: error?.message ?? null };
  }, [user]);

  const completeOnboarding = useCallback(() => {
    if (user) {
      localStorage.setItem(ONBOARDING_KEY(user.id), 'true');
      setNeedsOnboarding(false);
      setNeedsRoleSelection(false);
    }
  }, [user]);

  const setRoleAndComplete = useCallback(async (role: 'freelancer' | 'employer') => {
    if (!user) return;
    await updateProfile({ role });
    localStorage.setItem(ONBOARDING_KEY(user.id), 'true');
    setNeedsRoleSelection(false);
    setNeedsOnboarding(false);
  }, [user, updateProfile]);

  const value: AuthContextValue = {
    session,
    user,
    profile,
    loading,
    needsOnboarding,
    needsRoleSelection,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile,
    completeOnboarding,
    setRoleAndComplete,
    isPasswordRecovery,
    requestPasswordReset,
    updatePassword,
    clearPasswordRecovery,
    needsMfaVerification,
    verifyMfaChallenge,
    mfaEnroll,
    mfaVerifyEnrollment,
    mfaUnenroll,
    mfaListFactors,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
