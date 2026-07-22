import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { t } from '../lib/i18n';
import { formatPrice, formatDate } from '../lib/format';
import { isTopSpecialist } from '../lib/freelancerLevel';
import { Spinner, LevelBadge } from './ui';
import type { Profile, BadgeRequest } from '../lib/types';
import { Star, Clock } from 'lucide-react';

const PRICE_PER_MONTH = 99000;
const MONTH_OPTIONS = [1, 3, 12];

export function TopBadgeSection({ profile }: { profile: Profile }) {
  const [months, setMonths] = useState(1);
  const [pending, setPending] = useState<BadgeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('badge_requests')
      .select('*')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setPending(data as BadgeRequest | null);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  const handleRequest = async () => {
    setSubmitting(true);
    await supabase.from('badge_requests').insert({
      user_id: profile.id,
      amount: PRICE_PER_MONTH * months,
      months,
    });
    setSubmitting(false);
    load();
  };

  const active = isTopSpecialist(profile);

  return (
    <div className="card p-6 mt-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Star className="w-4 h-4" />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white">{t('badge.title')}</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">{t('badge.subtitle')}</p>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner className="w-5 h-5 text-brand-600" /></div>
      ) : active ? (
        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
          <LevelBadge />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {profile.premium_until ? `${t('badge.activeUntil')} ${formatDate(profile.premium_until)}` : t('badge.activeForever')}
          </span>
        </div>
      ) : pending ? (
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
          <Clock className="w-5 h-5 text-slate-400 shrink-0" />
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">{t('badge.pending')}</div>
            <div className="text-xs text-slate-500">{formatPrice(pending.amount)} · {pending.months} {t('badge.months')}</div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 mb-3">
            {MONTH_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${months === m ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-[#232a3d] text-slate-600 dark:text-slate-300'}`}
              >
                {m} {t('badge.months')}
              </button>
            ))}
          </div>
          <button onClick={handleRequest} disabled={submitting} className="btn-primary w-full">
            {submitting && <Spinner className="w-4 h-4" />}
            {t('badge.request')} — {formatPrice(PRICE_PER_MONTH * months)}
          </button>
          <p className="text-[11px] text-slate-400 mt-2">{t('badge.requestHint')}</p>
        </div>
      )}
    </div>
  );
}
