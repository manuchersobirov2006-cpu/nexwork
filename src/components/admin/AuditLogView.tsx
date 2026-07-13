import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Spinner, EmptyState, Badge, Avatar } from '../../components/ui';
import { formatDate } from '../../lib/format';
import type { AdminAuditLog, Profile } from '../../lib/types';
import { Search, Shield, ChevronDown, ChevronRight } from 'lucide-react';

export function AuditLogView() {
  const [logs, setLogs] = useState<(AdminAuditLog & { admin?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_audit_log')
      .select('*, admin:admin_id(*)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setLogs(data as (AdminAuditLog & { admin?: Profile })[]);
    setLoading(false);
  };

  const actionTypes = [...new Set(logs.map(l => l.action_type))];
  const tableTypes = [...new Set(logs.map(l => l.target_table))];

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.action_type.toLowerCase().includes(search.toLowerCase()) ||
      l.target_id.toLowerCase().includes(search.toLowerCase()) ||
      (l.reason || '').toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'all' || l.action_type === actionFilter;
    const matchTable = tableFilter === 'all' || l.target_table === tableFilter;
    return matchSearch && matchAction && matchTable;
  });

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-10" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по действию, ID, причине..." />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="input sm:w-44">
          <option value="all">Все действия</option>
          {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={tableFilter} onChange={e => setTableFilter(e.target.value)} className="input sm:w-40">
          <option value="all">Все таблицы</option>
          {tableTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50">
          <Shield className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Журнал действий (только чтение)</span>
          <Badge color="slate" className="ml-auto">{filtered.length} записей</Badge>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {filtered.map(log => (
            <div key={log.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <div className="flex items-center gap-3">
                {log.admin && <Avatar src={log.admin.avatar_url ?? undefined} name={log.admin.display_name || log.admin.email} size={28} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color="blue">{log.action_type}</Badge>
                    <span className="text-xs text-slate-500">{log.target_table} · {log.target_id.slice(0, 8)}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {log.admin?.display_name || log.admin?.email} · {formatDate(log.created_at)}
                    {log.reason && <span className="text-error-600 ml-2">· {log.reason}</span>}
                  </div>
                </div>
                {(log.before_value || log.after_value) && (
                  <button onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="btn-ghost !p-1">
                    {expanded === log.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {expanded === log.id && (log.before_value || log.after_value) && (
                <div className="grid sm:grid-cols-2 gap-3 mt-3 pl-10 animate-slide-down">
                  {log.before_value && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-slate-500 mb-1">До</div>
                      <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto max-h-40">{JSON.stringify(log.before_value, null, 2)}</pre>
                    </div>
                  )}
                  {log.after_value && (
                    <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg p-3">
                      <div className="text-xs font-semibold text-brand-600 mb-1">После</div>
                      <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto max-h-40">{JSON.stringify(log.after_value, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {filtered.length === 0 && <EmptyState icon={Shield} title="Журал пуст" description="Действия администраторов будут отображаться здесь" />}
    </div>
  );
}
