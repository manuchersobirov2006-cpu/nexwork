import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { CATEGORIES, BUDGET_RANGES, DELIVERY_OPTIONS, pexelsImage } from '../lib/constants';
import { formatPrice } from '../lib/format';
import { Avatar, Badge, Stars, Modal, EmptyState, SkeletonCard, Spinner } from '../components/ui';
import { GigImageUpload } from '../components/GigImageUpload';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import type { Gig, Profile } from '../lib/types';
import {
  Search, SlidersHorizontal, Plus, Heart, Clock, Eye,
  ShoppingCart, MessageSquare, Tag, ChevronLeft, ChevronRight, ImageIcon
} from 'lucide-react';

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

function getGigGallery(gig: Gig): string[] {
  const imgs = [...(gig.image_urls || []), ...(gig.gallery || [])];
  if (imgs.length > 0) return imgs;
  const idx = (gig.title.charCodeAt(0) || 0) % FALLBACK_IMAGES.length;
  return [FALLBACK_IMAGES[idx]];
}

export function GigsScreen({ onOpenChat }: { onOpenChat?: (userId: string) => void }) {
  const { profile } = useAuth();
  const { language } = useTheme();
  void language;
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [budget, setBudget] = useState('all');
  const [delivery, setDelivery] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'price_low' | 'price_high'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadGigs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('gigs')
      .select('*, seller:seller_id(*)')
      .eq('status', 'active');

    if (category !== 'all') query = query.eq('category', category);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'popular') query = query.order('orders_count', { ascending: false });
    else if (sortBy === 'price_low') query = query.order('price', { ascending: true });
    else if (sortBy === 'price_high') query = query.order('price', { ascending: false });

    const { data } = await query.limit(50);
    if (data) {
      let filtered = data as Gig[];
      if (budget !== 'all') {
        const range = BUDGET_RANGES.find(r => r.key === budget);
        if (range) filtered = filtered.filter(g => g.price >= range.min && g.price <= range.max);
      }
      if (delivery !== 'all') {
        const opt = DELIVERY_OPTIONS.find(o => o.key === delivery);
        if (opt) filtered = filtered.filter(g => g.delivery_days <= opt.value);
      }
      setGigs(filtered);
    }
    setLoading(false);
  }, [category, search, sortBy, budget, delivery]);

  const loadFavorites = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.from('favorites').select('gig_id').eq('user_id', profile.id);
    if (data) setFavorites(new Set(data.map(f => f.gig_id)));
  }, [profile]);

  useEffect(() => { loadGigs(); }, [loadGigs]);
  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const toggleFavorite = async (gigId: string) => {
    if (!profile) return;
    if (favorites.has(gigId)) {
      await supabase.from('favorites').delete().eq('user_id', profile.id).eq('gig_id', gigId);
      setFavorites(prev => { const n = new Set(prev); n.delete(gigId); return n; });
    } else {
      await supabase.from('favorites').insert({ user_id: profile.id, gig_id: gigId });
      setFavorites(prev => new Set(prev).add(gigId));
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('gigs.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('gigs.subtitle')}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('gigs.create')}
        </button>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('gigs.search')} className="input pl-10" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="input sm:w-48">
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
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid sm:grid-cols-3 gap-3 animate-slide-down">
            <div>
              <label className="label">{t('gigs.category')}</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                <option value="all">{t('gigs.allCategories')}</option>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('gigs.budget')}</label>
              <select value={budget} onChange={e => setBudget(e.target.value)} className="input">
                <option value="all">{t('gigs.any')}</option>
                {BUDGET_RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('gigs.delivery')}</label>
              <select value={delivery} onChange={e => setDelivery(e.target.value)} className="input">
                <option value="all">{t('gigs.any')}</option>
                {DELIVERY_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
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
            const hasRealPhotos = (gig.image_urls?.length || 0) > 0;
            return (
              <div
                key={gig.id}
                className="card overflow-hidden hover:shadow-card-hover transition-all duration-200 cursor-pointer group animate-fade-in"
                onClick={() => setSelectedGig(gig)}
              >
                <div className="relative h-40 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <img src={cover} alt={gig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {!hasRealPhotos && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] bg-black/50 text-white rounded flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {t('gigs.placeholder')}
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(gig.id); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center backdrop-blur-sm hover:scale-110 transition-transform"
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(gig.id) ? 'fill-error-500 text-error-500' : 'text-slate-600'}`} />
                  </button>
                  <div className="absolute bottom-3 left-3">
                    <Badge color="blue" className="backdrop-blur-sm bg-white/90 dark:bg-slate-900/90">
                      {(() => {
                        const c = CATEGORIES.find(c => c.key === gig.category);
                        if (!c) return gig.category;
                        return language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label;
                      })()}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar src={seller?.avatar_url ?? undefined} name={seller?.display_name || seller?.email} size={20} />
                    <span className="text-xs text-slate-500 truncate">{seller?.display_name || seller?.full_name || t('gigs.expert')}</span>
                    {seller?.is_verified && <span className="text-brand-500 text-xs">✓</span>}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 mb-2 min-h-[2.5rem]">{gig.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{gig.delivery_days} {t('gigs.days')}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{gig.views}</span>
                    {gig.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Stars rating={gig.rating} size={10} />
                        {gig.rating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400">{t('gigs.from')}</div>
                      <div className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatPrice(gig.price)}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedGig(gig); }} className="btn-secondary !px-3 !py-1.5 text-xs">
                      {t('gigs.details')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedGig && (
        <GigDetailModal
          gig={selectedGig}
          onClose={() => setSelectedGig(null)}
          onChat={() => { startChat(selectedGig.seller_id); setSelectedGig(null); }}
          isFavorite={favorites.has(selectedGig.id)}
          onToggleFav={() => toggleFavorite(selectedGig.id)}
        />
      )}

      {showCreateModal && (
        <CreateGigModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); loadGigs(); }} />
      )}
    </div>
  );
}

function GigDetailModal({ gig, onClose, onChat, isFavorite, onToggleFav }: {
  gig: Gig;
  onClose: () => void;
  onChat: () => void;
  isFavorite: boolean;
  onToggleFav: () => void;
}) {
  const { profile } = useAuth();
  const [ordering, setOrdering] = useState(false);
  const [requirements, setRequirements] = useState('');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const gallery = getGigGallery(gig);
  const seller = gig.seller as unknown as Profile | undefined;

  const handleOrder = async () => {
    if (!profile || profile.id === gig.seller_id) return;
    setOrdering(true);
    const { data } = await supabase.from('orders').insert({
      gig_id: gig.id, buyer_id: profile.id, seller_id: gig.seller_id,
      price: gig.price, requirements: requirements || null,
      delivery_deadline: new Date(Date.now() + gig.delivery_days * 86400000).toISOString(),
      status: 'pending',
    }).select('id').single();
    setOrdering(false);
    if (data) {
      await supabase.from('notifications').insert({
        user_id: gig.seller_id, type: 'order', title: t('gigs.newOrder.title'),
        body: `${t('gigs.newOrder.body')} "${gig.title}"`, link: 'orders',
      });
      onClose();
    }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={gig.title}>
      <div className="p-6">
        {/* Gallery / Carousel */}
        <div className="relative h-56 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden mb-4">
          <img src={gallery[galleryIndex]} alt={gig.title} className="w-full h-full object-cover" />
          {gallery.length > 1 && (
            <>
              <button
                onClick={() => setGalleryIndex(i => (i - 1 + gallery.length) % gallery.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 dark:bg-slate-900/80 flex items-center justify-center backdrop-blur-sm hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              </button>
              <button
                onClick={() => setGalleryIndex(i => (i + 1) % gallery.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 dark:bg-slate-900/80 flex items-center justify-center backdrop-blur-sm hover:bg-white transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === galleryIndex ? 'bg-white w-6' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {gallery.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-thin">
            {gallery.map((url, i) => (
              <button
                key={i}
                onClick={() => setGalleryIndex(i)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === galleryIndex ? 'border-brand-500' : 'border-slate-200 dark:border-slate-700'}`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <Avatar src={seller?.avatar_url ?? undefined} name={seller?.display_name || seller?.email} size={44} />
          <div className="flex-1">
            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
              {seller?.display_name || seller?.full_name || t('gigs.expert')}
              {seller?.is_verified && <Badge color="blue" className="ml-1">✓ {t('gigs.verified')}</Badge>}
            </div>
            <div className="text-sm text-slate-500">
              {seller?.rating != null && seller?.rating > 0 && <span className="flex items-center gap-1"><Stars rating={seller.rating} size={12} /> {seller.rating} ({seller.review_count})</span>}
            </div>
          </div>
          <button onClick={onToggleFav} className="btn-ghost">
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-error-500 text-error-500' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-3 text-center">
            <div className="text-xs text-slate-500">{t('gigs.price')}</div>
            <div className="font-bold text-brand-600 dark:text-brand-400">{formatPrice(gig.price)}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-slate-500">{t('gigs.delivery.short')}</div>
            <div className="font-bold text-slate-900 dark:text-white">{gig.delivery_days} {t('gigs.days')}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-slate-500">{t('gigs.revisions')}</div>
            <div className="font-bold text-slate-900 dark:text-white">{gig.revisions}</div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{t('gigs.description')}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{gig.description}</p>
        </div>

        {gig.tags.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{t('gigs.tags')}</h3>
            <div className="flex flex-wrap gap-2">
              {gig.tags.map(t => <Badge key={t} color="slate">{t}</Badge>)}
            </div>
          </div>
        )}

        {profile?.id !== gig.seller_id && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <label className="label">{t('gigs.requirements')}</label>
            <textarea value={requirements} onChange={e => setRequirements(e.target.value)} rows={3} placeholder={t('gigs.requirements.placeholder')} className="input mb-3" />
            <div className="flex gap-2">
              <button onClick={handleOrder} disabled={ordering} className="btn-primary flex-1">
                {ordering ? <Spinner className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                {t('gigs.orderFor')} {formatPrice(gig.price)}
              </button>
              <button onClick={onChat} className="btn-secondary">
                <MessageSquare className="w-4 h-4" />
                {t('gigs.write')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CreateGigModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('design');
  const [price, setPrice] = useState(50);
  const [deliveryDays, setDeliveryDays] = useState(3);
  const [revisions, setRevisions] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const handleCreate = async () => {
    if (!profile || !title || !description) return;
    setSaving(true);
    const { data, error } = await supabase.from('gigs').insert({
      seller_id: profile.id, title, description, category, price,
      delivery_days: deliveryDays, revisions, tags, status: 'active',
      image_urls: imageUrls,
    }).select('id').single();
    setSaving(false);
    if (!error && data) {
      onCreated();
    }
  };

  // Use a temp ID for image path before gig is created
  const tempGigId = `temp-${profile?.id?.slice(0, 8)}`;

  const { language } = useTheme();

  return (
    <Modal open onClose={onClose} size="lg" title={t('gigs.new')}>
      <div className="p-6 space-y-4">
        <div>
          <label className="label">{t('gigs.name')}</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('gigs.name.placeholder')} className="input" />
        </div>

        {profile && (
          <GigImageUpload
            userId={profile.id}
            gigId={tempGigId}
            onImagesChange={setImageUrls}
          />
        )}

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
            <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={5} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('gigs.deliveryDays')}</label>
            <input type="number" value={deliveryDays} onChange={e => setDeliveryDays(Number(e.target.value))} min={1} className="input" />
          </div>
          <div>
            <label className="label">{t('gigs.revisionsLabel')}</label>
            <input type="number" value={revisions} onChange={e => setRevisions(Number(e.target.value))} min={0} className="input" />
          </div>
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
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="btn-secondary">{t('gigs.cancel')}</button>
          <button onClick={handleCreate} disabled={saving || !title || !description} className="btn-primary">
            {saving && <Spinner className="w-4 h-4" />}
            {t('gigs.publish')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
