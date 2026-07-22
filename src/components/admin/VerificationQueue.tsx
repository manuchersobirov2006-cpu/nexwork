import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/admin';
import { Avatar, Badge, Spinner, Modal, EmptyState } from '../../components/ui';
import { formatDate, timeAgo } from '../../lib/format';
import type { IdentityVerification, Profile } from '../../lib/types';
import { Hourglass, UserCheck, FileText, Eye, XCircle, Check, Search } from 'lucide-react';

export function VerificationQueue({ adminId, onAction }: {
  adminId: string;
  onAction?: () => void;
}) {
  const [verifications, setVerifications] = useState<(IdentityVerification & { user?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<(IdentityVerification & { user?: Profile }) | null>(null);
  const [faceUrl, setFaceUrl] = useState<string | null>(null);
  const [passportUrl, setPassportUrl] = useState<string | null>(null);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [acting, setActing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, [statusFilter, dateFrom, dateTo]);

  const load = async () => {
    setLoading(true);
    let query = supabase.from('identity_verifications').select('*, user:user_id(*)').order('created_at', { ascending: false }).limit(100);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (dateFrom) query = query.gte('submitted_at', dateFrom);
    if (dateTo) query = query.lte('submitted_at', dateTo + 'T23:59:59');
    const { data } = await query;
    if (data) setVerifications(data as (IdentityVerification & { user?: Profile })[]);
    setLoading(false);
  };

  const filtered = verifications.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.user?.display_name || v.user?.full_name || '').toLowerCase().includes(q) || (v.user?.email || '').toLowerCase().includes(q);
  });

  const openReview = async (v: IdentityVerification & { user?: Profile }) => {
    setReviewing(v);
    setFaceUrl(null);
    setPassportUrl(null);
    setShowReject(false);
    setRejectReason('');
    setLoadingUrls(true);

    const [faceRes, passportRes] = await Promise.all([
      supabase.storage.from('identity-documents').createSignedUrl(v.face_photo_path, 3600),
      supabase.storage.from('identity-documents').createSignedUrl(v.passport_photo_path, 3600),
    ]);
    if (faceRes.data) setFaceUrl(faceRes.data.signedUrl);
    if (passportRes.data) setPassportUrl(passportRes.data.signedUrl);
    setLoadingUrls(false);
  };

  const handleApprove = async () => {
    if (!reviewing) return;
    setActing(true);
    const before = { status: reviewing.status };
    await supabase.from('identity_verifications').update({
      status: 'approved', reviewed_by: adminId, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', reviewing.id);

    await supabase.from('profiles').update({
      is_verified: true,
      verification_level: reviewing.user?.verification_level === 'full' ? 'full' : 'identity',
    }).eq('id', reviewing.user_id);

    await logAdminAction({
      adminId, actionType: 'approve_identity_verification', targetTable: 'identity_verifications',
      targetId: reviewing.id, beforeValue: before, afterValue: { status: 'approved' },
    });

    await supabase.from('notifications').insert({
      user_id: reviewing.user_id, type: 'verification',
      title: 'Личность подтверждена!', body: 'Ваша заявка на верификацию личности одобрена.', link: 'passport',
    });

    setActing(false); setReviewing(null); load(); onAction?.();
  };

  const handleReject = async () => {
    if (!reviewing || !rejectReason.trim()) return;
    setActing(true);
    const before = { status: reviewing.status };
    await supabase.from('identity_verifications').update({
      status: 'rejected', reviewed_by: adminId, reviewed_at: new Date().toISOString(),
      rejection_reason: rejectReason.trim(), updated_at: new Date().toISOString(),
    }).eq('id', reviewing.id);

    await logAdminAction({
      adminId, actionType: 'reject_identity_verification', targetTable: 'identity_verifications',
      targetId: reviewing.id, beforeValue: before, afterValue: { status: 'rejected', rejection_reason: rejectReason.trim() },
      reason: rejectReason.trim(),
    });

    await supabase.from('notifications').insert({
      user_id: reviewing.user_id, type: 'verification',
      title: 'Верификация отклонена', body: `Причина: ${rejectReason.trim()}`, link: 'passport',
    });

    setActing(false); setReviewing(null); load(); onAction?.();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div className="animate-fade-in">
      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-10" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени или email..." />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="input lg:w-40">
          <option value="pending">Ожидающие</option>
          <option value="approved">Одобренные</option>
          <option value="rejected">Отклонённые</option>
          <option value="all">Все</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input lg:w-36" title="С даты" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input lg:w-36" title="По дату" />
      </div>

      <div className="mb-3 text-sm text-slate-500">
        {statusFilter === 'pending' && `Ожидают рассмотрения: ${filtered.length}`}
        {statusFilter === 'approved' && `Одобрено: ${filtered.length}`}
        {statusFilter === 'rejected' && `Отклонено: ${filtered.length}`}
        {statusFilter === 'all' && `Всего записей: ${filtered.length}`}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UserCheck} title="Нет заявок" description="Заявки будут появляться здесь" />
      ) : (
        <div className="space-y-2">
          {filtered.map(v => (
            <div key={v.id} className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-all">
              <Avatar src={v.user?.avatar_url ?? undefined} name={v.user?.display_name || v.user?.email} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-white">{v.user?.display_name || v.user?.full_name || 'Пользователь'}</div>
                <div className="text-xs text-slate-500">{v.user?.email} · подано {timeAgo(v.submitted_at)}</div>
                {v.rejection_reason && <div className="text-xs text-error-600 mt-0.5">Причина: {v.rejection_reason}</div>}
              </div>
              <Badge color={v.status === 'pending' ? 'amber' : v.status === 'approved' ? 'green' : 'red'}>
                {v.status === 'pending' ? <><Hourglass className="w-3 h-3" /> Ожидает</> : v.status === 'approved' ? <><Check className="w-3 h-3" /> Одобрено</> : <><XCircle className="w-3 h-3" /> Отклонено</>}
              </Badge>
              {v.status === 'pending' && (
                <button onClick={() => openReview(v)} className="btn-primary !px-3 !py-1.5 text-xs"><Eye className="w-4 h-4" /> Рассмотреть</button>
              )}
              {v.status !== 'pending' && (
                <button onClick={() => openReview(v)} className="btn-ghost !px-3 !py-1.5 text-xs"><Eye className="w-4 h-4" /> Просмотр</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewing && (
        <Modal open onClose={() => setReviewing(null)} size="xl" title="Проверка личности">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <Avatar src={reviewing.user?.avatar_url ?? undefined} name={reviewing.user?.display_name || reviewing.user?.email} size={48} />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{reviewing.user?.display_name || reviewing.user?.full_name}</div>
                <div className="text-sm text-slate-500">{reviewing.user?.email}</div>
                <div className="text-xs text-slate-400">Подано: {formatDate(reviewing.submitted_at)}</div>
              </div>
              <div className="ml-auto">
                <Badge color={reviewing.status === 'pending' ? 'amber' : reviewing.status === 'approved' ? 'green' : 'red'}>
                  {reviewing.status === 'pending' ? 'Ожидает' : reviewing.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                </Badge>
              </div>
            </div>

            {loadingUrls ? (
              <div className="flex items-center justify-center py-12"><Spinner className="w-8 h-8 text-brand-600" /></div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2"><UserCheck className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Фото лица</span></div>
                  {faceUrl ? <img src={faceUrl} alt="Face" className="w-full rounded-xl border border-slate-200 dark:border-[#232a3d]" /> : <div className="card p-8 text-center text-sm text-slate-500">Не удалось загрузить</div>}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Фото документа</span></div>
                  {passportUrl ? <img src={passportUrl} alt="Passport" className="w-full rounded-xl border border-slate-200 dark:border-[#232a3d]" /> : <div className="card p-8 text-center text-sm text-slate-500">Не удалось загрузить</div>}
                </div>
              </div>
            )}

            {reviewing.status === 'pending' && (
              showReject ? (
                <div className="space-y-3 animate-slide-down">
                  <label className="label">Причина отклонения</label>
                  <textarea className="input" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Укажите причину..." autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReject(false)} className="btn-secondary flex-1">Отмена</button>
                    <button onClick={handleReject} disabled={acting || !rejectReason.trim()} className="btn-danger flex-1">{acting ? <Spinner className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} Отклонить</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
                  <button onClick={() => setShowReject(true)} disabled={acting} className="btn-danger flex-1"><XCircle className="w-4 h-4" /> Отклонить</button>
                  <button onClick={handleApprove} disabled={acting} className="btn-primary flex-1">{acting ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />} Одобрить</button>
                </div>
              )
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
