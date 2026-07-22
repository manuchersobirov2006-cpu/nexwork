import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { CATEGORIES, pexelsImage } from '../lib/constants';
import { formatPrice } from '../lib/format';
import { t } from '../lib/i18n';
import { Avatar, EmptyState, Modal, Spinner, Stars } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AuthModal } from '../components/AuthModal';
import { isTopSpecialist } from '../lib/freelancerLevel';
import type { Gig, Profile } from '../lib/types';
import { Search, Package, Clock, MessageCircle, ShoppingCart, Users, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';

const FALLBACK_IMAGES = [
  pexelsImage(3184465), pexelsImage(1966452), pexelsImage(3184292),
  pexelsImage(270404), pexelsImage(3184360), pexelsImage(1181244),
];

function getGigCover(gig: Gig): string {
  if (gig.image_urls && gig.image_urls.length > 0) return gig.image_urls[0];
  if (gig.gallery && gig.gallery.length > 0) return gig.gallery[0];
  const idx = (gig.title.charCodeAt(0) || 0) % FALLBACK_IMAGES.length;
  return FALLBACK_IMAGES[idx];
}

export function GuestBrowseScreen({ initialQuery, initialCategory, initialMode }: { initialQuery?: string; initialCategory?: string; initialMode?: string }) {
  const { session } = useAuth();
  const { language } = useTheme();
  const [mode, setMode] = useState<'gigs' | 'specialists'>(initialMode === 'specialists' ? 'specialists' : 'gigs');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [specialists, setSpecialists] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialQuery || '');
  const [category, setCategory] = useState(initialCategory || 'all');
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const catLabel = (key: string) => {
    const c = CATEGORIES.find(c => c.key === key);
    if (!c) return key;
    return language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label;
  };

  const loadGigs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('gigs').select('*, seller:seller_id(*)').eq('status', 'active');
    if (category !== 'all') query = query.eq('category', category);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    const { data } = await query.order('created_at', { ascending: false }).limit(50);
    if (data) {
      const list = [...(data as Gig[])].sort((a, b) => {
        const aSeller = a.seller as unknown as Profile | undefined;
        const bSeller = b.seller as unknown as Profile | undefined;
        return Number(bSeller ? isTopSpecialist(bSeller) : false) - Number(aSeller ? isTopSpecialist(aSeller) : false);
      });
      setGigs(list);
    }
    setLoading(false);
  }, [category, search]);

  const loadSpecialists = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*').eq('role', 'freelancer').in('verification_level', ['identity', 'full']);
    if (category !== 'all') query = query.contains('categories', [category]);
    if (search) query = query.or(`display_name.ilike.%${search}%,full_name.ilike.%${search}%`);
    const { data } = await query.order('rating', { ascending: false }).limit(50);
    if (data) {
      const list = [...(data as Profile[])].sort((a, b) => Number(isTopSpecialist(b)) - Number(isTopSpecialist(a)));
      setSpecialists(list);
    }
    setLoading(false);
  }, [category, search]);

  useEffect(() => { if (mode === 'gigs') loadGigs(); else loadSpecialists(); }, [mode, loadGigs, loadSpecialists]);

  // Dynamic <title>/description per category, so shared links and any
  // crawler that executes JS see content-specific metadata instead of the
  // generic homepage tags for every /browse URL.
  useEffect(() => {
    const catName = category !== 'all' ? catLabel(category) : null;
    const base = mode === 'specialists' ? t('specialists.title') : t('gigs.title');
    document.title = catName ? `${catName} — ${base} | Nexwork` : `${base} | Nexwork`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute('content', catName
        ? `${catName}: ${mode === 'specialists' ? t('specialists.subtitle') : t('gigs.subtitle')}`
        : (mode === 'specialists' ? t('specialists.subtitle') : t('gigs.subtitle')));
    }
  }, [category, mode, language]);

  const requireAuth = () => setAuthOpen(true);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17]">
      <div className="bg-white dark:bg-[#10141f] border-b border-slate-200 dark:border-[#232a3d]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Nexwork" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-extrabold text-slate-900 dark:text-white">NexWork</span>
          </a>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {session ? (
              <a href="#/gigs" className="btn-primary text-sm">{t('nav.cabinet')}</a>
            ) : (
              <>
                <button onClick={requireAuth} className="btn-ghost text-sm">{t('landing.nav.signin')}</button>
                <button onClick={requireAuth} className="btn-primary text-sm">{t('landing.nav.start')}</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('gigs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'gigs' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-[#161c2b] text-slate-700 dark:text-slate-300'}`}
          >
            <Package className="w-4 h-4 inline mr-1.5" />{t('gigs.title')}
          </button>
          <button
            onClick={() => setMode('specialists')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'specialists' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-[#161c2b] text-slate-700 dark:text-slate-300'}`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />{t('specialists.title')}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('landing.hero.search')}
              className="input pl-9"
            />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input sm:w-56">
            <option value="all">{t('gigs.allCategories')}</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{catLabel(c.key)}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>
        ) : mode === 'specialists' ? (
          specialists.length === 0 ? (
            <EmptyState icon={Users} title={t('specialists.notFound.title')} description={t('specialists.notFound.description')} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {specialists.map(s => (
                <a key={s.id} href={`#/p/${s.public_id}`} className="card p-4 text-left hover:shadow-lg transition-shadow block">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar src={s.avatar_url ?? undefined} name={s.display_name || s.email} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{s.display_name || s.full_name}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      </div>
                      {s.location && <div className="flex items-center gap-1 text-xs text-slate-500 truncate"><MapPin className="w-3 h-3 shrink-0" /> {s.location}</div>}
                    </div>
                  </div>
                  {s.bio && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 min-h-[2rem]">{s.bio}</p>}
                  {s.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {s.categories.slice(0, 2).map(c => <span key={c} className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{catLabel(c)}</span>)}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-[#232a3d]">
                    {s.review_count > 0 ? (
                      <span className="flex items-center gap-1"><Stars rating={s.rating} size={12} /> {s.rating.toFixed(1)} ({s.review_count})</span>
                    ) : <span>{t('specialists.noReviewsYet')}</span>}
                    {s.completed_orders > 0 && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {s.completed_orders}</span>}
                  </div>
                  {isTopSpecialist(s) && (
                    <div className="mt-2 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">★ {t('specialists.level.topRated')}</div>
                  )}
                </a>
              ))}
            </div>
          )
        ) : gigs.length === 0 ? (
          <EmptyState icon={Package} title={t('gigs.notFound.title')} description={t('gigs.notFound.description')} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {gigs.map(gig => {
              const seller = gig.seller as unknown as Profile | undefined;
              return (
                <button key={gig.id} onClick={() => setSelectedGig(gig)} className="card overflow-hidden text-left hover:shadow-lg transition-shadow">
                  <div className="h-40 bg-slate-100 dark:bg-[#161c2b]">
                    <img src={getGigCover(gig)} alt={gig.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar src={seller?.avatar_url ?? undefined} name={seller?.display_name || seller?.email} size={24} />
                      <span className="text-xs text-slate-500 truncate">{seller?.display_name || seller?.full_name}</span>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white line-clamp-2 mb-2">{gig.title}</div>
                    {gig.rating > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <Stars rating={gig.rating} size={12} />
                        <span className="text-xs text-slate-500">({gig.review_count ?? 0})</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {gig.delivery_days} {t('board.days')}</div>
                      <div className="font-bold text-brand-600 dark:text-brand-400">{formatPrice(gig.price)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedGig && (
        <Modal open onClose={() => setSelectedGig(null)} size="lg" title={selectedGig.title}>
          <div className="p-6 space-y-4">
            <img src={getGigCover(selectedGig)} alt={selectedGig.title} className="w-full h-56 object-cover rounded-xl" />
            <div className="flex items-center gap-3">
              <Avatar src={(selectedGig.seller as unknown as Profile)?.avatar_url ?? undefined} name={(selectedGig.seller as unknown as Profile)?.display_name} size={40} />
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{(selectedGig.seller as unknown as Profile)?.display_name || (selectedGig.seller as unknown as Profile)?.full_name}</div>
                <div className="text-xs text-slate-500">{catLabel(selectedGig.category)}</div>
              </div>
            </div>
            {selectedGig.description && <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selectedGig.description}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-500 mb-0.5">{t('gigs.from')}</div>
                <div className="font-bold text-brand-600 dark:text-brand-400">{formatPrice(selectedGig.price)}</div>
              </div>
              <div className="bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-500 mb-0.5">{t('board.duration')}</div>
                <div className="font-bold text-slate-900 dark:text-white">{selectedGig.delivery_days} {t('board.days')}</div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={requireAuth} className="btn-primary flex-1"><ShoppingCart className="w-4 h-4" /> {t('gigs.orderFor')} {formatPrice(selectedGig.price)}</button>
              <button onClick={requireAuth} className="btn-secondary flex-1"><MessageCircle className="w-4 h-4" /> {t('gigs.write')}</button>
            </div>
          </div>
        </Modal>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode="signup" />
    </div>
  );
}
