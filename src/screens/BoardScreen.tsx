import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { CATEGORIES } from '../lib/constants';
import { formatPrice, timeAgo, daysUntil } from '../lib/format';
import { Avatar, Badge, Modal, EmptyState, SkeletonCard, Spinner, Stars } from '../components/ui';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { sendBidMessage, acceptBid as acceptBidHelper } from '../lib/bids';
import { needsIdentityVerification } from '../lib/verification';
import { VerificationRequiredNotice } from '../components/VerificationRequiredNotice';
import { UserProfileModal } from '../components/UserProfileModal';
import { translateText } from '../lib/translate';
import type { Project, Bid, Profile, PortfolioItem } from '../lib/types';
import {
  Plus, Clock, DollarSign, Users, Gavel,
  Check, MessageSquare, Calendar, ExternalLink, Briefcase, Languages
} from 'lucide-react';

export function BoardScreen({ onOpenChat }: { onOpenChat?: (userId: string) => void }) {
  const { profile } = useAuth();
  const { language } = useTheme();
  void language;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'budget_high' | 'bids' | 'ending'>('newest');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myBids, setMyBids] = useState<Set<string>>(new Set());
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('projects')
      .select('*, employer:employer_id(*), bids:bids(*)')
      .in('status', ['open', 'in_progress']);

    if (category !== 'all') query = query.eq('category', category);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'budget_high') query = query.order('budget_max', { ascending: false, nullsFirst: false });
    else if (sortBy === 'bids') query = query.order('bids_count', { ascending: false });
    else if (sortBy === 'ending') query = query.order('deadline', { ascending: true, nullsFirst: false });

    const { data } = await query.limit(50);
    if (data) setProjects(data as Project[]);
    setLoading(false);
  }, [category, search, sortBy]);

  const loadMyBids = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.from('bids').select('project_id').eq('freelancer_id', profile.id);
    if (data) setMyBids(new Set(data.map(b => b.project_id)));
  }, [profile]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadMyBids(); }, [loadMyBids]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('board.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('board.subtitle')}</p>
        </div>
        {profile?.role === 'employer' && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            {t('board.postProject')}
          </button>
        )}
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('board.search')} className="input flex-1" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="input sm:w-48">
            <option value="all">{t('board.allCategories')}</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="input sm:w-48">
            <option value="newest">{t('board.sort.newest')}</option>
            <option value="budget_high">{t('board.sort.budgetHigh')}</option>
            <option value="bids">{t('board.sort.bids')}</option>
            <option value="ending">{t('board.sort.ending')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={Gavel} title={t('board.notFound.title')} description={t('board.notFound.description')} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {projects.map(project => {
            const employer = project.employer as unknown as Profile | undefined;
            const budget = project.budget_fixed ?? project.budget_max ?? project.budget_min;
            const remaining = project.deadline ? daysUntil(project.deadline) : null;
            const hasBid = myBids.has(project.id);
            return (
              <div key={project.id} className="card p-5 hover:shadow-card-hover transition-all duration-200 cursor-pointer animate-fade-in" onClick={() => setSelectedProject(project)}>
                <button
                  onClick={(e) => { e.stopPropagation(); if (employer) setViewingProfileId(employer.id); }}
                  className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar src={employer?.avatar_url ?? undefined} name={employer?.display_name || employer?.email} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{employer?.display_name || employer?.full_name || t('board.employer')}</div>
                    <div className="text-[11px] text-slate-400">{timeAgo(project.created_at)}</div>
                  </div>
                </button>
                <div className="flex items-start justify-between mb-3">
                  <Badge color="blue">{(() => { const c = CATEGORIES.find(c => c.key === project.category); if (!c) return project.category; return language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label; })()}</Badge>
                  {hasBid && <Badge color="green"><Check className="w-3 h-3" /> {t('board.bidPlaced')}</Badge>}
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">{project.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{project.description}</p>

                {project.skills_required.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.skills_required.slice(0, 4).map(s => <Badge key={s} color="slate">{s}</Badge>)}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-slate-50 dark:bg-[#161c2b]/50 rounded-lg p-2">
                    <DollarSign className="w-4 h-4 text-success-600 mx-auto mb-0.5" />
                    <div className="text-xs text-slate-500">{t('board.budget')}</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {project.budget_min && project.budget_max ? `${formatPrice(project.budget_min, project.currency)}—${formatPrice(project.budget_max, project.currency)}` : budget ? formatPrice(budget, project.currency) : t('board.negotiable')}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#161c2b]/50 rounded-lg p-2">
                    <Users className="w-4 h-4 text-brand-600 mx-auto mb-0.5" />
                    <div className="text-xs text-slate-500">{t('board.bids')}</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{project.bids_count}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#161c2b]/50 rounded-lg p-2">
                    <Clock className="w-4 h-4 text-warning-600 mx-auto mb-0.5" />
                    <div className="text-xs text-slate-500">{t('board.deadline')}</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {remaining !== null ? (remaining > 0 ? `${remaining}${t('board.days')}` : t('board.closed')) : project.duration_days ? `${project.duration_days}${t('board.days')}` : '—'}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          hasBid={myBids.has(selectedProject.id)}
          onBidPlaced={() => { loadMyBids(); loadProjects(); }}
          onOpenChat={onOpenChat}
          onViewProfile={setViewingProfileId}
        />
      )}

      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); loadProjects(); }} />
      )}

      {viewingProfileId && (
        <UserProfileModal
          userId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
          onMessage={(id) => { setViewingProfileId(null); onOpenChat?.(id); }}
        />
      )}
    </div>
  );
}

