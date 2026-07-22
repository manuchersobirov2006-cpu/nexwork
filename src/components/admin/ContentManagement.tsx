import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/admin';
import { Avatar, Badge, Spinner, Modal, EmptyState } from '../../components/ui';
import { formatPrice } from '../../lib/format';
import type { Gig, Profile, Project, Job, Company } from '../../lib/types';
import { Search, Edit, Trash2, Save, X, AlertCircle } from 'lucide-react';

export function GigManagement({ adminId }: { adminId: string }) {
  const [gigs, setGigs] = useState<(Gig & { seller?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<(Gig & { seller?: Profile }) | null>(null);
  const [editForm, setEditForm] = useState<Partial<Gig>>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<(Gig & { seller?: Profile }) | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  useEffect(() => { loadGigs(); }, []);

  const loadGigs = async () => {
    setLoading(true);
    const { data } = await supabase.from('gigs').select('*, seller:seller_id(*)').order('created_at', { ascending: false }).limit(200);
    if (data) setGigs(data as (Gig & { seller?: Profile })[]);
    setLoading(false);
  };

  const filtered = gigs.filter(g => {
    const matchSearch = !search || g.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const startEdit = (g: Gig & { seller?: Profile }) => {
    setEditing(g);
    setEditForm({ title: g.title, description: g.description, price: g.price, category: g.category, status: g.status });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const before = { title: editing.title, description: editing.description, price: editing.price, category: editing.category, status: editing.status };
    const { error } = await supabase.from('gigs').update({
      title: editForm.title,
      description: editForm.description,
      price: editForm.price,
      category: editForm.category,
      status: editForm.status,
    }).eq('id', editing.id);
    if (!error) {
      await logAdminAction({ adminId, actionType: 'edit_gig', targetTable: 'gigs', targetId: editing.id, beforeValue: before, afterValue: editForm });
      setGigs(prev => prev.map(g => g.id === editing.id ? { ...g, ...editForm } as Gig : g));
      setEditing(null);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!removing || !removeReason.trim()) return;
    setSaving(true);
    const before = { id: removing.id, title: removing.title, status: removing.status };
    // Clean up storage images
    if (removing.image_urls && removing.image_urls.length > 0) {
      const paths = removing.image_urls
        .map(url => {
          try {
            const u = new URL(url);
            const parts = u.pathname.split('/service-images/');
            return parts[1] || null;
          } catch { return null; }
        })
        .filter(Boolean) as string[];
      if (paths.length > 0) await supabase.storage.from('service-images').remove(paths);
    }
    const { error } = await supabase.from('gigs').update({ status: 'deleted' }).eq('id', removing.id);
    if (error) { setSaving(false); return; }
    await logAdminAction({ adminId, actionType: 'remove_gig', targetTable: 'gigs', targetId: removing.id, beforeValue: before, afterValue: { status: 'deleted' }, reason: removeReason });
    await supabase.from('notifications').insert({
      user_id: removing.seller_id, type: 'admin',
      title: 'Услуга удалена администратором',
      body: `Ваша услуга «${removing.title}» была удалена. Причина: ${removeReason}`,
    });
    setGigs(prev => prev.map(g => g.id === removing.id ? { ...g, status: 'deleted' as Gig['status'] } : g));
    setRemoving(null); setRemoveReason(''); setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск услуг..." className="input pl-10" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input sm:w-48">
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="paused">Пауза</option>
          <option value="draft">Черновики</option>
          <option value="deleted">Удалённые</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map(g => (
          <div key={g.id} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-brand-600">{g.category.slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-white truncate">{g.title}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                {g.seller && <Avatar src={g.seller.avatar_url ?? undefined} name={g.seller.display_name || g.seller.email} size={16} />}
                {g.seller?.display_name} · {formatPrice(g.price)} · {g.orders_count} заказов
              </div>
            </div>
            <Badge color={g.status === 'active' ? 'green' : g.status === 'paused' ? 'amber' : 'red'}>{g.status}</Badge>
            <div className="flex gap-1">
              <button onClick={() => startEdit(g)} className="btn-ghost !p-1.5" title="Редактировать"><Edit className="w-4 h-4" /></button>
              <button onClick={() => { setRemoving(g); setRemoveReason(''); }} className="btn-ghost !p-1.5 text-error-600" title="Удалить"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon={Search} title="Не найдено" />}

      {/* Edit modal */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} size="lg" title={`Редактирование: ${editing.title}`}>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={editing.seller?.avatar_url ?? undefined} name={editing.seller?.display_name || editing.seller?.email} size={40} />
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{editing.seller?.display_name}</div>
                <div className="text-xs text-slate-500">{editing.seller?.email}</div>
              </div>
            </div>
            <div><label className="label">Заголовок</label><input className="input" value={editForm.title ?? ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></div>
            <div><label className="label">Описание</label><textarea className="input" rows={4} value={editForm.description ?? ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className="label">Цена (сум)</label><input type="number" className="input" value={editForm.price ?? 0} onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })} /></div>
              <div><label className="label">Категория</label><input className="input" value={editForm.category ?? ''} onChange={e => setEditForm({ ...editForm, category: e.target.value })} /></div>
              <div><label className="label">Статус</label>
                <select className="input" value={editForm.status ?? 'active'} onChange={e => setEditForm({ ...editForm, status: e.target.value as Gig['status'] })}>
                  <option value="active">Активна</option>
                  <option value="paused">Пауза</option>
                  <option value="draft">Черновик</option>
                  <option value="deleted">Удалена</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
              <button onClick={() => setEditing(null)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Сохранить</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove modal */}
      {removing && (
        <Modal open onClose={() => setRemoving(null)} size="sm" title="Удаление услуги">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-error-50 dark:bg-error-900/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-error-600 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300">Удалить «{removing.title}»? Владелец получит уведомление.</p>
            </div>
            <div><label className="label">Причина удаления</label><textarea className="input" rows={3} value={removeReason} onChange={e => setRemoveReason(e.target.value)} placeholder="Укажите причину..." autoFocus /></div>
            <div className="flex gap-2">
              <button onClick={() => setRemoving(null)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={handleRemove} disabled={saving || !removeReason.trim()} className="btn-danger flex-1"><Trash2 className="w-4 h-4" /> Удалить</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ProjectManagement({ adminId }: { adminId: string }) {
  const [projects, setProjects] = useState<(Project & { employer?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<(Project & { employer?: Profile }) | null>(null);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<(Project & { employer?: Profile }) | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    setLoading(true);
    const { data } = await supabase.from('projects').select('*, employer:employer_id(*)').order('created_at', { ascending: false }).limit(200);
    if (data) setProjects(data as (Project & { employer?: Profile })[]);
    setLoading(false);
  };

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const startEdit = (p: Project & { employer?: Profile }) => {
    setEditing(p);
    setEditForm({ title: p.title, description: p.description, budget_fixed: p.budget_fixed, category: p.category, status: p.status });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const before = { title: editing.title, description: editing.description, budget_fixed: editing.budget_fixed, category: editing.category, status: editing.status };
    const { error } = await supabase.from('projects').update({
      title: editForm.title,
      description: editForm.description,
      budget_fixed: editForm.budget_fixed,
      category: editForm.category,
      status: editForm.status,
    }).eq('id', editing.id);
    if (!error) {
      await logAdminAction({ adminId, actionType: 'edit_project', targetTable: 'projects', targetId: editing.id, beforeValue: before, afterValue: editForm });
      setProjects(prev => prev.map(p => p.id === editing.id ? { ...p, ...editForm } as Project : p));
      setEditing(null);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!removing || !removeReason.trim()) return;
    setSaving(true);
    const before = { id: removing.id, title: removing.title, status: removing.status };
    await supabase.from('projects').update({ status: 'cancelled' }).eq('id', removing.id);
    await logAdminAction({ adminId, actionType: 'remove_project', targetTable: 'projects', targetId: removing.id, beforeValue: before, afterValue: { status: 'cancelled' }, reason: removeReason });
    await supabase.from('notifications').insert({
      user_id: removing.employer_id, type: 'admin',
      title: 'Проект удалён администратором',
      body: `Ваш проект «${removing.title}» был удалён. Причина: ${removeReason}`,
    });
    setProjects(prev => prev.map(p => p.id === removing.id ? { ...p, status: 'cancelled' as Project['status'] } : p));
    setRemoving(null); setRemoveReason(''); setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск проектов..." className="input pl-10" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input sm:w-48">
          <option value="all">Все статусы</option>
          <option value="open">Открыт</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Завершён</option>
          <option value="cancelled">Отменён</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-accent-600">{p.category?.slice(0, 2).toUpperCase() || 'PR'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-white truncate">{p.title}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                {p.employer && <Avatar src={p.employer.avatar_url ?? undefined} name={p.employer.display_name || p.employer.email} size={16} />}
                {p.employer?.display_name} · {formatPrice(p.budget_fixed ?? 0)} · {p.bids_count} заявок
              </div>
            </div>
            <Badge color={p.status === 'open' ? 'green' : p.status === 'in_progress' ? 'blue' : p.status === 'completed' ? 'slate' : 'red'}>
              {p.status === 'open' ? 'Открыт' : p.status === 'in_progress' ? 'В работе' : p.status === 'completed' ? 'Завершён' : 'Отменён'}
            </Badge>
            <div className="flex gap-1">
              <button onClick={() => startEdit(p)} className="btn-ghost !p-1.5" title="Редактировать"><Edit className="w-4 h-4" /></button>
              <button onClick={() => { setRemoving(p); setRemoveReason(''); }} className="btn-ghost !p-1.5 text-error-600" title="Удалить"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon={Search} title="Не найдено" />}

      {/* Edit modal */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} size="lg" title={`Редактирование: ${editing.title}`}>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={editing.employer?.avatar_url ?? undefined} name={editing.employer?.display_name || editing.employer?.email} size={40} />
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{editing.employer?.display_name}</div>
                <div className="text-xs text-slate-500">{editing.employer?.email}</div>
              </div>
            </div>
            <div><label className="label">Заголовок</label><input className="input" value={editForm.title ?? ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></div>
            <div><label className="label">Описание</label><textarea className="input" rows={4} value={editForm.description ?? ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className="label">Бюджет (сум)</label><input type="number" className="input" value={editForm.budget_fixed ?? 0} onChange={e => setEditForm({ ...editForm, budget_fixed: Number(e.target.value) })} /></div>
              <div><label className="label">Категория</label><input className="input" value={editForm.category ?? ''} onChange={e => setEditForm({ ...editForm, category: e.target.value })} /></div>
              <div><label className="label">Статус</label>
                <select className="input" value={editForm.status ?? 'open'} onChange={e => setEditForm({ ...editForm, status: e.target.value as Project['status'] })}>
                  <option value="open">Открыт</option>
                  <option value="in_progress">В работе</option>
                  <option value="completed">Завершён</option>
                  <option value="cancelled">Отменён</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
              <button onClick={() => setEditing(null)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Сохранить</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove modal */}
      {removing && (
        <Modal open onClose={() => setRemoving(null)} size="sm" title="Удаление проекта">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-error-50 dark:bg-error-900/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-error-600 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300">Удалить «{removing.title}»? Владелец получит уведомление.</p>
            </div>
            <div><label className="label">Причина удаления</label><textarea className="input" rows={3} value={removeReason} onChange={e => setRemoveReason(e.target.value)} placeholder="Укажите причину..." autoFocus /></div>
            <div className="flex gap-2">
              <button onClick={() => setRemoving(null)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={handleRemove} disabled={saving || !removeReason.trim()} className="btn-danger flex-1"><Trash2 className="w-4 h-4" /> Удалить</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function JobManagement({ adminId }: { adminId: string }) {
  const [jobs, setJobs] = useState<(Job & { employer?: Profile; company?: Company })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<(Job & { employer?: Profile; company?: Company }) | null>(null);
  const [editForm, setEditForm] = useState<Partial<Job>>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<(Job & { employer?: Profile; company?: Company }) | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    setLoading(true);
    const { data } = await supabase.from('jobs').select('*, employer:employer_id(*), company:company_id(*)').order('created_at', { ascending: false }).limit(200);
    if (data) setJobs(data as (Job & { employer?: Profile; company?: Company })[]);
    setLoading(false);
  };

  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const startEdit = (j: Job & { employer?: Profile; company?: Company }) => {
    setEditing(j);
    setEditForm({ title: j.title, description: j.description, category: j.category, salary_min: j.salary_min, salary_max: j.salary_max, location: j.location, status: j.status });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const before = { title: editing.title, description: editing.description, category: editing.category, salary_min: editing.salary_min, salary_max: editing.salary_max, location: editing.location, status: editing.status };
    const { error } = await supabase.from('jobs').update({
      title: editForm.title,
      description: editForm.description,
      category: editForm.category,
      salary_min: editForm.salary_min,
      salary_max: editForm.salary_max,
      location: editForm.location,
      status: editForm.status,
    }).eq('id', editing.id);
    if (!error) {
      await logAdminAction({ adminId, actionType: 'edit_job', targetTable: 'jobs', targetId: editing.id, beforeValue: before, afterValue: editForm });
      setJobs(prev => prev.map(j => j.id === editing.id ? { ...j, ...editForm } as Job : j));
      setEditing(null);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!removing || !removeReason.trim()) return;
    setSaving(true);
    const before = { id: removing.id, title: removing.title, status: removing.status };
    const { error } = await supabase.from('jobs').delete().eq('id', removing.id);
    if (error) { setSaving(false); return; }
    await logAdminAction({ adminId, actionType: 'remove_job', targetTable: 'jobs', targetId: removing.id, beforeValue: before, afterValue: null, reason: removeReason });
    await supabase.from('notifications').insert({
      user_id: removing.employer_id, type: 'admin',
      title: 'Вакансия удалена администратором',
      body: `Ваша вакансия «${removing.title}» была удалена. Причина: ${removeReason}`,
    });
    setJobs(prev => prev.filter(j => j.id !== removing.id));
    setRemoving(null); setRemoveReason(''); setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск вакансий..." className="input pl-10" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input sm:w-48">
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="draft">Черновики</option>
          <option value="closed">Закрытые</option>
          <option value="filled">Специалист найден</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map(j => (
          <div key={j.id} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-accent-600">{j.category?.slice(0, 2).toUpperCase() || 'JB'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-white truncate">{j.title}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                {j.employer && <Avatar src={j.employer.avatar_url ?? undefined} name={j.employer.display_name || j.employer.email} size={16} />}
                {j.company?.name || j.employer?.display_name} · {j.applicants_count} откликов
              </div>
            </div>
            <Badge color={j.status === 'active' ? 'green' : j.status === 'draft' ? 'amber' : j.status === 'filled' ? 'blue' : 'red'}>{j.status}</Badge>
            <div className="flex gap-1">
              <button onClick={() => startEdit(j)} className="btn-ghost !p-1.5" title="Редактировать"><Edit className="w-4 h-4" /></button>
              <button onClick={() => { setRemoving(j); setRemoveReason(''); }} className="btn-ghost !p-1.5 text-error-600" title="Удалить"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon={Search} title="Не найдено" />}

      {/* Edit modal */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} size="lg" title={`Редактирование: ${editing.title}`}>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={editing.employer?.avatar_url ?? undefined} name={editing.employer?.display_name || editing.employer?.email} size={40} />
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{editing.employer?.display_name}</div>
                <div className="text-xs text-slate-500">{editing.employer?.email}</div>
              </div>
            </div>
            <div><label className="label">Заголовок</label><input className="input" value={editForm.title ?? ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></div>
            <div><label className="label">Описание</label><textarea className="input" rows={4} value={editForm.description ?? ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Зарплата от</label><input type="number" className="input" value={editForm.salary_min ?? 0} onChange={e => setEditForm({ ...editForm, salary_min: Number(e.target.value) })} /></div>
              <div><label className="label">Зарплата до</label><input type="number" className="input" value={editForm.salary_max ?? 0} onChange={e => setEditForm({ ...editForm, salary_max: Number(e.target.value) })} /></div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className="label">Категория</label><input className="input" value={editForm.category ?? ''} onChange={e => setEditForm({ ...editForm, category: e.target.value })} /></div>
              <div><label className="label">Локация</label><input className="input" value={editForm.location ?? ''} onChange={e => setEditForm({ ...editForm, location: e.target.value })} /></div>
              <div><label className="label">Статус</label>
                <select className="input" value={editForm.status ?? 'active'} onChange={e => setEditForm({ ...editForm, status: e.target.value as Job['status'] })}>
                  <option value="active">Активна</option>
                  <option value="draft">Черновик</option>
                  <option value="closed">Закрыта</option>
                  <option value="filled">Специалист найден</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
              <button onClick={() => setEditing(null)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Сохранить</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove modal */}
      {removing && (
        <Modal open onClose={() => setRemoving(null)} size="sm" title="Удаление вакансии">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-error-50 dark:bg-error-900/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-error-600 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300">Удалить «{removing.title}»? Владелец получит уведомление.</p>
            </div>
            <div><label className="label">Причина удаления</label><textarea className="input" rows={3} value={removeReason} onChange={e => setRemoveReason(e.target.value)} placeholder="Укажите причину..." autoFocus /></div>
            <div className="flex gap-2">
              <button onClick={() => setRemoving(null)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={handleRemove} disabled={saving || !removeReason.trim()} className="btn-danger flex-1"><Trash2 className="w-4 h-4" /> Удалить</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function CompanyManagement({ adminId }: { adminId: string }) {
  const [companies, setCompanies] = useState<(Company & { owner?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<(Company & { owner?: Profile }) | null>(null);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<(Company & { owner?: Profile }) | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  useEffect(() => { loadCompanies(); }, []);

  const loadCompanies = async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*, owner:owner_id(*)').order('created_at', { ascending: false }).limit(200);
    if (data) setCompanies(data as (Company & { owner?: Profile })[]);
    setLoading(false);
  };

  const filtered = companies.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const startEdit = (c: Company & { owner?: Profile }) => {
    setEditing(c);
    setEditForm({ name: c.name, description: c.description, industry: c.industry, website: c.website, location: c.location, is_verified: c.is_verified });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const before = { name: editing.name, description: editing.description, industry: editing.industry, website: editing.website, location: editing.location, is_verified: editing.is_verified };
    const { error } = await supabase.from('companies').update({
      name: editForm.name,
      description: editForm.description,
      industry: editForm.industry,
      website: editForm.website,
      location: editForm.location,
      is_verified: editForm.is_verified,
    }).eq('id', editing.id);
    if (!error) {
      await logAdminAction({ adminId, actionType: 'edit_company', targetTable: 'companies', targetId: editing.id, beforeValue: before, afterValue: editForm });
      setCompanies(prev => prev.map(c => c.id === editing.id ? { ...c, ...editForm } as Company : c));
      setEditing(null);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!removing || !removeReason.trim()) return;
    setSaving(true);
    const before = { id: removing.id, name: removing.name };
    const { error } = await supabase.from('companies').delete().eq('id', removing.id);
    if (error) { setSaving(false); return; }
    await logAdminAction({ adminId, actionType: 'remove_company', targetTable: 'companies', targetId: removing.id, beforeValue: before, afterValue: null, reason: removeReason });
    await supabase.from('notifications').insert({
      user_id: removing.owner_id, type: 'admin',
      title: 'Компания удалена администратором',
      body: `Ваша компания «${removing.name}» была удалена. Причина: ${removeReason}`,
    });
    setCompanies(prev => prev.filter(c => c.id !== removing.id));
    setRemoving(null); setRemoveReason(''); setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск компаний..." className="input pl-10" />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className="card p-4 flex items-center gap-3">
            <Avatar src={c.logo_url ?? undefined} name={c.name} size={40} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                {c.name}
                {c.is_verified && <Badge color="blue">Верифицирована</Badge>}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                {c.owner && <Avatar src={c.owner.avatar_url ?? undefined} name={c.owner.display_name || c.owner.email} size={16} />}
                {c.owner?.display_name} · {c.industry || '—'} · {c.employees_count} сотр.
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(c)} className="btn-ghost !p-1.5" title="Редактировать"><Edit className="w-4 h-4" /></button>
              <button onClick={() => { setRemoving(c); setRemoveReason(''); }} className="btn-ghost !p-1.5 text-error-600" title="Удалить"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon={Search} title="Не найдено" />}

      {/* Edit modal */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} size="lg" title={`Редактирование: ${editing.name}`}>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={editing.owner?.avatar_url ?? undefined} name={editing.owner?.display_name || editing.owner?.email} size={40} />
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{editing.owner?.display_name}</div>
                <div className="text-xs text-slate-500">{editing.owner?.email}</div>
              </div>
            </div>
            <div><label className="label">Название</label><input className="input" value={editForm.name ?? ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><label className="label">Описание</label><textarea className="input" rows={4} value={editForm.description ?? ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className="label">Индустрия</label><input className="input" value={editForm.industry ?? ''} onChange={e => setEditForm({ ...editForm, industry: e.target.value })} /></div>
              <div><label className="label">Сайт</label><input className="input" value={editForm.website ?? ''} onChange={e => setEditForm({ ...editForm, website: e.target.value })} /></div>
              <div><label className="label">Локация</label><input className="input" value={editForm.location ?? ''} onChange={e => setEditForm({ ...editForm, location: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={editForm.is_verified ?? false} onChange={e => setEditForm({ ...editForm, is_verified: e.target.checked })} />
              Верифицированная компания
            </label>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
              <button onClick={() => setEditing(null)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Сохранить</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove modal */}
      {removing && (
        <Modal open onClose={() => setRemoving(null)} size="sm" title="Удаление компании">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-error-50 dark:bg-error-900/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-error-600 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300">Удалить «{removing.name}»? Владелец получит уведомление. Связанные вакансии останутся, но потеряют привязку к компании.</p>
            </div>
            <div><label className="label">Причина удаления</label><textarea className="input" rows={3} value={removeReason} onChange={e => setRemoveReason(e.target.value)} placeholder="Укажите причину..." autoFocus /></div>
            <div className="flex gap-2">
              <button onClick={() => setRemoving(null)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={handleRemove} disabled={saving || !removeReason.trim()} className="btn-danger flex-1"><Trash2 className="w-4 h-4" /> Удалить</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

