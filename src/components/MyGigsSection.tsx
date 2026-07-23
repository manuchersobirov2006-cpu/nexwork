import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIES } from '../lib/constants';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { formatPrice } from '../lib/format';
import { Modal, Spinner, EmptyState, Badge, Toggle } from './ui';
import { GigImageUpload } from './GigImageUpload';
import { needsIdentityVerification } from '../lib/verification';
import { VerificationRequiredNotice } from './VerificationRequiredNotice';
import type { Gig, GigExtra, Profile } from '../lib/types';
import { Plus, Pencil, Trash2, Tag, X as XIcon, Check } from 'lucide-react';

export function MyGigsSection({ profile }: { profile: Profile }) {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGig, setEditingGig] = useState<Gig | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('gigs')
      .select('*')
      .eq('seller_id', profile.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });
    if (data) setGigs(data as Gig[]);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (gig: Gig) => {
    if (!window.confirm(t('portfolio.myGigs.deleteConfirm'))) return;
    await supabase.from('gigs').update({ status: 'deleted' }).eq('id', gig.id);
    setGigs(prev => prev.filter(g => g.id !== gig.id));
  };

  const handleToggleActive = async (gig: Gig) => {
    const nextStatus = gig.status === 'active' ? 'paused' : 'active';
    await supabase.from('gigs').update({ status: nextStatus }).eq('id', gig.id);
    setGigs(prev => prev.map(g => g.id === gig.id ? { ...g, status: nextStatus } : g));
  };

  return (
    <div className="card p-6 mt-6 animate-slide-up">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-900 dark:text-white">{t('portfolio.myGigs.title')}</h3>
        {!needsIdentityVerification(profile) && (
          <button onClick={() => { setEditingGig(null); setShowModal(true); }} className="btn-secondary text-sm">
            <Plus className="w-4 h-4" /> {t('gigs.create')}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">{t('portfolio.myGigs.subtitle')}</p>

      {needsIdentityVerification(profile) && (
        <div className="mb-4"><VerificationRequiredNotice messageKey="verify.required.gig" /></div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-brand-600" /></div>
      ) : gigs.length === 0 ? (
        <EmptyState icon={Tag} title={t('portfolio.myGigs.empty.title')} description={t('portfolio.myGigs.empty.description')} />
      ) : (
        <div className="space-y-2">
          {gigs.map(gig => (
            <div key={gig.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
              {gig.image_urls[0] ? (
                <img src={gig.image_urls[0]} alt={gig.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5 text-brand-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{gig.title}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  {formatPrice(gig.price)}
                  <Badge color={gig.status === 'active' ? 'green' : 'slate'}>
                    {gig.status === 'active' ? t('portfolio.myGigs.status.active') : t('portfolio.myGigs.status.paused')}
                  </Badge>
                </div>
              </div>
              <Toggle checked={gig.status === 'active'} onChange={() => handleToggleActive(gig)} />
              <button onClick={() => { setEditingGig(gig); setShowModal(true); }} className="btn-ghost !p-1.5" title={t('portfolio.myGigs.edit')}>
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(gig)} className="btn-ghost !p-1.5 text-error-600" title={t('portfolio.myGigs.delete')}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <GigModal
          userId={profile.id}
          gig={editingGig}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

export function GigModal({ userId, gig, onClose, onSaved }: {
  userId: string;
  gig: Gig | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { language } = useTheme();
  const [title, setTitle] = useState(gig?.title || '');
  const [description, setDescription] = useState(gig?.description || '');
  const [category, setCategory] = useState(gig?.category || CATEGORIES[0].key);
  const [price, setPrice] = useState(gig?.price != null ? String(gig.price) : '');
  const [deliveryDays, setDeliveryDays] = useState(gig?.delivery_days ?? 3);
  const [tags, setTags] = useState<string[]>(gig?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(gig?.image_urls || []);
  const [saving, setSaving] = useState(false);
  const gigId = gig?.id || `temp-${userId.slice(0, 8)}-${Date.now()}`;

  type TierForm = { enabled: boolean; title: string; description: string; price: string; deliveryDays: string };
  const emptyTier = (defTitle: string): TierForm => ({ enabled: false, title: defTitle, description: '', price: '', deliveryDays: '' });
  const [standard, setStandard] = useState<TierForm>(emptyTier(t('portfolio.myGigs.tier.standard')));
  const [premium, setPremium] = useState<TierForm>(emptyTier(t('portfolio.myGigs.tier.premium')));

  const [extras, setExtras] = useState<{ id?: string; title: string; price: string }[]>([]);
  const [extraTitle, setExtraTitle] = useState('');
  const [extraPrice, setExtraPrice] = useState('');

  useEffect(() => {
    if (!gig) return;
    (async () => {
      const [{ data: pkgs }, { data: exts }] = await Promise.all([
        supabase.from('gig_packages').select('*').eq('gig_id', gig.id),
        supabase.from('gig_extras').select('*').eq('gig_id', gig.id),
      ]);
      const std = pkgs?.find(p => p.tier === 'standard');
      if (std) setStandard({ enabled: true, title: std.title, description: std.description || '', price: String(std.price), deliveryDays: String(std.delivery_days) });
      const prem = pkgs?.find(p => p.tier === 'premium');
      if (prem) setPremium({ enabled: true, title: prem.title, description: prem.description || '', price: String(prem.price), deliveryDays: String(prem.delivery_days) });
      if (exts) setExtras((exts as GigExtra[]).map(e => ({ id: e.id, title: e.title, price: String(e.price) })));
    })();
  }, [gig]);

  const addExtra = () => {
    if (!extraTitle.trim() || !extraPrice || Number(extraPrice) <= 0) return;
    setExtras(prev => [...prev, { title: extraTitle.trim(), price: extraPrice }]);
    setExtraTitle(''); setExtraPrice('');
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput('');
  };

  const priceNum = Number(price);

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || !price || priceNum <= 0) return;
    setSaving(true);
    const payload = {
      title: title.trim(), description: description.trim(), category, price: priceNum,
      delivery_days: deliveryDays, tags, image_urls: imageUrls,
    };
    let savedGigId = gig?.id;
    if (gig) {
      await supabase.from('gigs').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', gig.id);
    } else {
      const { data } = await supabase.from('gigs').insert({ seller_id: userId, ...payload, status: 'active' }).select('id').single();
      savedGigId = data?.id;
    }

    if (savedGigId) {
      await supabase.from('gig_packages').upsert({
        gig_id: savedGigId, tier: 'basic', title: t('portfolio.myGigs.tier.basic'),
        description: description.trim(), price: priceNum, delivery_days: deliveryDays,
      }, { onConflict: 'gig_id,tier' });

      if (standard.enabled && standard.price && Number(standard.price) > 0 && standard.deliveryDays) {
        await supabase.from('gig_packages').upsert({
          gig_id: savedGigId, tier: 'standard', title: standard.title.trim() || t('portfolio.myGigs.tier.standard'),
          description: standard.description.trim() || null, price: Number(standard.price),
          delivery_days: Number(standard.deliveryDays),
        }, { onConflict: 'gig_id,tier' });
      } else {
        await supabase.from('gig_packages').delete().eq('gig_id', savedGigId).eq('tier', 'standard');
      }

      if (premium.enabled && premium.price && Number(premium.price) > 0 && premium.deliveryDays) {
        await supabase.from('gig_packages').upsert({
          gig_id: savedGigId, tier: 'premium', title: premium.title.trim() || t('portfolio.myGigs.tier.premium'),
          description: premium.description.trim() || null, price: Number(premium.price),
          delivery_days: Number(premium.deliveryDays),
        }, { onConflict: 'gig_id,tier' });
      } else {
        await supabase.from('gig_packages').delete().eq('gig_id', savedGigId).eq('tier', 'premium');
      }

      await supabase.from('gig_extras').delete().eq('gig_id', savedGigId);
      const pendingExtra = extraTitle.trim() && Number(extraPrice) > 0 ? [{ title: extraTitle, price: extraPrice }] : [];
      const validExtras = [...extras, ...pendingExtra].filter(e => e.title.trim() && Number(e.price) > 0);
      if (validExtras.length > 0) {
        await supabase.from('gig_extras').insert(validExtras.map(e => ({
          gig_id: savedGigId, title: e.title.trim(), price: Number(e.price),
        })));
      }
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={gig ? t('portfolio.myGigs.edit') : t('gigs.new')}>
      <div className="p-6 space-y-4">
        <div>
          <label className="label">{t('gigs.name')}</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('gigs.name.placeholder')} className="input" />
        </div>

        <GigImageUpload userId={userId} gigId={gigId} existingImages={imageUrls} onImagesChange={setImageUrls} />

        <div>
          <label className="label">{t('gigs.description')}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder={t('gigs.description.placeholder')} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('gigs.category')}</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('gigs.priceLabel')}</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={price}
              onChange={e => setPrice(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}
              placeholder="0"
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label">{t('gigs.deliveryDays')}</label>
          <input type="number" value={deliveryDays} onChange={e => setDeliveryDays(Number(e.target.value))} min={1} className="input" />
        </div>
        <div>
          <label className="label">{t('gigs.tagsLabel')}</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder={t('gigs.tags.placeholder')} className="input" />
            <button onClick={addTag} className="btn-secondary">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                {tag}
                <button onClick={() => setTags(tags.filter(x => x !== tag))} className="ml-1">×</button>
              </span>
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-slate-200 dark:border-[#232a3d]">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">{t('portfolio.myGigs.packages.title')}</h4>
          <p className="text-xs text-slate-500 mb-3">{t('portfolio.myGigs.packages.subtitle')}</p>
          <div className="space-y-3">
            {([['standard', standard, setStandard], ['premium', premium, setPremium]] as const).map(([key, tier, setTier]) => (
              <div key={key} className="p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                <label className="group flex items-center gap-2.5 cursor-pointer mb-2 select-none">
                  <span className="relative w-5 h-5 shrink-0">
                    <input
                      type="checkbox"
                      checked={tier.enabled}
                      onChange={e => setTier({ ...tier, enabled: e.target.checked })}
                      className="peer sr-only"
                    />
                    <span className="absolute inset-0 rounded-md border-2 border-slate-300 dark:border-[#2c3549] bg-white dark:bg-[#161c2b] transition-all duration-200 peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400/50 group-hover:border-brand-400" />
                    <Check className="absolute inset-0 m-auto w-3.5 h-3.5 text-white scale-0 peer-checked:scale-100 transition-transform duration-200" strokeWidth={3} />
                  </span>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {key === 'standard' ? t('portfolio.myGigs.tier.standard') : t('portfolio.myGigs.tier.premium')}
                  </span>
                </label>
                {tier.enabled && (
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={tier.title} onChange={e => setTier({ ...tier, title: e.target.value })} placeholder={t('portfolio.myGigs.tier.name')} className="input input-sm col-span-3" />
                    <input type="text" inputMode="numeric" value={tier.price} onChange={e => setTier({ ...tier, price: e.target.value.replace(/\D/g, '') })} placeholder={t('gigs.priceLabel')} className="input input-sm" />
                    <input type="text" inputMode="numeric" value={tier.deliveryDays} onChange={e => setTier({ ...tier, deliveryDays: e.target.value.replace(/\D/g, '') })} placeholder={t('gigs.deliveryDays')} className="input input-sm" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-[#232a3d]">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">{t('portfolio.myGigs.extras.title')}</h4>
          <p className="text-xs text-slate-500 mb-3">{t('portfolio.myGigs.extras.subtitle')}</p>
          {extras.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {extras.map((ex, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-slate-50 dark:bg-[#161c2b]/50 rounded-lg">
                  <span className="flex-1 truncate">{ex.title}</span>
                  <span className="text-slate-500 shrink-0">+{ex.price}</span>
                  <button onClick={() => setExtras(prev => prev.filter((_, idx) => idx !== i))} className="text-error-600 shrink-0"><XIcon className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={extraTitle} onChange={e => setExtraTitle(e.target.value)} placeholder={t('portfolio.myGigs.extras.namePlaceholder')} className="input input-sm" />
            <input type="text" inputMode="numeric" value={extraPrice} onChange={e => setExtraPrice(e.target.value.replace(/\D/g, ''))} placeholder={t('gigs.priceLabel')} className="input input-sm" />
          </div>
          <button onClick={addExtra} className="btn-secondary text-xs mt-2"><Plus className="w-3.5 h-3.5" /> {t('portfolio.myGigs.extras.add')}</button>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
          <button onClick={onClose} className="btn-secondary">{t('gigs.cancel')}</button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !description.trim() || !price || priceNum <= 0} className="btn-primary">
            {saving && <Spinner className="w-4 h-4" />}
            {t('gigs.publish')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
