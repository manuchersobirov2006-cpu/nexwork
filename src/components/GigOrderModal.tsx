import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { t } from '../lib/i18n';
import { formatPrice } from '../lib/format';
import { Modal, Spinner } from './ui';
import type { Gig, GigPackage, GigExtra } from '../lib/types';
import { Check, ShoppingCart, Clock, RotateCcw } from 'lucide-react';

const TIER_ORDER: GigPackage['tier'][] = ['basic', 'standard', 'premium'];

export function GigOrderModal({ gig, onClose, onOrdered }: {
  gig: Gig;
  onClose: () => void;
  onOrdered?: () => void;
}) {
  const { profile: viewer } = useAuth();
  const [packages, setPackages] = useState<GigPackage[]>([]);
  const [extras, setExtras] = useState<GigExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<GigPackage['tier']>('basic');
  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<string>>(new Set());
  const [requirements, setRequirements] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: pkgs }, { data: exts }] = await Promise.all([
      supabase.from('gig_packages').select('*').eq('gig_id', gig.id),
      supabase.from('gig_extras').select('*').eq('gig_id', gig.id),
    ]);
    setPackages(((pkgs as GigPackage[] | null) ?? []).sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)));
    setExtras((exts as GigExtra[] | null) ?? []);
    setLoading(false);
  }, [gig.id]);

  useEffect(() => { load(); }, [load]);

  const activePackage = packages.find(p => p.tier === selectedTier);
  const selectedExtras = extras.filter(e => selectedExtraIds.has(e.id));
  const totalPrice = (activePackage?.price ?? gig.price) + selectedExtras.reduce((sum, e) => sum + e.price, 0);
  const totalDays = Math.max(1, (activePackage?.delivery_days ?? gig.delivery_days) + selectedExtras.reduce((sum, e) => sum + e.delivery_days_delta, 0));

  const toggleExtra = (id: string) => {
    setSelectedExtraIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleOrder = async () => {
    if (!viewer) return;
    setOrdering(true);
    const { data } = await supabase.from('orders').insert({
      gig_id: gig.id,
      gig_package_id: activePackage?.id ?? null,
      selected_extras: selectedExtras.map(e => ({ id: e.id, title: e.title, price: e.price })),
      buyer_id: viewer.id,
      seller_id: gig.seller_id,
      price: totalPrice,
      requirements: requirements.trim() || null,
      delivery_deadline: new Date(Date.now() + totalDays * 86400000).toISOString(),
      status: 'pending',
    }).select('id').single();
    setOrdering(false);
    if (data) {
      await supabase.from('notifications').insert({
        user_id: gig.seller_id, type: 'order', title: t('gigs.newOrder.title'),
        body: `${t('gigs.newOrder.body')} "${gig.title}"`, link: 'orders',
      });
      setSuccess(true);
      onOrdered?.();
      setTimeout(onClose, 1200);
    }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={gig.title}>
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner className="w-6 h-6 text-brand-600" /></div>
        ) : (
          <>
            {packages.length > 1 && (
              <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${packages.length}, minmax(0, 1fr))` }}>
                {packages.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedTier(p.tier)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${selectedTier === p.tier ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-[#232a3d]'}`}
                  >
                    <div className="text-xs font-bold uppercase text-slate-500 mb-1">{p.title}</div>
                    <div className="font-bold text-slate-900 dark:text-white">{formatPrice(p.price)}</div>
                  </button>
                ))}
              </div>
            )}

            {activePackage && (
              <div className="card p-4 mb-4">
                {activePackage.description && <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{activePackage.description}</p>}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-slate-500"><Clock className="w-4 h-4" /> {activePackage.delivery_days} {t('gigs.days')}</span>
                  <span className="flex items-center gap-1 text-slate-500"><RotateCcw className="w-4 h-4" /> {activePackage.revisions} {t('gigs.revisions')}</span>
                </div>
              </div>
            )}

            {extras.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">{t('portfolio.myGigs.extras.title')}</h3>
                <div className="space-y-2">
                  {extras.map(e => (
                    <label key={e.id} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-[#161c2b]/50 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={selectedExtraIds.has(e.id)} onChange={() => toggleExtra(e.id)} className="w-4 h-4 rounded" />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{e.title}</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">+{formatPrice(e.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="label">{t('gigs.requirements')}</label>
              <textarea value={requirements} onChange={e => setRequirements(e.target.value)} rows={3} placeholder={t('gigs.requirements.placeholder')} className="input mb-4" />
            </div>

            {success ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 text-sm">
                <Check className="w-4 h-4 shrink-0" /> {t('profileModal.order.success')}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
                <div>
                  <div className="text-xs text-slate-500">{totalDays} {t('gigs.days')}</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{formatPrice(totalPrice)}</div>
                </div>
                <button onClick={handleOrder} disabled={ordering} className="btn-primary">
                  {ordering ? <Spinner className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                  {t('gigs.orderFor')} {formatPrice(totalPrice)}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
