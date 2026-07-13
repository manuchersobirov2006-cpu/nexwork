import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/admin';
import { Avatar, Badge, Spinner, Modal, EmptyState } from '../../components/ui';
import { formatDate } from '../../lib/format';
import type { Profile } from '../../lib/types';
import {
  Search, Edit, Ban, CheckCircle, KeyRound, Save, X, AlertCircle
} from 'lucide-react';

export function UserManagement({ adminId }: { adminId: string; onNavigateToAudit?: () => void }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<{ type: string; user: Profile } | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) setUsers(data as Profile[]);
    setLoading(false);
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || (u.display_name || u.full_name || u.email).toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const startEdit = (u: Profile) => {
    setEditing(u);
    setEditForm({
      display_name: u.display_name,
      full_name: u.full_name,
      bio: u.bio,
      location: u.location,
      phone: u.phone,
      role: u.role,
      skills: u.skills,
      categories: u.categories,
      is_verified: u.is_verified,
      verification_level: u.verification_level,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const before = { ...editing };
    const { error } = await supabase.from('profiles').update({
      display_name: editForm.display_name,
      full_name: editForm.full_name,
      bio: editForm.bio,
      location: editForm.location,
      phone: editForm.phone,
      role: editForm.role,
      skills: editForm.skills,
      categories: editForm.categories,
      is_verified: editForm.is_verified,
      verification_level: editForm.verification_level,
      updated_at: new Date().toISOString(),
    }).eq('id', editing.id);

    if (!error) {
      await logAdminAction({
        adminId,
        actionType: 'edit_user',
        targetTable: 'profiles',
        targetId: editing.id,
        beforeValue: before,
        afterValue: editForm,
      });
      setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...editForm } as Profile : u));
      setEditing(null);
    }
    setSaving(false);
  };

  const handleSuspend = async () => {
    if (!action || action.type !== 'suspend') return;
    const user = action.user;
    const before = { is_suspended: user.is_suspended, suspended_reason: user.suspended_reason };
    await supabase.from('profiles').update({
      is_suspended: true,
      suspended_reason: reason,
    }).eq('id', user.id);
    await logAdminAction({
      adminId,
      actionType: 'suspend_user',
      targetTable: 'profiles',
      targetId: user.id,
      beforeValue: before,
      afterValue: { is_suspended: true, suspended_reason: reason },
      reason,
    });
    await supabase.from('notifications').insert({
      user_id: user.id, type: 'admin',
      title: 'Аккаунт приостановлен',
      body: `Ваш аккаунт приостановлен. Причина: ${reason}`,
    });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_suspended: true, suspended_reason: reason } : u));
    setAction(null); setReason('');
  };

  const handleReactivate = async (user: Profile) => {
    const before = { is_suspended: user.is_suspended, suspended_reason: user.suspended_reason };
    await supabase.from('profiles').update({
      is_suspended: false,
      suspended_reason: null,
    }).eq('id', user.id);
    await logAdminAction({
      adminId,
      actionType: 'reactivate_user',
      targetTable: 'profiles',
      targetId: user.id,
      beforeValue: before,
      afterValue: { is_suspended: false, suspended_reason: null },
    });
    await supabase.from('notifications').insert({
      user_id: user.id, type: 'admin',
      title: 'Аккаунт активирован',
      body: 'Ваш аккаунт снова активен.',
    });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_suspended: false, suspended_reason: null } : u));
  };

  const handleToggleVerify = async (user: Profile) => {
    const newVerified = !user.is_verified;
    const newLevel = newVerified ? 'full' : 'none';
    const before = { is_verified: user.is_verified, verification_level: user.verification_level };
    await supabase.from('profiles').update({
      is_verified: newVerified,
      verification_level: newLevel,
    }).eq('id', user.id);
    await logAdminAction({
      adminId,
      actionType: newVerified ? 'verify_user' : 'unverify_user',
      targetTable: 'profiles',
      targetId: user.id,
      beforeValue: before,
      afterValue: { is_verified: newVerified, verification_level: newLevel },
    });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_verified: newVerified, verification_level: newLevel } : u));
  };

  const handleResetPassword = async (user: Profile) => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin,
    });
    await logAdminAction({
      adminId,
      actionType: 'reset_password',
      targetTable: 'profiles',
      targetId: user.id,
      afterValue: { email: user.email },
    });
    setAction(null);
    if (error) alert('Ошибка: ' + error.message);
    else alert('Письмо для сброса пароля отправлено на ' + user.email);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени или email..." className="input pl-10" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input sm:w-48">
          <option value="all">Все роли</option>
          <option value="freelancer">Фрилансеры</option>
          <option value="employer">Заказчики</option>
          <option value="admin">Админы</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Пользователь</th>
                <th className="text-left p-3 hidden sm:table-cell">Роль</th>
                <th className="text-left p-3 hidden md:table-cell">Статус</th>
                <th className="text-left p-3 hidden lg:table-cell">Регистрация</th>
                <th className="text-right p-3">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${u.is_suspended ? 'opacity-60' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar src={u.avatar_url ?? undefined} name={u.display_name || u.email} size={32} />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white truncate">{u.display_name || u.full_name}</div>
                        <div className="text-xs text-slate-500 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell"><Badge color={u.role === 'employer' ? 'purple' : u.role === 'admin' ? 'red' : 'blue'}>{u.role === 'employer' ? 'Заказчик' : u.role === 'admin' ? 'Админ' : 'Фрилансер'}</Badge></td>
                  <td className="p-3 hidden md:table-cell">
                    {u.is_suspended ? <Badge color="red"><Ban className="w-3 h-3" /> Заблокирован</Badge> : <Badge color="green">Активен</Badge>}
                    {u.is_verified && <Badge color="green" className="ml-1"><CheckCircle className="w-3 h-3" /> Проверен</Badge>}
                  </td>
                  <td className="p-3 hidden lg:table-cell text-slate-500 text-xs">{formatDate(u.created_at)}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <button onClick={() => startEdit(u)} className="btn-ghost !p-1.5" title="Редактировать"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleVerify(u)} className={`btn-ghost !p-1.5 ${u.is_verified ? 'text-success-600' : ''}`} title={u.is_verified ? 'Снять верификацию' : 'Верифицировать'}><CheckCircle className="w-4 h-4" /></button>
                      {u.is_suspended ? (
                        <button onClick={() => handleReactivate(u)} className="btn-ghost !p-1.5 text-success-600" title="Активировать"><CheckCircle className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => { setAction({ type: 'suspend', user: u }); setReason(''); }} className="btn-ghost !p-1.5 text-error-600" title="Заблокировать"><Ban className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => { setAction({ type: 'reset', user: u }); }} className="btn-ghost !p-1.5" title="Сбросить пароль"><KeyRound className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon={Search} title="Не найдено" description="Попробуйте изменить поиск" />}
      </div>

      {/* Edit user modal */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} size="lg" title={`Редактирование: ${editing.display_name || editing.full_name}`}>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={editing.avatar_url ?? undefined} name={editing.display_name || editing.email} size={48} />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{editing.email}</div>
                <div className="text-sm text-slate-500">ID: {editing.id.slice(0, 8)}</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Отображаемое имя</label><input className="input" value={editForm.display_name ?? ''} onChange={e => setEditForm({ ...editForm, display_name: e.target.value })} /></div>
              <div><label className="label">Полное имя</label><input className="input" value={editForm.full_name ?? ''} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
              <div><label className="label">Роль</label>
                <select className="input" value={editForm.role ?? 'freelancer'} onChange={e => setEditForm({ ...editForm, role: e.target.value as Profile['role'] })}>
                  <option value="freelancer">Фрилансер</option>
                  <option value="employer">Заказчик</option>
                  <option value="admin">Админ</option>
                </select>
              </div>
              <div><label className="label">Телефон</label><input className="input" value={editForm.phone ?? ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              <div><label className="label">Местоположение</label><input className="input" value={editForm.location ?? ''} onChange={e => setEditForm({ ...editForm, location: e.target.value })} /></div>
              <div><label className="label">Уровень верификации</label>
                <select className="input" value={editForm.verification_level ?? 'none'} onChange={e => setEditForm({ ...editForm, verification_level: e.target.value as Profile['verification_level'] })}>
                  <option value="none">Нет</option>
                  <option value="phone">Телефон</option>
                  <option value="identity">Личность</option>
                  <option value="full">Полная</option>
                </select>
              </div>
            </div>
            <div><label className="label">Био</label><textarea className="input" rows={3} value={editForm.bio ?? ''} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} /></div>
            <div><label className="label">Навыки (через запятую)</label><input className="input" value={(editForm.skills ?? []).join(', ')} onChange={e => setEditForm({ ...editForm, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.is_verified ?? false} onChange={e => setEditForm({ ...editForm, is_verified: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Верифицирован</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setEditing(null)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Сохранить</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend modal */}
      {action?.type === 'suspend' && (
        <Modal open onClose={() => setAction(null)} size="sm" title="Блокировка аккаунта">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-error-50 dark:bg-error-900/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-error-600 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300">Заблокировать {action.user.display_name || action.user.email}? Пользователь получит уведомление.</p>
            </div>
            <div><label className="label">Причина блокировки</label><textarea className="input" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Укажите причину..." autoFocus /></div>
            <div className="flex gap-2">
              <button onClick={() => setAction(null)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={handleSuspend} disabled={!reason.trim()} className="btn-danger flex-1"><Ban className="w-4 h-4" /> Заблокировать</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset password confirm */}
      {action?.type === 'reset' && (
        <Modal open onClose={() => setAction(null)} size="sm" title="Сброс пароля">
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Отправить письмо для сброса пароля на <strong>{action.user.email}</strong>?</p>
            <div className="flex gap-2">
              <button onClick={() => setAction(null)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={() => handleResetPassword(action.user)} className="btn-primary flex-1"><KeyRound className="w-4 h-4" /> Отправить</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
