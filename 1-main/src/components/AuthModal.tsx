import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Modal, Spinner } from './ui';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}

export function AuthModal({ open, onClose, mode: initialMode = 'signin' }: {
  open: boolean;
  onClose: () => void;
  mode?: 'signin' | 'signup';
}) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Пароль должен быть не менее 6 символов');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        onClose();
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        onClose();
      }
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setGoogleLoading(false);
    }
    // On success, the page redirects to Google OAuth — onClose will happen via redirect
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 mb-3">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white">
              <path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z" fill="currentColor" opacity="0.2"/>
              <path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {mode === 'signin' ? 'Вход в NexWork' : 'Регистрация'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'signin' ? 'Войдите в свой аккаунт' : 'Создайте аккаунт за минуту'}
          </p>
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-200 active:scale-95 disabled:opacity-50 mb-4"
        >
          {googleLoading ? <Spinner className="w-5 h-5" /> : <GoogleIcon />}
          Войти через Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400">или</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="label">Имя</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Иван Иванов" className="input pl-10" />
              </div>
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input pl-10" />
            </div>
          </div>

          <div>
            <label className="label">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input pl-10 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 text-sm rounded-xl">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner className="w-4 h-4" /> : null}
            {mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          {mode === 'signin' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} className="text-brand-600 hover:text-brand-700 font-semibold">
            {mode === 'signin' ? 'Регистрация' : 'Войти'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
