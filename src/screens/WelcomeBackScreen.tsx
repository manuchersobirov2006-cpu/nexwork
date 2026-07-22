import { useState } from 'react';
import { AuthModal } from '../components/AuthModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { t } from '../lib/i18n';

export function WelcomeBackScreen({ onShowLanding }: { onShowLanding: () => void }) {
  const [authOpen, setAuthOpen] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0a0e17]">
      <div className="p-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 overflow-hidden">
            <img src="/logo.svg" alt="Nexwork" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">{t('welcomeBack.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{t('welcomeBack.subtitle')}</p>
          <button
            onClick={() => { setAuthMode('signin'); setAuthOpen(true); }}
            className="btn-primary w-full mb-3"
          >
            {t('auth.signIn')}
          </button>
          <button
            onClick={() => { setAuthMode('signup'); setAuthOpen(true); }}
            className="btn-secondary w-full mb-4"
          >
            {t('auth.signUp')}
          </button>
          <button onClick={onShowLanding} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            {t('welcomeBack.viewSite')}
          </button>
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} />
    </div>
  );
}
