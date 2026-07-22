import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/admin';
import { formatDateTime } from '../../lib/format';
import { Avatar, Spinner, EmptyState } from '../../components/ui';
import type { Profile, Notification } from '../../lib/types';
import { Send, Users, Search, Check, Trash2, Bell } from 'lucide-react';

type Target = 'all' | 'freelancer' | 'employer' | 'custom';
type NotifType = 'system' | 'payment' | 'premium' | 'verification';

const TYPE_LABELS: Record<NotifType, string> = {
  system: 'Системное',
  payment: 'Оплата',
  premium: 'Премиум',
  verification: 'Верификация',
};

type NotificationWithUser = Notification & { user: Profile | null };

export function NotificationsManagement({ adminId }: { adminId: string }) {
  const [target, setTarget] = useState<Target>('all');
  const [type, setType] = useState<NotifType>('system');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Profile[]>([]);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (q: string) => {
    setSearch(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${q}%,full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);
    setResults((data as Profile[] | null) ?? []);
    setSearching(false);
  };

  const toggleSelected = (p: Profile) => {
    setSelected(prev => prev.some(u => u.id === p.id) ? prev.filter(u => u.id !== p.id) : [...prev, p]);
  };

  const handleSend = async () => {
    if (!title.trim()) return;
    if (target === 'custom' && selected.length === 0) return;
    setSending(true);
    setError(null);
    setResult(null);

    let userIds: string[] = [];
    if (target === 'custom') {
      userIds = selected.map(u => u.id);
    } else {
      let query = supabase.from('profiles').select('id');
      if (target !== 'all') query = query.eq('role', target);
      const { data, error: fetchError } = await query;
      if (fetchError) { setError(fetchError.message); setSending(false); return; }
      userIds = (data ?? []).map(r => r.id as string);
    }

    if (userIds.length === 0) {
      setError('Нет получателей для выбранного сегмента');
      setSending(false);
      return;
    }

    const rows = userIds.map(uid => ({
      user_id: uid,
      type,
      title: title.trim(),
      body: body.trim() || null,
      link: link.trim() || null,
    }));

    // Batch in chunks to keep individual requests reasonably sized
    const chunkSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error: insertError, count } = await supabase.from('notifications').insert(chunk, { count: 'exact' });
      if (insertError) { setError(insertError.message); setSending(false); return; }
      inserted += count ?? chunk.length;
    }

    await logAdminAction({
      adminId,
      actionType: 'send_notification',
      targetTable: 'notifications',
      targetId: adminId,
      afterValue: { target, type, title: title.trim(), recipients: inserted },
    });

    setResult({ count: inserted });
    setTitle('');
    setBody('');
    setLink('');
    setSelected([]);
    setSearch('');
    setResults([]);
    setSending(false);
    loadRecent();
  };

  const canSend = title.trim().length > 0 && (target !== 'custom' || selected.length > 0) && !sending;

  const [recent, setRecent] = useState<NotificationWithUser[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [recentFilter, setRecentFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    let query = supabase
      .from('notifications')
      .select('*, user:user_id(*)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (recentFilter.trim()) query = query.ilike('title', `%${recentFilter.trim()}%`);
    const { data } = await query;
    setRecent((data as NotificationWithUser[] | null) ?? []);
    setLoadingRecent(false);
  }, [recentFilter]);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const handleDeleteNotification = async (n: NotificationWithUser) => {
    if (!window.confirm('Удалить это уведомление у пользователя?')) return;
    setDeletingId(n.id);
    const { error: delError } = await supabase.from('notifications').delete().eq('id', n.id);
    setDeletingId(null);
    if (!delError) {
      await logAdminAction({ adminId, actionType: 'delete_notification', targetTable: 'notifications', targetId: n.id, beforeValue: { title: n.title, user_id: n.user_id } });
      setRecent(prev => prev.filter(r => r.id !== n.id));
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl space-y-5">
      <p className="text-sm text-slate-500">
        Отправьте уведомление всем пользователям, конкретной роли или выбранным людям. Если у получателя включены push-уведомления, он также получит их на телефон или компьютер.
      </p>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Кому отправить</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              { key: 'all' as const, label: 'Все' },
              { key: 'freelancer' as const, label: 'Фрилансеры' },
              { key: 'employer' as const, label: 'Заказчики' },
              { key: 'custom' as const, label: 'Выбрать людей' },
            ]).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTarget(opt.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${target === opt.key ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-[#161c2b] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1c2338]'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {target === 'custom' && (
          <div>
            <label className="label">Найти пользователей</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input pl-10"
                value={search}
                onChange={e => runSearch(e.target.value)}
                placeholder="Имя или email..."
              />
            </div>
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selected.map(u => (
                  <span key={u.id} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 gap-1.5">
                    {u.display_name || u.full_name || u.email}
                    <button onClick={() => toggleSelected(u)} className="hover:text-brand-900">×</button>
                  </span>
                ))}
              </div>
            )}
            {searching ? (
              <div className="py-3 flex justify-center"><Spinner className="w-4 h-4 text-brand-600" /></div>
            ) : results.length > 0 ? (
              <div className="border border-slate-200 dark:border-[#232a3d] rounded-lg divide-y divide-slate-200 dark:divide-[#232a3d] max-h-56 overflow-y-auto">
                {results.map(u => {
                  const isSelected = selected.some(s => s.id === u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleSelected(u)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-[#161c2b]/50 text-left"
                    >
                      <Avatar src={u.avatar_url ?? undefined} name={u.display_name || u.email} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.display_name || u.full_name || u.email}</div>
                        <div className="text-xs text-slate-500 truncate">{u.email}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}

        <div>
          <label className="label">Тип</label>
          <select className="input" value={type} onChange={e => setType(e.target.value as NotifType)}>
            {(Object.keys(TYPE_LABELS) as NotifType[]).map(k => (
              <option key={k} value={k}>{TYPE_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Заголовок</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: Новая функция на Nexwork" />
        </div>

        <div>
          <label className="label">Текст (необязательно)</label>
          <textarea className="input" rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="Подробности..." />
        </div>

        <div>
          <label className="label">Ссылка при клике (необязательно)</label>
          <input className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="например: gigs" />
          <p className="text-xs text-slate-400 mt-1">Раздел сайта, который откроется при нажатии на уведомление, например "gigs", "board", "orders"</p>
        </div>

        {error && <p className="text-sm text-error-600">{error}</p>}
        {result && <p className="text-sm text-success-600">Отправлено {result.count} {result.count === 1 ? 'пользователю' : 'пользователям'}</p>}

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-[#232a3d]">
          <button onClick={handleSend} disabled={!canSend} className="btn-primary">
            {sending ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {sending ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </div>

      {target !== 'custom' && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users className="w-3.5 h-3.5" />
          {target === 'all' ? 'Уведомление получат все зарегистрированные пользователи' : target === 'freelancer' ? 'Уведомление получат только фрилансеры' : 'Уведомление получат только заказчики'}
        </div>
      )}

      <div className="pt-2">
        <h3 className="font-bold text-slate-900 dark:text-white mb-1">Отправленные уведомления</h3>
        <p className="text-sm text-slate-500 mb-4">Последние уведомления, полученные пользователями. Можно удалить, если отправлено по ошибке.</p>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-10"
            value={recentFilter}
            onChange={e => setRecentFilter(e.target.value)}
            placeholder="Фильтр по заголовку..."
          />
        </div>

        {loadingRecent ? (
          <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-brand-600" /></div>
        ) : recent.length === 0 ? (
          <EmptyState icon={Bell} title="Уведомлений не найдено" description="" />
        ) : (
          <div className="space-y-2">
            {recent.map(n => (
              <div key={n.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                <Avatar src={n.user?.avatar_url ?? undefined} name={n.user?.display_name || n.user?.email} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{n.title}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {n.user?.display_name || n.user?.full_name || n.user?.email || 'Пользователь удалён'} · {formatDateTime(n.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteNotification(n)}
                  disabled={deletingId === n.id}
                  className="btn-ghost !p-1.5 text-error-600"
                  title="Удалить"
                >
                  {deletingId === n.id ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
