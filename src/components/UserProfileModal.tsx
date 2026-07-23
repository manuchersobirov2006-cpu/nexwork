import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { CATEGORIES } from '../lib/constants';
import { formatDate } from '../lib/format';
import { Avatar, Badge, LevelBadge, EmptyState, Modal, Spinner, Stars } from './ui';
import { t } from '../lib/i18n';
import { SOCIAL_PLATFORMS } from '../lib/socialLinks';
import { isTopSpecialist } from '../lib/freelancerLevel';
import { formatPrice } from '../lib/format';
import { GigOrderModal } from './GigOrderModal';
import { RoleSwitchRequiredModal } from './RoleSwitchRequiredModal';
import type { Profile, PortfolioItem, Certificate, Review, Gig } from '../lib/types';
import {
  Award, Briefcase, ExternalLink, FolderOpen, MapPin, MessageCircle,
  ShieldCheck, CheckCircle2, TrendingUp, ShoppingCart, Check, Tag,
} from 'lucide-react';

export function UserProfileModal({ userId, onClose, onMessage }: {
  userId: string;
  onClose: () => void;
  onMessage?: (userId: string) => void;
}) {
  const { profile: viewer } = useAuth();
  const { language } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [orderingGig, setOrderingGig] = useState<Gig | null>(null);
  const [showRoleWarning, setShowRoleWarning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<PortfolioItem | null>(null);

  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderTitle, setOrderTitle] = useState('');
  const [orderDescription, setOrderDescription] = useState('');
  const [orderPrice, setOrderPrice] = useState(500000);
  const [orderDeadlineDays, setOrderDeadlineDays] = useState(7);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(p as Profile | null);
    const [{ data: portfolio }, { data: certs }, { data: revs }, { data: gigRows }] = await Promise.all([
      supabase.from('portfolio_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('certificates').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, reviewer:reviewer_id(*)').eq('reviewee_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('gigs').select('*').eq('seller_id', userId).eq('status', 'active').order('created_at', { ascending: false }),
    ]);
    if (portfolio) setItems(portfolio as PortfolioItem[]);
    if (certs) setCertificates(certs as Certificate[]);
    if (revs) setReviews(revs as Review[]);
    if (gigRows) setGigs(gigRows as Gig[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleOrder = async () => {
    if (!viewer || !profile || !orderTitle.trim()) return;
    setOrdering(true);
    const { data } = await supabase.from('orders').insert({
      gig_id: null, buyer_id: viewer.id, seller_id: profile.id,
      price: orderPrice, requirements: `${orderTitle.trim()}\n\n${orderDescription.trim()}`.trim(),
      delivery_deadline: new Date(Date.now() + orderDeadlineDays * 86400000).toISOString(),
      status: 'pending',
    }).select('id').single();
    setOrdering(false);
    if (data) {
      await supabase.from('notifications').insert({
        user_id: profile.id, type: 'order', title: t('gigs.newOrder.title'),
        body: `${orderTitle.trim()}`, link: 'orders',
      });
      setOrderSuccess(true);
      setShowOrderForm(false);
    }
  };

  const catLabel = (key: string | null) => {
    if (!key) return null;
    const c = CATEGORIES.find(c => c.key === key);
    if (!c) return key;
    return language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label;
  };

  return (
    <Modal open onClose={onClose} size="xl" title={t('profile.view.title')}>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>
      ) : !profile ? (
        <div className="p-10"><EmptyState icon={FolderOpen} title={t('portfolio.public.notFound')} description="" /></div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar src={profile.avatar_url ?? undefined} name={profile.display_name || profile.full_name || profile.email} size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-xl font-extrabold text-slate-900 dark:text-white truncate">{profile.display_name || profile.full_name}</div>
                {(profile.verification_level === 'identity' || profile.verification_level === 'full') && (
                  <Badge color="blue"><ShieldCheck className="w-3 h-3" /> {t('passport.verified')}</Badge>
                )}
                {profile.role === 'freelancer' && isTopSpecialist(profile) && <LevelBadge />}
              </div>
              <div className="flex items-center gap-3 flex-wrap mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {profile.review_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Stars rating={profile.rating} size={14} />
                    <span>{profile.rating.toFixed(1)} ({profile.review_count})</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profile.location}</div>
                )}
                {profile.completed_orders > 0 && (
                  <div className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {profile.completed_orders} {t('portfolio.public.orders')}</div>
                )}
                {profile.response_rate > 0 && (
                  <div className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {profile.response_rate}% {t('portfolio.public.responseRate')}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {viewer && viewer.id !== profile.id && profile.role === 'freelancer' && (
                <button onClick={() => { if (viewer?.role === 'freelancer') { setShowRoleWarning(true); return; } setOrderSuccess(false); setShowOrderForm(true); }} className="btn-secondary">
                  <ShoppingCart className="w-4 h-4" /> {t('profileModal.order.button')}
                </button>
              )}
              {onMessage && (
                <button onClick={() => onMessage(profile.id)} className="btn-primary">
                  <MessageCircle className="w-4 h-4" /> {t('portfolio.public.message')}
                </button>
              )}
            </div>
          </div>

          {orderSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 text-sm">
              <Check className="w-4 h-4 shrink-0" /> {t('profileModal.order.success')}
            </div>
          )}

          {showOrderForm && (
            <div className="card p-4 space-y-3 animate-slide-down">
              <h3 className="font-bold text-slate-900 dark:text-white">{t('profileModal.order.title')}</h3>
              <div>
                <label className="label">{t('profileModal.order.taskTitle')}</label>
                <input type="text" value={orderTitle} onChange={e => setOrderTitle(e.target.value)} placeholder={t('profileModal.order.taskTitle.placeholder')} className="input" />
              </div>
              <div>
                <label className="label">{t('profileModal.order.description')}</label>
                <textarea value={orderDescription} onChange={e => setOrderDescription(e.target.value)} rows={3} placeholder={t('profileModal.order.description.placeholder')} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('profileModal.order.price')}</label>
                  <input type="number" value={orderPrice} onChange={e => setOrderPrice(Number(e.target.value))} min={0} className="input" />
                </div>
                <div>
                  <label className="label">{t('profileModal.order.deadlineDays')}</label>
                  <input type="number" value={orderDeadlineDays} onChange={e => setOrderDeadlineDays(Number(e.target.value))} min={1} className="input" />
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-[#232a3d]">
                <button onClick={handleOrder} disabled={ordering || !orderTitle.trim()} className="btn-primary flex-1">
                  {ordering ? <Spinner className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />} {t('profileModal.order.submit')}
                </button>
                <button onClick={() => setShowOrderForm(false)} className="btn-secondary">{t('gigs.cancel')}</button>
              </div>
            </div>
          )}

          {profile.bio && <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{profile.bio}</p>}

          {SOCIAL_PLATFORMS.some(p => profile.social_links?.[p.key]) && (
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.filter(p => profile.social_links?.[p.key]).map(platform => (
                <a
                  key={platform.key}
                  href={profile.social_links[platform.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={platform.label}
                  className={`w-9 h-9 rounded-xl ${platform.colorClass} flex items-center justify-center hover:opacity-80 transition-opacity`}
                >
                  <platform.icon className="w-4 h-4 text-white" />
                </a>
              ))}
            </div>
          )}

          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map(s => <Badge key={s}>{s}</Badge>)}
            </div>
          )}


          {profile.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.categories.map(c => <Badge key={c} color="purple">{catLabel(c)}</Badge>)}
            </div>
          )}

          {certificates.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t('certificates.title')}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {certificates.map(cert => (
                  <div key={cert.id} className="relative overflow-hidden rounded-xl p-3 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-950/20 border border-amber-200 dark:border-amber-800/50">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-400/90 flex items-center justify-center shrink-0 shadow">
                        <Award className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">{cert.title}</div>
                        {cert.issuer && <div className="text-xs text-slate-600 dark:text-slate-300 truncate">{cert.issuer}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gigs.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t('portfolio.myGigs.title')}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {gigs.map(g => (
                  <button key={g.id} onClick={() => { if (viewer?.role === 'freelancer') setShowRoleWarning(true); else setOrderingGig(g); }} className="card p-3 text-left hover:shadow-card-hover transition-all flex items-center gap-3">
                    {g.image_urls[0] ? (
                      <img src={g.image_urls[0]} alt={g.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                        <Tag className="w-6 h-6 text-brand-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{g.title}</div>
                      <div className="text-xs text-slate-500">{t('gigs.from')} {formatPrice(g.price)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t('portfolio.title')}</h3>
            {items.length === 0 ? (
              <EmptyState icon={FolderOpen} title={t('portfolio.empty.title')} description={t('portfolio.empty.description')} />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(item => (
                  <button key={item.id} onClick={() => setActiveItem(item)} className="card overflow-hidden text-left hover:shadow-lg transition-shadow">
                    <div className="relative h-28 bg-slate-100 dark:bg-[#161c2b]">
                      {item.image_urls[0] ? (
                        <img src={item.image_urls[0]} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="font-medium text-slate-900 dark:text-white text-sm truncate">{item.title}</div>
                      {catLabel(item.category) && <div className="text-xs text-slate-500 mt-0.5">{catLabel(item.category)}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {reviews.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t('passport.recentReviews')}</h3>
              <div className="space-y-2">
                {reviews.map(r => (
                  <div key={r.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                    <Avatar src={r.reviewer?.avatar_url ?? undefined} name={r.reviewer?.display_name || r.reviewer?.email} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{r.reviewer?.display_name || r.reviewer?.full_name}</span>
                        <Stars rating={r.rating} size={12} />
                      </div>
                      {r.comment && <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{r.comment}</p>}
                      <div className="text-[10px] text-slate-400 mt-1">{formatDate(r.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeItem && (
        <Modal open onClose={() => setActiveItem(null)} size="lg" title={activeItem.title}>
          <div className="p-6 space-y-4">
            {activeItem.image_urls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {activeItem.image_urls.map((url, i) => (
                  <img key={i} src={url} alt={`${activeItem.title} ${i + 1}`} className="w-full rounded-xl object-cover aspect-video" />
                ))}
              </div>
            )}
            {catLabel(activeItem.category) && <Badge color="purple">{catLabel(activeItem.category)}</Badge>}
            {activeItem.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{activeItem.description}</p>
            )}
            {activeItem.link_url && (
              <a href={activeItem.link_url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm inline-flex">
                {t('portfolio.viewLink')} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </Modal>
      )}

      {orderingGig && (
        <GigOrderModal gig={orderingGig} onClose={() => setOrderingGig(null)} />
      )}

      {showRoleWarning && (
        <RoleSwitchRequiredModal onClose={() => setShowRoleWarning(false)} />
      )}
    </Modal>
  );
}
