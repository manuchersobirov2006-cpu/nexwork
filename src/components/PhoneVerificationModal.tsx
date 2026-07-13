import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Modal, Spinner } from './ui';
import { t } from '../lib/i18n';
import { Phone, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

export function PhoneVerificationModal({ open, onClose, onVerified }: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const { profile, updateProfile } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizePhone = (p: string): string => {
    let cleaned = p.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('998')) return '+' + cleaned;
    if (cleaned.startsWith('8')) return '+998' + cleaned.slice(1);
    return '+998' + cleaned;
  };

  const isValidPhone = (p: string): boolean => {
    const normalized = normalizePhone(p);
    return /^\+\d{10,15}$/.test(normalized);
  };

  const handleSendCode = async () => {
    setError(null);
    const normalized = normalizePhone(phone);
    if (!isValidPhone(phone)) {
      setError(t('phone.invalidFormat'));
      return;
    }

    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: { shouldCreateUser: false },
    });
    setLoading(false);

    if (otpError) {
      if (otpError.message.includes('not enabled') || otpError.message.includes('provider')) {
        setError(t('phone.smsNotConfigured'));
      } else if (otpError.message.includes('rate')) {
        setError(t('phone.tooManyAttempts'));
      } else {
        setError(t('phone.sendError') + ' ' + otpError.message);
      }
      return;
    }

    setStep('code');
  };

  const handleVerifyCode = async () => {
    setError(null);
    if (code.length < 6) {
      setError(t('phone.enterCode'));
      return;
    }

    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone),
      token: code,
      type: 'sms',
    });
    setLoading(false);

    if (verifyError) {
      if (verifyError.message.includes('expired')) {
        setError(t('phone.codeExpired'));
      } else if (verifyError.message.includes('invalid') || verifyError.message.includes('Token')) {
        setError(t('phone.invalidCode'));
      } else {
        setError(t('phone.verifyError') + ' ' + verifyError.message);
      }
      return;
    }

    const normalized = normalizePhone(phone);
    await updateProfile({
      phone: normalized,
      verification_level: profile?.verification_level === 'none' ? 'phone' : profile?.verification_level,
    });
    setStep('phone');
    setCode('');
    onVerified();
  };

  const handleClose = () => {
    setStep('phone');
    setCode('');
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} size="sm" title={t('phone.title')}>
      <div className="p-6">
        {step === 'phone' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl">
              <Phone className="w-5 h-5 text-brand-600 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300">{t('phone.intro')}</p>
            </div>
            <div>
              <label className="label">{t('phone.number')}</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="input"
                autoFocus
              />
            </div>
            {error && <div className="px-4 py-3 bg-error-50 dark:bg-error-900/20 text-error-700 text-sm rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
            <button onClick={handleSendCode} disabled={loading || !phone} className="btn-primary w-full">
              {loading ? <Spinner className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              {t('phone.sendCode')}
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-success-50 dark:bg-success-900/20 rounded-xl">
              <CheckCircle className="w-5 h-5 text-success-600 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300">{t('phone.codeSentTo')} {normalizePhone(phone)}</p>
            </div>
            <div>
              <label className="label">{t('phone.smsCode')}</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="input text-center text-lg tracking-widest"
                autoFocus
              />
            </div>
            {error && <div className="px-4 py-3 bg-error-50 dark:bg-error-900/20 text-error-700 text-sm rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
            <div className="flex gap-2">
              <button onClick={() => setStep('phone')} className="btn-secondary flex-1">{t('phone.back')}</button>
              <button onClick={handleVerifyCode} disabled={loading || code.length < 6} className="btn-primary flex-1">
                {loading ? <Spinner className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                {t('phone.verify')}
              </button>
            </div>
            <button onClick={handleSendCode} disabled={loading} className="text-sm text-brand-600 hover:text-brand-700 w-full text-center">
              {t('phone.resend')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
