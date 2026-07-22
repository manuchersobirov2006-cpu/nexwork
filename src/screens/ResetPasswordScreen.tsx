import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui';
import { t } from '../lib/i18n';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';

export function ResetPasswordScreen() {
  const { updatePassword, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) setError(error);
    else setDone(true);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0a0e17] p-4">
      <div className="w-full max-w-sm card p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 overflow-hidden">
            <img src="/logo.svg" alt="Nexwork" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('auth.resetPassword.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('auth.resetPassword.subtitle')}</p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-success-600" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('auth.resetPassword.success')}</p>
            <button onClick={clearPasswordRecovery} className="btn-primary w-full">{t('auth.resetPassword.continue')}</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.resetPassword.newPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">{t('auth.resetPassword.confirmPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" className="input pl-10" />
              </div>
            </div>
            {error && (
              <div className="px-4 py-3 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 text-sm rounded-xl">{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner className="w-4 h-4" /> : null}
              {t('auth.resetPassword.save')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
