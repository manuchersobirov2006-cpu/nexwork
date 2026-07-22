import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { CATEGORIES } from '../lib/constants';
import { Avatar, Badge, LevelBadge, Stars, EmptyState, SkeletonCard } from '../components/ui';
import { UserProfileModal } from '../components/UserProfileModal';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { isTopSpecialist, getQualityScore } from '../lib/freelancerLevel';
import type { Profile } from '../lib/types';
import { Search, SlidersHorizontal, Users, MapPin, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

export function SpecialistsScreen({ onOpenChat }: { onOpenChat?: (userId: string) => void }) {
  const { profile } = useAuth();
  const { language } = useTheme();
  const [specialists, setSpecialists] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'quality' | 'rating' | 'newest' | 'orders'>('quality');
  const [showFilters, setShowFilters] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*').eq('role', 'freelancer').in('verification_level', ['identity', 'full']);

    if (category !== 'all') query = query.contains('categories', [category]);
    if (search) query = query.or(`display_name.ilike.%${search}%,full_name.ilike.%${search}%`);

    if (sortBy === 'rating') query = query.order('rating', { ascending: false });
    else if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'orders') query = query.order('completed_orders', { ascending: false });

    const { data } = await query.limit(60);
    if (data) {
      let list = data as Profile[];
      if (sortBy === 'quality') list = [...list].sort((a, b) => getQualityScore(b) - getQualityScore(a));
      setSpecialists(list);
    }
    setLoading(false);
  }, [category, search, sortBy]);

  const loadFavorites = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.from('favorites').select('specialist_id').eq('user_id', profile.id).not('specialist_id', 'is', null);
    if (data) setFavoriteIds(new Set(data.map(f => f.specialist_id as string)));
  }, [profile]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const toggleFavorite = async (e: React.MouseEvent, specialistId: string) => {
    e.stopPropagation();
    if (!profile) return;
    if (favoriteIds.has(specialistId)) {
      await supabase.from('favorites').delete().eq('user_id', profile.id).eq('specialist_id', specialistId);
      setFavoriteIds(prev => { const n = new Set(prev); n.delete(specialistId); return n; });
    } else {
      await supabase.from('favorites').insert({ user_id: profile.id, specialist_id: specialistId });
      setFavoriteIds(prev => new Set(prev).add(specialistId));
    }
  };

  const startChat = async (sellerId: string) => {
    if (!profile || sellerId === profile.id) return;
    const { data: existing } = await supabase
      .from('chats')
      .select('id')
      .or(`and(participant_1.eq.${profile.id},participant_2.eq.${sellerId}),and(participant_1.eq.${sellerId},participant_2.eq.${profile.id})`)
      .maybeSingle();

    if (!existing) {
      await supabase.from('chats').insert({ participant_1: profile.id, participant_2: sellerId });
    }
    onOpenChat?.(sellerId);
  };

  const catLabel = (key: string) => {
    const c = CATEGORIES.find(c => c.key === key);
    if (!c) return key;
    return language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label;
  };

  const visibleSpecialists = favoritesOnly ? specialists.filter(s => favoriteIds.has(s.id)) : specialists;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('specialists.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('specialists.subtitle')}</p>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('specialists.search')} className="input pl-10" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="input sm:w-56">
            <option value="quality">{t('specialists.sort.quality')}</option>
            <option value="rating">{t('specialists.sort.rating')}</option>
            <option value="newest">{t('specialists.sort.newest')}</option>
            <option value="orders">{t('specialists.sort.orders')}</option>
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
            <SlidersHorizontal className="w-4 h-4" />
            {t('gigs.filters')}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#232a3d] animate-slide-down space-y-3">
            <div>
              <label className="label">{t('gigs.category')}</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input sm:w-64">
                <option value="all">{t('gigs.allCategories')}</option>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{catLabel(c.key)}</option>)}
              </select>
            </div>
            {profile && (
              <button
                type="button"
                onClick={() => setFavoritesOnly(v => !v)}
                className={`group inline-flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                  favoritesOnly
                    ? 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800 text-error-600 dark:text-error-400'
                    : 'bg-transparent border-slate-200 dark:border-[#232a3d] text-slate-600 dark:text-slate-300 hover:border-error-200 dark:hover:border-error-800/60 hover:text-error-500'
                }`}
              >
                <Heart
                  className={`w-4 h-4 transition-all duration-200 ${favoritesOnly ? 'fill-error-500 text-error-500 scale-110' : 'group-hover:scale-110'}`}
                />
                {t('specialists.favoritesOnly')}
                {favoriteIds.size > 0 && (
                  <span className={`min-w-[1.25rem] h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${favoritesOnly ? 'bg-error-500 text-white' : 'bg-slate-100 dark:bg-[#1e1729] text-slate-500 dark:text-slate-400'}`}>
                    {favoriteIds.size}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : visibleSpecialists.length === 0 ? (
        favoritesOnly ? (
          <EmptyState icon={Heart} title={t('specialists.noFavorites.title')} description={t('specialists.noFavorites.description')} />
        ) : (
          <EmptyState icon={Users} title={t('specialists.notFound.title')} description={t('specialists.notFound.description')} />
        )
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleSpecialists.map(s => {
            const isFavorite = favoriteIds.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setViewingProfileId(s.id)}
                className="card p-4 text-left hover:shadow-card-hover transition-all duration-200 animate-fade-in relative"
              >
                {profile && profile.id !== s.id && (
                  <button
                    onClick={(e) => toggleFavorite(e, s.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 dark:bg-[#161c2b]/90 flex items-center justify-center backdrop-blur-sm hover:scale-110 transition-transform z-10"
                    title={isFavorite ? t('specialists.removeFavorite') : t('specialists.addFavorite')}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-error-500 text-error-500' : 'text-slate-400'}`} />
                  </button>
                )}
                <div className="flex items-center gap-3 mb-3 pr-8">
                  <Avatar src={s.avatar_url ?? undefined} name={s.display_name || s.email} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{s.display_name || s.full_name || t('gigs.expert')}</span>
                      {(s.verification_level === 'identity' || s.verification_level === 'full') && (
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      )}
                    </div>
                    {s.location && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 truncate">
                        <MapPin className="w-3 h-3 shrink-0" /> {s.location}
                      </div>
                    )}
                  </div>
                </div>

                {isTopSpecialist(s) && (
                  <div className="mb-3"><LevelBadge /></div>
                )}

                {s.bio && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 min-h-[2rem]">{s.bio}</p>}

                {s.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {s.categories.slice(0, 2).map(c => <Badge key={c} color="purple">{catLabel(c)}</Badge>)}
                    {s.categories.length > 2 && <Badge color="slate">+{s.categories.length - 2}</Badge>}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-[#232a3d]">
                  {s.review_count > 0 ? (
                    <span className="flex items-center gap-1"><Stars rating={s.rating} size={12} /> {s.rating.toFixed(1)} ({s.review_count})</span>
                  ) : (
                    <span>{t('specialists.noReviewsYet')}</span>
                  )}
                  {s.completed_orders > 0 && (
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {s.completed_orders}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {viewingProfileId && (
        <UserProfileModal
          userId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
          onMessage={(id) => { setViewingProfileId(null); startChat(id); }}
        />
      )}
    </div>
  );
}
