import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { CATEGORIES } from '../lib/constants';
import { formatPrice, timeAgo, daysUntil } from '../lib/format';
import { Avatar, Badge, Modal, EmptyState, SkeletonCard, Spinner, Stars } from '../components/ui';
import type { Project, Bid, Profile } from '../lib/types';
import {
  Plus, Clock, DollarSign, Users, Gavel,
  Check, MessageSquare, Calendar
} from 'lucide-react';

export function BoardScreen({ onOpenChat }: { onOpenChat?: (userId: string) => void }) {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'budget_high' | 'bids' | 'ending'>('newest');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myBids, setMyBids] = useState<Set<string>>(new Set());

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
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Тендерная доска</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Проекты от заказчиков — подайте заявку</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Опубликовать проект
        </button>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск проектов..." className="input flex-1" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="input sm:w-48">
            <option value="all">Все категории</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="input sm:w-48">
            <option value="newest">Сначала новые</option>
            <option value="budget_high">Бюджет: по убыванию</option>
            <option value="bids">Больше заявок</option>
            <option value="ending">Скоро закроются</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={Gavel} title="Нет открытых проектов" description="Измените фильтры или опубликуйте свой проект" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {projects.map(project => {
            const employer = project.employer as unknown as Profile | undefined;
            const budget = project.budget_fixed ?? project.budget_max ?? project.budget_min;
            const remaining = project.deadline ? daysUntil(project.deadline) : null;
            const hasBid = myBids.has(project.id);
            return (
              <div key={project.id} className="card p-5 hover:shadow-card-hover transition-all duration-200 cursor-pointer animate-fade-in" onClick={() => setSelectedProject(project)}>
                <div className="flex items-start justify-between mb-3">
                  <Badge color="blue">{CATEGORIES.find(c => c.key === project.category)?.label || project.category}</Badge>
                  {hasBid && <Badge color="green"><Check className="w-3 h-3" /> Заявка подана</Badge>}
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">{project.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{project.description}</p>

                {project.skills_required.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.skills_required.slice(0, 4).map(s => <Badge key={s} color="slate">{s}</Badge>)}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                    <DollarSign className="w-4 h-4 text-success-600 mx-auto mb-0.5" />
                    <div className="text-xs text-slate-500">Бюджет</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {project.budget_min && project.budget_max ? `${formatPrice(project.budget_min)}—${formatPrice(project.budget_max)}` : budget ? formatPrice(budget) : 'Договорная'}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                    <Users className="w-4 h-4 text-brand-600 mx-auto mb-0.5" />
                    <div className="text-xs text-slate-500">Заявки</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{project.bids_count}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                    <Clock className="w-4 h-4 text-warning-600 mx-auto mb-0.5" />
                    <div className="text-xs text-slate-500">Срок</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {remaining !== null ? (remaining > 0 ? `${remaining}д` : 'Закрыт') : project.duration_days ? `${project.duration_days}д` : '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Avatar src={employer?.avatar_url ?? undefined} name={employer?.display_name || employer?.email} size={24} />
                    <span className="text-xs text-slate-500">{employer?.display_name || employer?.full_name || 'Заказчик'}</span>
                  </div>
                  <span className="text-xs text-slate-400">{timeAgo(project.created_at)}</span>
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
        />
      )}

      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); loadProjects(); }} />
      )}
    </div>
  );
}

