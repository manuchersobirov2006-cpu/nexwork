import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { t } from '../lib/i18n';
import { Modal, Spinner } from './ui';
import { isPushSupported, isIosNotStandalone, subscribeToPush } from '../lib/pushNotifications';
import { BellRing, Info, Share, PlusSquare, Smartphone, Check } from 'lucide-react';

export function EnableNotificationsModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const [pushSupported, setPushSupported] = useState(true);
  const [pushNeedsHomeScreen, setPushNeedsHomeScreen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isIosNotStandalone()) {
      setPushSupported(false);
      setPushNeedsHomeScreen(true);
      return;
    }
    if (!isPushSupported()) setPushSupported(false);
  }, []);

  const handleEnable = async () => {
    if (!profile) return;
    setError(null);
    setEnabling(true);
    const { error: err } = await subscribeToPush(profile.id);
    setEnabling(false);
    if (err === 'denied') {
      setError(t('settings.push.deniedError'));
    } else if (err) {
      setError(t('settings.push.genericError'));
    } else {
      setSuccess(true);
      setTimeout(onClose, 1200);
    }
  };

  return (
    <Modal open onClose={onClose} size="sm" title={t('notifPrompt.title')}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('notifPrompt.description')}</p>
        </div>

        {pushNeedsHomeScreen && (
          <div className="mb-4">
            <div className="flex gap-2 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 mb-4">
              <Info className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300">{t('settings.push.iosWhy')}</p>
            </div>
            <div className="space-y-3">
              {[
                { icon: Share, text: t('settings.push.iosStep1') },
                { icon: PlusSquare, text: t('settings.push.iosStep2') },
                { icon: Smartphone, text: t('settings.push.iosStep3') },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <step.icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-300">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-error-600 mb-3">{error}</p>}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 text-sm mb-3">
            <Check className="w-4 h-4 shrink-0" /> {t('notifPrompt.success')}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {pushSupported && !success && (
            <button onClick={handleEnable} disabled={enabling} className="btn-primary flex-1">
              {enabling ? <Spinner className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
              {t('notifPrompt.enable')}
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">{t('notifPrompt.skip')}</button>
        </div>
      </div>
    </Modal>
  );
}
