import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/admin';
import { formatPrice, formatDateTime } from '../../lib/format';
import { Avatar, Badge, Spinner, EmptyState } from '../ui';
import type { BadgeRequest, Profile } from '../../lib/types';
import { Star, Check, X } from 'lucide-react';

type BadgeRequestWithUser = BadgeRequest & { user: Profile | null };

export function BadgeRequestsManagement({ adminId }: { adminId: string }) {
  const [requests, setRequests] = useState<BadgeRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('badge_requests')
      .select('*, user:user_id(*)')
      .order('created_at', { ascending: false })
      .limit(100);
    setRequests((data as BadgeRequestWithUser[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (req: BadgeRequestWithUser) => {
    setProcessingId(req.id);
    const premiumUntil = new Date(Date.now() + req.months * 30 * 86400000).toISOString();
    const { error: profileError } = await supabase.from('profiles').update({
      is_premium: true, premium_until: premiumUntil,
    }).eq('id', req.user_id);
    if (!profileError) {
      await supabase.from('badge_requests').update({
        status: 'approved', reviewed_by: adminId, reviewed_at: new Date().toISOString(),
      }).eq('id', req.id);
      await supabase.from('notifications').insert({
        user_id: req.user_id, type: 'premium', title: 'Бейдж «Топ специалист» активирован',
        body: `Активно до ${new Date(premiumUntil).toLocaleDateString('ru-RU')}`, link: 'portfolio',
      });
      await logAdminAction({ adminId, actionType: 'approve_badge_request', targetTable: 'badge_requests', targetId: req.id, afterValue: { user_id: req.user_id, months: req.months } });
    }
    setProcessingId(null);
    load();
  };

  const handleReject = async (req: BadgeRequestWithUser) => {
    setProcessingId(req.id);
    await supabase.from('badge_requests').update({
      status: 'rejected', reviewed_by: adminId, reviewed_at: new Date().toISOString(),
    }).eq('id', req.id);
    await logAdminAction({ adminId, actionType: 'reject_badge_request', targetTable: 'badge_requests', targetId: req.id, beforeValue: { user_id: req.user_id } });
    setProcessingId(null);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  return (
    <div className="animate-fade-in space-y-6">
      <p className="text-sm text-slate-500">
        Заявки на платный бейдж «Топ специалист». Подтверждайте после того, как убедитесь, что оплата поступила (Payme/Click вне платформы).
      </p>

      <div>
        <h3 className="font-bold text-slate-900 dark:text-white mb-3">Ожидают подтверждения ({pending.length})</h3>
        {pending.length === 0 ? (
          <EmptyState icon={Star} title="Нет новых заявок" description="" />
        ) : (
          <div className="space-y-2">
            {pending.map(req => (
              <div key={req.id} className="card p-4 flex items-center gap-3">
                <Avatar src={req.user?.avatar_url ?? undefined} name={req.user?.display_name || req.user?.email} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{req.user?.display_name || req.user?.full_name || req.user?.email}</div>
                  <div className="text-xs text-slate-500">{formatPrice(req.amount)} · {req.months} мес · {formatDateTime(req.created_at)}</div>
                </div>
                <button onClick={() => handleApprove(req)} disabled={processingId === req.id} className="btn-primary text-sm">
                  {processingId === req.id ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />} Подтвердить
                </button>
                <button onClick={() => handleReject(req)} disabled={processingId === req.id} className="btn-secondary text-sm text-error-600">
                  <X className="w-4 h-4" /> Отклонить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white mb-3">История</h3>
          <div className="space-y-2">
            {resolved.map(req => (
              <div key={req.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                <Avatar src={req.user?.avatar_url ?? undefined} name={req.user?.display_name || req.user?.email} size={28} />
                <div className="flex-1 min-w-0 text-sm text-slate-700 dark:text-slate-300 truncate">{req.user?.display_name || req.user?.email}</div>
                <span className="text-xs text-slate-500">{formatPrice(req.amount)}</span>
                <Badge color={req.status === 'approved' ? 'green' : 'red'}>{req.status === 'approved' ? 'Подтверждено' : 'Отклонено'}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
