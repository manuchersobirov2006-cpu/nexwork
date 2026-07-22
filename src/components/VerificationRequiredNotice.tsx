import { t } from '../lib/i18n';
import { ShieldAlert } from 'lucide-react';

export function VerificationRequiredNotice({ messageKey }: { messageKey: 'verify.required.bid' | 'verify.required.apply' | 'verify.required.gig' }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
      <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-900 dark:text-white text-sm">{t('verify.required.title')}</div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{t(messageKey)}</p>
        <button onClick={() => { window.location.hash = '/passport'; }} className="btn-primary text-sm mt-3">
          {t('verify.required.button')}
        </button>
      </div>
    </div>
  );
}
