import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { t } from '../lib/i18n';
import { Modal, Spinner } from './ui';
import { Building2 } from 'lucide-react';

export function RoleSwitchRequiredModal({ onClose }: { onClose: () => void }) {
  const { updateProfile } = useAuth();
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async () => {
    setSwitching(true);
    await updateProfile({ role: 'employer' });
    setSwitching(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="sm" title={t('order.roleRequired.title')}>
      <div className="p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto">
          <Building2 className="w-7 h-7 text-brand-600" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('order.roleRequired.description')}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">{t('gigs.cancel')}</button>
          <button onClick={handleSwitch} disabled={switching} className="btn-primary flex-1">
            {switching && <Spinner className="w-4 h-4" />} {t('order.roleRequired.switch')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
