import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { CATEGORIES } from '../lib/constants';
import { formatPrice } from '../lib/format';
import { Avatar, Badge, LevelBadge, Stars, EmptyState, SkeletonCard } from '../components/ui';
import { GigOrderModal } from '../components/GigOrderModal';
import { UserProfileModal } from '../components/UserProfileModal';
import { GigModal } from '../components/MyGigsSection';
import { needsIdentityVerification } from '../lib/verification';
import { VerificationRequiredNotice } from '../components/VerificationRequiredNotice';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { isTopSpecialist } from '../lib/freelancerLevel';
import type { Gig, Profile } from '../lib/types';
import { Search, SlidersHorizontal, Tag, Clock, ShieldCheck, Plus, Pencil, Trash2, Pause, Play } from 'lucide-react';

function getGigCover(gig: Gig): string | null {
  if (gig.image_urls && gig.image_urls.length > 0) return gig.image_urls[0];
  if (gig.gallery && gig.gallery.length > 0) return gig.gallery[0];
  return null;
}

export function GigsScreen() {
  const { profile } = useAuth();
  const { language } = useTheme();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'price_low' | 'price_high'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [orderingGig, setOrderingGig] = useState<Gig | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGig, setEditingGig] = useState<Gig | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('gigs').select('*, seller:seller_id(*)').neq('status', 'deleted');
    query = profile ? query.or(`status.eq.active,seller_id.eq.${profile.id}`) : query.eq('status', 'active');
    if (category !== 'all') query = query.eq('category', category);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'popular') query = query.order('orders_count', { ascending: false });
    else if (sortBy === 'price_low') query = query.order('price', { ascending: true });
    else if (sortBy === 'price_high') query = query.order('price', { ascending: false });
    const { data } = await query.limit(60);
    if (data) {
      let list = data as Gig[];
      if (sortBy === 'newest' || sortBy === 'popular') {
        list = [...list].sort((a, b) => {
          const aSeller = a.seller as unknown as Profile | undefined;
          const bSeller = b.seller as unknown as Profile | undefined;
          const aTop = aSeller ? isTopSpecialist(aSeller) : false;
          const bTop = bSeller ? isTopSpecialist(bSeller) : false;
          return Number(bTop) - Number(aTop);
        });
      }
      setGigs(list);
    }
    setLoading(false);
  }, [category, search, sortBy, profile]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e: React.MouseEvent, gig: Gig) => {
    e.stopPropagation();
    if (!window.confirm(t('portfolio.myGigs.deleteConfirm'))) return;
    await supabase.from('gigs').update({ status: 'deleted' }).eq('id', gig.id);
    setGigs(prev => prev.filter(g => g.id !== gig.id));
  };

  const handleToggleActive = async (e: React.MouseEvent, gig: Gig) => {
    e.stopPropagation();
    const nextStatus = gig.status === 'active' ? 'paused' : 'active';
    await supabase.from('gigs').update({ status: nextStatus }).eq('id', gig.id);
    setGigs(prev => prev.map(g => g.id === gig.id ? { ...g, status: nextStatus } : g));
  };

  const catLabel = (key: string) => {
    const c = CATEGORIES.find(c => c.key === key);
    if (!c) return key;
    return language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('gigs.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('gigs.subtitle')}</p>
        </div>
        {profile?.role === 'freelancer' && !needsIdentityVerification(profile) && (
          <button onClick={() => setShowCreate(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> {t('gigs.create')}
          </button>
        )}
      </div>

      {profile?.role === 'freelancer' && needsIdentityVerification(profile) && (
        <div className="mb-6"><VerificationRequiredNotice messageKey="verify.required.gig" /></div>
      )}

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('gigs.search')} className="input pl-10" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="input sm:w-52">
            <option value="newest">{t('gigs.sort.newest')}</option>
            <option value="popular">{t('gigs.sort.popular')}</option>
            <option value="price_low">{t('gigs.sort.priceLow')}</option>
            <option value="price_high">{t('gigs.sort.priceHigh')}</option>
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
            <SlidersHorizontal className="w-4 h-4" />
            {t('gigs.filters')}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#232a3d] animate-slide-down">
            <label className="label">{t('gigs.category')}</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input sm:w-64">
              <option value="all">{t('gigs.allCategories')}</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{catLabel(c.key)}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : gigs.length === 0 ? (
        <EmptyState icon={Tag} title={t('gigs.notFound.title')} description={t('gigs.notFound.description')} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gigs.map(gig => {
            const seller = gig.seller as unknown as Profile | undefined;
            const cover = getGigCover(gig);
            const isOwn = profile?.id === gig.seller_id;
            return (
              <div
                key={gig.id}
                onClick={() => { if (profile && !isOwn) setOrderingGig(gig); }}
                className={`card overflow-hidden hover:shadow-card-hover transition-all duration-200 group animate-fade-in ${isOwn ? '' : 'cursor-pointer'}`}
              >
                <div className="relative h-36 bg-slate-100 dark:bg-[#161c2b] overflow-hidden">
                  {cover ? (
                    <img src={cover} alt={gig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <Badge color="blue" className="backdrop-blur-sm bg-white/90 dark:bg-[#10141f]/90">{catLabel(gig.category)}</Badge>
                  </div>
                  {isOwn && (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <Badge color={gig.status === 'active' ? 'green' : 'slate'} className="backdrop-blur-sm bg-white/90 dark:bg-[#10141f]/90">
                        {gig.status === 'active' ? t('portfolio.myGigs.status.active') : t('portfolio.myGigs.status.paused')}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); if (seller) setViewingProfileId(seller.id); }}
                    className="flex items-center gap-2 mb-2 hover:underline"
                  >
                    <Avatar src={seller?.avatar_url ?? undefined} name={seller?.display_name || seller?.email} size={20} />
                    <span className="text-xs text-slate-500 truncate">{seller?.display_name || seller?.full_name || t('gigs.expert')}</span>
                    {seller?.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                  </button>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 mb-2 min-h-[2.5rem]">{gig.title}</h3>
                  {seller && isTopSpecialist(seller) && <div className="mb-2"><LevelBadge /></div>}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{gig.delivery_days} {t('gigs.days')}</span>
                    {gig.rating > 0 && (
                      <span className="flex items-center gap-1"><Stars rating={gig.rating} size={10} />{gig.rating}</span>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400">{t('gigs.from')}</div>
                      <div className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatPrice(gig.price)}</div>
                    </div>
                    {isOwn ? (
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => handleToggleActive(e, gig)} className="btn-ghost !p-1.5" title={gig.status === 'active' ? t('portfolio.myGigs.pause') : t('portfolio.myGigs.activate')}>
                          {gig.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingGig(gig); }} className="btn-ghost !p-1.5" title={t('portfolio.myGigs.edit')}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDelete(e, gig)} className="btn-ghost !p-1.5 text-error-600" title={t('portfolio.myGigs.delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : profile && (
                      <button onClick={(e) => { e.stopPropagation(); setOrderingGig(gig); }} className="btn-secondary !px-3 !py-1.5 text-xs">
                        {t('gigs.details')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {orderingGig && (
        <GigOrderModal gig={orderingGig} onClose={() => setOrderingGig(null)} />
      )}

      {viewingProfileId && (
        <UserProfileModal userId={viewingProfileId} onClose={() => setViewingProfileId(null)} />
      )}

      {showCreate && profile && (
        <GigModal
          userId={profile.id}
          gig={null}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}

      {editingGig && profile && (
        <GigModal
          userId={profile.id}
          gig={editingGig}
          onClose={() => setEditingGig(null)}
          onSaved={() => { setEditingGig(null); load(); }}
        />
      )}
    </div>
  );
}
