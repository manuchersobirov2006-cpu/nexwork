import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { t } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { CATEGORIES } from '../lib/constants';
import { Avatar, Badge, EmptyState, Modal, Spinner, Stars } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AuthModal } from '../components/AuthModal';
import type { Profile, PortfolioItem, Certificate } from '../lib/types';
import {
  Award, Briefcase, ExternalLink, FolderOpen, MapPin, MessageCircle,
  ShieldCheck, CheckCircle2, TrendingUp,
} from 'lucide-react';

export function PublicPortfolioScreen({ publicId }: { publicId: string }) {
  const { language } = useTheme();
  const { session, profile: viewerProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeItem, setActiveItem] = useState<PortfolioItem | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('public_id', publicId.toUpperCase())
      .maybeSingle();
    if (!p) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProfile(p as Profile);
    const { data: portfolio } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false });
    if (portfolio) setItems(portfolio as PortfolioItem[]);
    const { data: certs } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false });
    if (certs) setCertificates(certs as Certificate[]);
    setLoading(false);
  }, [publicId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile) return;
    const name = profile.display_name || profile.full_name || t('gigs.expert');
    const primaryCategory = profile.categories?.[0];
    const catName = primaryCategory ? CATEGORIES.find(c => c.key === primaryCategory)?.label : null;
    document.title = catName ? `${name} — ${catName} | Nexwork` : `${name} | Nexwork`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', profile.bio?.slice(0, 160) || `${name} на Nexwork — маркетплейс фриланс-услуг Центральной Азии.`);
    return () => { document.title = 'Nexwork'; };
  }, [profile]);

  const catLabel = (key: string | null) => {
    if (!key) return null;
    const c = CATEGORIES.find(c => c.key === key);
    if (!c) return key;
    return language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label;
  };

  const handleMessage = async () => {
    if (!profile) return;
    if (!session || !viewerProfile) {
      setAuthOpen(true);
      return;
    }
    if (viewerProfile.id === profile.id) return;

    setStartingChat(true);
    const { data: existing } = await supabase
      .from('chats')
      .select('id')
      .or(`and(participant_1.eq.${viewerProfile.id},participant_2.eq.${profile.id}),and(participant_1.eq.${profile.id},participant_2.eq.${viewerProfile.id})`)
      .maybeSingle();

    if (!existing) {
      await supabase.from('chats').insert({
        participant_1: viewerProfile.id,
        participant_2: profile.id,
      });
    }
    setStartingChat(false);
    window.location.hash = '/chat';
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Spinner className="w-8 h-8 text-brand-600" /></div>;
  }

  if (notFound || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <EmptyState icon={FolderOpen} title={t('portfolio.public.notFound')} description="" />
      </div>
    );
  }

  const isOwnProfile = viewerProfile?.id === profile.id;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17]">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Nexwork" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-extrabold text-slate-900 dark:text-white">NexWork</span>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="card p-6 mb-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar src={profile.avatar_url ?? undefined} name={profile.display_name || profile.full_name || profile.email} size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-xl font-extrabold text-slate-900 dark:text-white truncate">{profile.display_name || profile.full_name}</div>
                {(profile.verification_level === 'identity' || profile.verification_level === 'full') && (
                  <Badge color="blue"><ShieldCheck className="w-3 h-3" /> {t('passport.verified')}</Badge>
                )}
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
            {!isOwnProfile && (
              <button onClick={handleMessage} disabled={startingChat} className="btn-primary shrink-0">
                {startingChat ? <Spinner className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                {t('portfolio.public.message')}
              </button>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-4 whitespace-pre-wrap">{profile.bio}</p>
          )}

          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {profile.skills.map(s => <Badge key={s}>{s}</Badge>)}
            </div>
          )}

          {profile.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.categories.map(c => <Badge key={c} color="purple">{catLabel(c)}</Badge>)}
            </div>
          )}

          {profile.languages.length > 0 && (
            <div className="text-xs text-slate-400 mt-3">{profile.languages.join(' · ')}</div>
          )}
        </div>

        {certificates.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('certificates.title')}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {certificates.map(cert => (
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
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('portfolio.title')}</h2>

        {items.length === 0 ? (
          <EmptyState icon={FolderOpen} title={t('portfolio.empty.title')} description={t('portfolio.empty.description')} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <button key={item.id} onClick={() => setActiveItem(item)} className="card overflow-hidden text-left hover:shadow-lg transition-shadow">
                <div className="relative h-40 bg-slate-100 dark:bg-[#161c2b]">
                  {item.image_urls[0] ? (
                    <img src={item.image_urls[0]} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-semibold text-slate-900 dark:text-white">{item.title}</div>
                  {catLabel(item.category) && <div className="text-xs text-slate-500 mt-0.5">{catLabel(item.category)}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
            <div className="flex flex-wrap gap-2 pt-2">
              {activeItem.link_url && (
                <a href={activeItem.link_url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
                  {t('portfolio.viewLink')} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {!isOwnProfile && (
                <button onClick={handleMessage} disabled={startingChat} className="btn-primary text-sm">
                  {startingChat ? <Spinner className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                  {t('portfolio.public.message')}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode="signin" />
    </div>
  );
}