function ProjectDetailModal({ project, onClose, hasBid, onBidPlaced, onOpenChat }: {
  project: Project;
  onClose: () => void;
  hasBid: boolean;
  onBidPlaced: () => void;
  onOpenChat?: (userId: string) => void;
}) {
  const { profile } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(true);
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidAmount, setBidAmount] = useState(project.budget_min ?? project.budget_fixed ?? 100);
  const [bidDays, setBidDays] = useState(project.duration_days ?? 7);
  const [bidMessage, setBidMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const employer = project.employer as unknown as Profile | undefined;
  const isOwner = profile?.id === project.employer_id;

  const loadBids = useCallback(async () => {
    const { data } = await supabase
      .from('bids')
      .select('*, freelancer:freelancer_id(*)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });
    if (data) setBids(data as Bid[]);
    setLoadingBids(false);
  }, [project.id]);

  useEffect(() => { loadBids(); }, [loadBids]);

  const handleBid = async () => {
    if (!profile) return;
    setSubmitting(true);
    const { error } = await supabase.from('bids').insert({
      project_id: project.id,
      freelancer_id: profile.id,
      bid_amount: bidAmount,
      delivery_days: bidDays,
      message: bidMessage,
    });
    if (!error) {
      await supabase.from('projects').update({ bids_count: (project.bids_count ?? 0) + 1 }).eq('id', project.id);
      await supabase.from('notifications').insert({
        user_id: project.employer_id,
        type: 'bid',
        title: 'Новая заявка на проект',
        body: `Заявка на "${project.title}" — ${formatPrice(bidAmount)}`,
        link: 'board',
      });
    }
    setSubmitting(false);
    setShowBidForm(false);
    onBidPlaced();
    loadBids();
  };

  const handleAcceptBid = async (bid: Bid) => {
    await supabase.from('bids').update({ status: 'accepted' }).eq('id', bid.id);
    await supabase.from('bids').update({ status: 'rejected' }).eq('project_id', project.id).neq('id', bid.id);
    await supabase.from('projects').update({ status: 'in_progress' }).eq('id', project.id);
    await supabase.from('notifications').insert({
      user_id: bid.freelancer_id,
      type: 'bid',
      title: 'Заявка принята!',
      body: `Ваша заявка на проект "${project.title}" принята`,
      link: 'board',
    });
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
    <Modal open onClose={onClose} size="lg" title={project.title}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Avatar src={employer?.avatar_url ?? undefined} name={employer?.display_name || employer?.email} size={40} />
          <div className="flex-1">
            <div className="font-semibold text-slate-900 dark:text-white">{employer?.display_name || employer?.full_name}</div>
            <div className="text-xs text-slate-500">{timeAgo(project.created_at)}</div>
          </div>
          <Badge color="blue">{CATEGORIES.find(c => c.key === project.category)?.label}</Badge>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4 whitespace-pre-wrap">{project.description}</p>

        {project.skills_required.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Требуемые навыки</h4>
            <div className="flex flex-wrap gap-2">{project.skills_required.map(s => <Badge key={s} color="slate">{s}</Badge>)}</div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-3 text-center">
            <DollarSign className="w-5 h-5 text-success-600 mx-auto mb-1" />
            <div className="text-xs text-slate-500">Бюджет</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {project.budget_min && project.budget_max ? `${formatPrice(project.budget_min)}—${formatPrice(project.budget_max)}` : project.budget_fixed ? formatPrice(project.budget_fixed) : 'Договорная'}
            </div>
          </div>
          <div className="card p-3 text-center">
            <Calendar className="w-5 h-5 text-brand-600 mx-auto mb-1" />
            <div className="text-xs text-slate-500">Срок</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">{project.duration_days ? `${project.duration_days} дн` : '—'}</div>
          </div>
          <div className="card p-3 text-center">
            <Users className="w-5 h-5 text-brand-600 mx-auto mb-1" />
            <div className="text-xs text-slate-500">Заявки</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">{bids.length}</div>
          </div>
        </div>

        {/* Bids section */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Заявки ({bids.length})</h4>
          {loadingBids ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16" />)}</div>
          ) : bids.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Заявок пока нет</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {bids.map(bid => {
                const freelancer = bid.freelancer as unknown as Profile | undefined;
                return (
                  <div key={bid.id} className="card p-3 flex items-center gap-3">
                    <Avatar src={freelancer?.avatar_url ?? undefined} name={freelancer?.display_name || freelancer?.email} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-white text-sm truncate">{freelancer?.display_name || freelancer?.full_name}</div>
                      {freelancer?.rating != null && freelancer?.rating > 0 && <div className="flex items-center gap-1"><Stars rating={freelancer.rating} size={10} /><span className="text-xs text-slate-500">{freelancer.rating}</span></div>}
                      {bid.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{bid.message}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-brand-600 dark:text-brand-400">{formatPrice(bid.bid_amount)}</div>
                      <div className="text-xs text-slate-500">{bid.delivery_days} дн</div>
                    </div>
                    {isOwner && bid.status === 'pending' && (
                      <button onClick={() => handleAcceptBid(bid)} className="btn-primary !px-3 !py-1.5 text-xs">Принять</button>
                    )}
                    {bid.status === 'accepted' && <Badge color="green"><Check className="w-3 h-3" /> Принята</Badge>}
                    {!isOwner && profile?.id !== bid.freelancer_id && (
                      <button onClick={() => startChat(bid.freelancer_id)} className="btn-ghost !p-2"><MessageSquare className="w-4 h-4" /></button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bid form */}
        {!isOwner && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            {hasBid && !showBidForm ? (
              <div className="text-center py-2">
                <Badge color="green"><Check className="w-3 h-3" /> Вы уже подали заявку</Badge>
              </div>
            ) : showBidForm ? (
              <div className="space-y-3 animate-slide-down">
                <h4 className="font-semibold text-slate-900 dark:text-white">Ваша заявка</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Ваша цена ($)</label>
                    <input type="number" value={bidAmount} onChange={e => setBidAmount(Number(e.target.value))} className="input" />
                  </div>
                  <div>
                    <label className="label">Срок (дней)</label>
                    <input type="number" value={bidDays} onChange={e => setBidDays(Number(e.target.value))} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Сопроводительное письмо</label>
                  <textarea value={bidMessage} onChange={e => setBidMessage(e.target.value)} rows={3} placeholder="Почему именно вы?" className="input" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowBidForm(false)} className="btn-secondary flex-1">Отмена</button>
                  <button onClick={handleBid} disabled={submitting} className="btn-primary flex-1">
                    {submitting ? <Spinner className="w-4 h-4" /> : <Gavel className="w-4 h-4" />}
                    Подать заявку
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowBidForm(true)} className="btn-primary w-full">
                <Gavel className="w-4 h-4" />
                Подать заявку
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
    if (!profile || !title || !description) return;
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
      duration_days: durationDays,
      deadline,
      skills_required: skills,
      status: 'open',
    });
    setSaving(false);
    onCreated();
  };

  return (
    <Modal open onClose={onClose} size="lg" title="Новый проект">
      <div className="p-6 space-y-4">
        <div>
          <label className="label">Название проекта</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: Нужен лендинг для интернет-магазина" className="input" />
        </div>
        <div>
          <label className="label">Описание</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Подробно опишите задачу, требования и ожидания..." className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Категория</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Срок (дней)</label>
            <input type="number" value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} min={1} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Тип бюджета</label>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setBudgetType('range')} className={budgetType === 'range' ? 'btn-primary' : 'btn-secondary'}>Диапазон</button>
            <button onClick={() => setBudgetType('fixed')} className={budgetType === 'fixed' ? 'btn-primary' : 'btn-secondary'}>Фиксированный</button>
          </div>
          {budgetType === 'range' ? (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Минимум ($)</label><input type="number" value={budgetMin} onChange={e => setBudgetMin(Number(e.target.value))} className="input" /></div>
              <div><label className="label">Максимум ($)</label><input type="number" value={budgetMax} onChange={e => setBudgetMax(Number(e.target.value))} className="input" /></div>
            </div>
          ) : (
            <div><label className="label">Бюджет ($)</label><input type="number" value={budgetFixed} onChange={e => setBudgetFixed(Number(e.target.value))} className="input" /></div>
          )}
        </div>
        <div>
          <label className="label">Требуемые навыки</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="Добавьте навык" className="input" />
            <button onClick={addSkill} className="btn-secondary">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map(s => <span key={s} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{s}<button onClick={() => setSkills(skills.filter(x => x !== s))} className="ml-1">×</button></span>)}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="btn-secondary">Отмена</button>
          <button onClick={handleCreate} disabled={saving || !title || !description} className="btn-primary">
            {saving && <Spinner className="w-4 h-4" />}
            Опубликовать
          </button>
        </div>
      </div>
    </Modal>
  );
}
