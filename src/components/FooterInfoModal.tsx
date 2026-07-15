import { Modal } from './ui';
import { t } from '../lib/i18n';
import { Send, Phone } from 'lucide-react';

const NEXWORK_TG = 'https://t.me/nexwork_uz';
const NEXWORK_PHONE = '+998200103133';

export type FooterInfoKey = 'about' | 'terms' | 'privacy' | 'support';

export function FooterInfoModal({ topic, onClose }: { topic: FooterInfoKey; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="md" title={t(`footer.${topic}.title`)}>
      <div className="p-6">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t(`footer.${topic}.body`)}</p>

        {topic === 'support' && (
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <a
              href={NEXWORK_TG}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Telegram</div>
                <div className="text-xs text-slate-500">@nexwork_uz</div>
              </div>
            </a>
            <a
              href={`tel:${NEXWORK_PHONE}`}
              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{NEXWORK_PHONE}</div>
              </div>
            </a>
          </div>
        )}

        <button onClick={onClose} className="btn-secondary w-full mt-6">{t('footer.close')}</button>
      </div>
    </Modal>
  );
}
