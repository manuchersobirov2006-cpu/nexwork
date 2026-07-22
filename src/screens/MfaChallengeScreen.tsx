import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui';
import { t } from '../lib/i18n';
import { ShieldCheck } from 'lucide-react';

export function MfaChallengeScreen() {
  const { verifyMfaChallenge, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await verifyMfaChallenge(code.trim());
    setLoading(false);
    if (error) setError(error);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0a0e17] p-4">
      <div className="w-full max-w-sm card p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('mfa.challenge.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('mfa.challenge.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="input text-center text-2xl tracking-[0.5em] font-mono"
          />
          {error && (
            <div className="px-4 py-3 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 text-sm rounded-xl">{error}</div>
          )}
          <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
            {loading ? <Spinner className="w-4 h-4" /> : null}
            {t('mfa.challenge.verify')}
          </button>
          <button type="button" onClick={signOut} className="w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            {t('nav.logout')}
          </button>
        </form>
      </div>
    </div>
  );
}