function ProjectDetailModal({ project, onClose, hasBid, onBidPlaced, onOpenChat, onViewProfile }: {
  project: Project;
  onClose: () => void;
  hasBid: boolean;
  onBidPlaced: () => void;
  onOpenChat?: (userId: string) => void;
  onViewProfile: (userId: string) => void;
}) {
  const { profile, updateProfile } = useAuth();
  const [switchingRole, setSwitchingRole] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(true);
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidAmount, setBidAmount] = useState(project.budget_min ?? project.budget_fixed ?? 100);
  const [bidDays, setBidDays] = useState(project.duration_days ?? 7);
  const [bidMessage, setBidMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myPortfolio, setMyPortfolio] = useState<PortfolioItem[]>([]);
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<string[]>([]);
  const [portfolioById, setPortfolioById] = useState<Record<string, PortfolioItem>>({});
  const employer = project.employer as unknown as Profile | undefined;
  const isOwner = profile?.id === project.employer_id;
  const { language } = useTheme();

  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const handleTranslate = async () => {
    setTranslating(true);
    setTranslateError(null);
    try {
      const [tTitle, tDescription] = await Promise.all([
        translateText(project.title, language),
        translateText(project.description, language),
      ]);
      setTranslatedTitle(tTitle);
      setTranslatedDescription(tDescription);
    } catch {
      setTranslateError(t('board.translateError'));
    }
    setTranslating(false);
  };

  const displayTitle = translatedTitle ?? project.title;
  const displayDescription = translatedDescription ?? project.description;

  const loadBids = useCallback(async () => {
    const { data } = await supabase
      .from('bids')
      .select('*, freelancer:freelancer_id(*)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });
    if (data) {
      const bidsData = data as Bid[];
      setBids(bidsData);
      const ids = Array.from(new Set(bidsData.flatMap(b => b.portfolio_item_ids || [])));
      if (ids.length > 0) {
        const { data: items } = await supabase.from('portfolio_items').select('*').in('id', ids);
        if (items) setPortfolioById(Object.fromEntries((items as PortfolioItem[]).map(i => [i.id, i])));
      }
    }
    setLoadingBids(false);
  }, [project.id]);

  useEffect(() => { loadBids(); }, [loadBids]);

  useEffect(() => {
    if (!profile || isOwner) return;
    supabase.from('portfolio_items').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setMyPortfolio(data as PortfolioItem[]);
    });
  }, [profile, isOwner]);

  const togglePortfolioItem = (id: string) => {
    setSelectedPortfolioIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBid = async () => {
    if (!profile || profile.role !== 'freelancer' || needsIdentityVerification(profile)) return;
    setSubmitting(true);
    const { data: newBid, error } = await supabase.from('bids').insert({
      project_id: project.id,
      freelancer_id: profile.id,
      bid_amount: bidAmount,
      delivery_days: bidDays,
      message: bidMessage,
      portfolio_item_ids: selectedPortfolioIds,
    }).select('id').single();
    if (!error && newBid) {
      await supabase.from('projects').update({ bids_count: (project.bids_count ?? 0) + 1 }).eq('id', project.id);
      await supabase.from('notifications').insert({
        user_id: project.employer_id,
        type: 'bid',
        title: t('board.newBid.title'),
        body: `${t('board.newBid.body')} "${project.title}" — ${formatPrice(bidAmount, project.currency)}`,
        link: 'chat',
      });
      await sendBidMessage(
        {
          bid_id: newBid.id,
          project_id: project.id,
          project_title: project.title,
          employer_id: project.employer_id,
          freelancer_id: profile.id,
          bid_amount: bidAmount,
          delivery_days: bidDays,
          message: bidMessage,
          portfolio_item_ids: selectedPortfolioIds,
        },
        `${t('board.newBid.body')} "${project.title}" — ${formatPrice(bidAmount, project.currency)}`
      );
    }
    setSubmitting(false);
    setShowBidForm(false);
    onBidPlaced();
    loadBids();
  };

  const handleAcceptBid = async (bid: Bid) => {
    if (!profile) return;
    await acceptBidHelper(bid, profile.id, t('board.bidAccepted.title'), `${t('board.bidAccepted.body')} "${project.title}"`);
    loadBids();
  };

  const startChat = async (userId: string) => {
    if (!profile) return;
    const { data: existing } = await supabase
      .from('chats')
      .select('id')
      .or(`and(participant_1.eq.${profile.id},participant_2.eq.${userId}),and(participant_1.eq.${userId},participant_2.eq.${profile.id})`)
      .maybeSingle();
    if (!existing) {
      await supabase.from('chats').insert({ participant_1: profile.id, participant_2: userId });
    }
    onOpenChat?.(userId);
  };

  return (
    <Modal open onClose={onClose} size="lg" title={displayTitle}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => employer && onViewProfile(employer.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
            <Avatar src={employer?.avatar_url ?? undefined} name={employer?.display_name || employer?.email} size={40} />
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 dark:text-white">{employer?.display_name || employer?.full_name}</div>
              <div className="text-xs text-slate-500">{timeAgo(project.created_at)}</div>
            </div>
          </button>
          <Badge color="blue">{(() => { const c = CATEGORIES.find(c => c.key === project.category); if (!c) return ''; return language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label; })()}</Badge>
        </div>

        <div className="mb-2">
          {translatedDescription ? (
            <button onClick={() => { setTranslatedTitle(null); setTranslatedDescription(null); }} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              <Languages className="w-3.5 h-3.5" /> {t('board.showOriginal')}
            </button>
          ) : (
            <button onClick={handleTranslate} disabled={translating} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              {translating ? <Spinner className="w-3.5 h-3.5" /> : <Languages className="w-3.5 h-3.5" />} {t('board.translate')}
            </button>
          )}
          {translateError && <p className="text-xs text-error-600 mt-1">{translateError}</p>}
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4 whitespace-pre-wrap">{displayDescription}</p>

        {project.skills_required.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{t('board.requiredSkills')}</h4>
            <div className="flex flex-wrap gap-2">{project.skills_required.map(s => <Badge key={s} color="slate">{s}</Badge>)}</div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-3 text-center">
            <DollarSign className="w-5 h-5 text-success-600 mx-auto mb-1" />
            <div className="text-xs text-slate-500">{t('board.budget')}</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {project.budget_min && project.budget_max ? `${formatPrice(project.budget_min, project.currency)}—${formatPrice(project.budget_max, project.currency)}` : project.budget_fixed ? formatPrice(project.budget_fixed, project.currency) : t('board.negotiable')}
            </div>
          </div>
          <div className="card p-3 text-center">
            <Calendar className="w-5 h-5 text-brand-600 mx-auto mb-1" />
            <div className="text-xs text-slate-500">{t('board.deadline')}</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">{project.duration_days ? `${project.duration_days} ${t('board.days')}` : '—'}</div>
          </div>
          <div className="card p-3 text-center">
            <Users className="w-5 h-5 text-brand-600 mx-auto mb-1" />
            <div className="text-xs text-slate-500">{t('board.bids')}</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">{bids.length}</div>
          </div>
        </div>

        {/* Bids section */}
        <div className="border-t border-slate-200 dark:border-[#232a3d] pt-4">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">{t('board.bids')} ({isOwner ? bids.length : project.bids_count})</h4>
          {loadingBids ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16" />)}</div>
          ) : !isOwner ? (
            // Bids stay anonymous to everyone except the project owner —
            // other freelancers only see how many people applied, not who
            // or for how much, so they can't undercut each other. RLS
            // already limits what non-owners can fetch from `bids` to just
            // their own row, so the true total comes from
            // projects.bids_count instead of bids.length here.
            project.bids_count === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">{t('board.noBidsYet')}</p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 py-2">
                <Users className="w-4 h-4 text-slate-400" /> {project.bids_count} {t('board.bidsAnonymous')}
              </div>
            )
          ) : bids.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">{t('board.noBidsYet')}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {bids.map(bid => {
                const freelancer = bid.freelancer as unknown as Profile | undefined;
                const attached = (bid.portfolio_item_ids || []).map(id => portfolioById[id]).filter(Boolean);
                return (
                  <div key={bid.id} className="card p-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => freelancer && onViewProfile(freelancer.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                        <Avatar src={freelancer?.avatar_url ?? undefined} name={freelancer?.display_name || freelancer?.email} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white text-sm truncate">{freelancer?.display_name || freelancer?.full_name}</div>
                          {freelancer?.rating != null && freelancer?.rating > 0 && <div className="flex items-center gap-1"><Stars rating={freelancer.rating} size={10} /><span className="text-xs text-slate-500">{freelancer.rating}</span></div>}
                          {bid.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{bid.message}</p>}
                        </div>
                      </button>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-brand-600 dark:text-brand-400">{formatPrice(bid.bid_amount, project.currency)}</div>
                        <div className="text-xs text-slate-500">{bid.delivery_days} {t('board.days')}</div>
                      </div>
                      {isOwner && bid.status === 'pending' && (
                        <button onClick={() => handleAcceptBid(bid)} className="btn-primary !px-3 !py-1.5 text-xs">{t('board.accept')}</button>
                      )}
                      {bid.status === 'accepted' && <Badge color="green"><Check className="w-3 h-3" /> {t('board.accepted')}</Badge>}
                      {!isOwner && profile?.id !== bid.freelancer_id && (
                        <button onClick={() => startChat(bid.freelancer_id)} className="btn-ghost !p-2"><MessageSquare className="w-4 h-4" /></button>
                      )}
                    </div>
                    {attached.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#232a3d]">
                        <div className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1"><Briefcase className="w-3 h-3" /> {t('portfolio.attached')}</div>
                        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
                          {attached.map(p => (
                            <a
                              key={p.id}
                              href={p.link_url || undefined}
                              target={p.link_url ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              className={`shrink-0 w-16 ${p.link_url ? 'cursor-pointer' : 'cursor-default'}`}
                              title={p.title}
                            >
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#161c2b] flex items-center justify-center relative">
                                {p.image_urls[0] ? (
                                  <img src={p.image_urls[0]} alt={p.title} className="w-full h-full object-cover" />
                                ) : (
                                  <Briefcase className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                )}
                                {p.link_url && <ExternalLink className="w-3 h-3 text-white absolute bottom-1 right-1 drop-shadow" />}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.title}</div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bid form */}
        {!isOwner && profile?.role === 'employer' && (
          <div className="border-t border-slate-200 dark:border-[#232a3d] pt-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
              <Gavel className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 dark:text-white text-sm">{t('board.roleRequired.title')}</div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{t('board.roleRequired.message')}</p>
                <button
                  onClick={async () => { setSwitchingRole(true); await updateProfile({ role: 'freelancer' }); setSwitchingRole(false); }}
                  disabled={switchingRole}
                  className="btn-primary text-sm mt-3"
                >
                  {switchingRole ? <Spinner className="w-4 h-4" /> : null}
                  {t('board.roleRequired.button')}
                </button>
              </div>
            </div>
          </div>
        )}
        {!isOwner && profile?.role === 'freelancer' && (
          <div className="border-t border-slate-200 dark:border-[#232a3d] pt-4">
            {needsIdentityVerification(profile) ? (
              <VerificationRequiredNotice messageKey="verify.required.bid" />
            ) : hasBid && !showBidForm ? (
              <div className="text-center py-2">
                <Badge color="green"><Check className="w-3 h-3" /> {t('board.alreadyBid')}</Badge>
              </div>
            ) : showBidForm ? (
              <div className="space-y-3 animate-slide-down">
                <h4 className="font-semibold text-slate-900 dark:text-white">{t('board.yourBid')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('board.yourPrice')}</label>
                    <input type="number" value={bidAmount} onChange={e => setBidAmount(Number(e.target.value))} className="input" />
                  </div>
                  <div>
                    <label className="label">{t('board.duration')}</label>
                    <input type="number" value={bidDays} onChange={e => setBidDays(Number(e.target.value))} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">{t('board.coverLetter')}</label>
                  <textarea value={bidMessage} onChange={e => setBidMessage(e.target.value)} rows={3} placeholder={t('board.coverLetter.placeholder')} className="input" />
                </div>
                {myPortfolio.length > 0 && (
                  <div>
                    <label className="label">{t('portfolio.attach')}</label>
                    <p className="text-xs text-slate-400 mb-2">{t('portfolio.attach.hint')}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {myPortfolio.map(p => {
                        const selected = selectedPortfolioIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => togglePortfolioItem(p.id)}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all ${selected ? 'border-brand-500' : 'border-slate-200 dark:border-[#232a3d]'}`}
                            style={{ aspectRatio: '1' }}
                          >
                            {p.image_urls[0] ? (
                              <img src={p.image_urls[0]} alt={p.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-[#161c2b]">
                                <Briefcase className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                              </div>
                            )}
                            {selected && (
                              <div className="absolute inset-0 bg-brand-600/40 flex items-center justify-center">
                                <Check className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">{p.title}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setShowBidForm(false)} className="btn-secondary flex-1">{t('board.cancel')}</button>
                  <button onClick={handleBid} disabled={submitting} className="btn-primary flex-1">
                    {submitting ? <Spinner className="w-4 h-4" /> : <Gavel className="w-4 h-4" />}
                    {t('board.submitBid')}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowBidForm(true)} className="btn-primary w-full">
                <Gavel className="w-4 h-4" />
                {t('board.submitBid')}
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('design');
  const [budgetType, setBudgetType] = useState<'range' | 'fixed'>('range');
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [budgetMin, setBudgetMin] = useState(100);
  const [budgetMax, setBudgetMax] = useState(500);
  const [budgetFixed, setBudgetFixed] = useState(300);
  const [durationDays, setDurationDays] = useState(14);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput('');
  };

  const handleCreate = async () => {
    if (!profile || profile.role !== 'employer' || !title || !description) return;
    setSaving(true);
    const deadline = new Date(Date.now() + durationDays * 86400000).toISOString();
    await supabase.from('projects').insert({
      employer_id: profile.id,
      title,
      description,
      category,
      budget_min: budgetType === 'range' ? budgetMin : null,
      budget_max: budgetType === 'range' ? budgetMax : null,
      budget_fixed: budgetType === 'fixed' ? budgetFixed : null,
      currency,
      duration_days: durationDays,
      deadline,
      skills_required: skills,
      status: 'open',
    });
    setSaving(false);
    onCreated();
  };

  const { language } = useTheme();

  return (
    <Modal open onClose={onClose} size="lg" title={t('board.newProject')}>
      <div className="p-6 space-y-4">
        <div>
          <label className="label">{t('board.projectTitle')}</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('board.projectTitle.placeholder')} className="input" />
        </div>
        <div>
          <label className="label">{t('board.description')}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder={t('board.description.placeholder')} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('board.category')}</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('board.duration')}</label>
            <input type="number" value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} min={1} className="input" />
          </div>
        </div>
        <div>
          <label className="label">{t('board.budgetType')}</label>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setBudgetType('range')} className={budgetType === 'range' ? 'btn-primary' : 'btn-secondary'}>{t('board.budgetType.range')}</button>
            <button onClick={() => setBudgetType('fixed')} className={budgetType === 'fixed' ? 'btn-primary' : 'btn-secondary'}>{t('board.budgetType.fixed')}</button>
            <select value={currency} onChange={e => setCurrency(e.target.value as 'UZS' | 'USD')} className="input !w-24 ml-auto">
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {budgetType === 'range' ? (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{t('board.min')}</label><input type="number" value={budgetMin} onChange={e => setBudgetMin(Number(e.target.value))} className="input" /></div>
              <div><label className="label">{t('board.max')}</label><input type="number" value={budgetMax} onChange={e => setBudgetMax(Number(e.target.value))} className="input" /></div>
            </div>
          ) : (
            <div><label className="label">{t('board.fixedBudget')}</label><input type="number" value={budgetFixed} onChange={e => setBudgetFixed(Number(e.target.value))} className="input" /></div>
          )}
        </div>
        <div>
          <label className="label">{t('board.requiredSkills')}</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder={t('board.addSkill')} className="input" />
            <button onClick={addSkill} className="btn-secondary">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map(s => <span key={s} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{s}<button onClick={() => setSkills(skills.filter(x => x !== s))} className="ml-1">×</button></span>)}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
          <button onClick={onClose} className="btn-secondary">{t('board.cancel')}</button>
          <button onClick={handleCreate} disabled={saving || !title || !description} className="btn-primary">
            {saving && <Spinner className="w-4 h-4" />}
            {t('board.publish')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
