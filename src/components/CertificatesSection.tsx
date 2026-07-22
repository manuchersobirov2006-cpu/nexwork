import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/format';
import { t } from '../lib/i18n';
import { EmptyState, Spinner } from './ui';
import type { Certificate } from '../lib/types';
import { Award, Send, ShieldCheck } from 'lucide-react';

const NEXWORK_TG = 'https://t.me/nexwork_uz';

export function CertificatesSection({ userId, publicId }: { userId: string; publicId: string }) {
  const [items, setItems] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setItems(data as Certificate[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleRequest = () => {
    const msg = `Здравствуйте! Хочу подтвердить сертификат. Мой ID: ${publicId}`;
    window.open(`${NEXWORK_TG}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="card p-6 mt-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" /> {t('certificates.title')}
        </h3>
        <button onClick={handleRequest} className="btn-secondary text-sm">
          <Send className="w-4 h-4" /> {t('certificates.request')}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">{t('certificates.hint')}</p>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner className="w-6 h-6 text-brand-600" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Award} title={t('certificates.empty.title')} description={t('certificates.empty.description')} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map(cert => (
            <div key={cert.id} className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-950/20 border border-amber-200 dark:border-amber-800/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-400/90 flex items-center justify-center shrink-0 shadow">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">{cert.title}</div>
                  {cert.issuer && <div className="text-xs text-slate-600 dark:text-slate-300 truncate">{cert.issuer}</div>}
                  <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                    <ShieldCheck className="w-3 h-3" /> {t('certificates.verifiedBy')}
                    {cert.issued_at && <span className="text-slate-400 dark:text-slate-500 font-normal"> · {formatDate(cert.issued_at)}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
