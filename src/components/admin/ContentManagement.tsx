import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/admin';
import { Avatar, Badge, Spinner, Modal, EmptyState } from '../../components/ui';
import { formatPrice } from '../../lib/format';
import type { Gig, Profile, Project } from '../../lib/types';
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
    await supabase.from('gigs').update({ status: 'removed' }).eq('id', removing.id);
    await logAdminAction({ adminId, actionType: 'remove_gig', targetTable: 'gigs', targetId: removing.id, beforeValue: before, afterValue: { status: 'removed' }, reason: removeReason });
    await supabase.from('notifications').insert({
      user_id: removing.seller_id, type: 'admin',
      title: 'Услуга удалена администратором',
      body: `Ваша услуга «${removing.title}» была удалена. Причина: ${removeReason}`,
    });
    setGigs(prev => prev.map(g => g.id === removing.id ? { ...g, status: 'removed' as Gig['status'] } : g));
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
          <option value="removed">Удалённые</option>
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
                  <option value="removed">Удалена</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
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
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
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

