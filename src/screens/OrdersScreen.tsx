import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { formatPrice, formatDateTime, timeAgo, daysUntil } from '../lib/format';
import { acceptOrder, updateOrderTerms, deliverOrder, requestRevision, completeOrder, cancelOrder } from '../lib/orders';
import { Avatar, Badge, EmptyState, Modal, Spinner } from '../components/ui';
import { UserProfileModal } from '../components/UserProfileModal';
import { t } from '../lib/i18n';
import type { Order, Profile } from '../lib/types';
import {
  Package, Check, Send, RotateCcw, X, ExternalLink, Pencil,
  Clock, MessageCircle, ShieldCheck, Star, PartyPopper, AlertCircle,
} from 'lucide-react';

const STATUS_COLOR: Record<Order['status'], 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'purple'> = {
  pending: 'amber',
  active: 'blue',
  delivered: 'purple',
  completed: 'green',
  cancelled: 'slate',
  disputed: 'red',
};

export function OrdersScreen({ onOpenChat }: { onOpenChat?: (userId: string) => void }) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [editingTerms, setEditingTerms] = useState(false);
  const [editPrice, setEditPrice] = useState(0);
  const [editDeadline, setEditDeadline] = useState('');
  const [savingTerms, setSavingTerms] = useState(false);
  const [revisionMode, setRevisionMode] = useState(false);
  const [revisionDays, setRevisionDays] = useState(1);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, gig:gig_id(*), project:project_id(*), buyer:buyer_id(*), seller:seller_id(*)')
      .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });
    if (data) setOrders(data as Order[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  if (!profile) return null;

  const title = (o: Order) => o.gig?.title || o.project?.title || t('orders.untitled');
  const counterparty = (o: Order): Profile | undefined => (o.buyer_id === profile.id ? o.seller : o.buyer) as Profile | undefined;
  const isSeller = (o: Order) => o.seller_id === profile.id;
  const isBuyer = (o: Order) => o.buyer_id === profile.id;

  const statusLabel = (s: Order['status']) => t(`orders.status.${s}`);

  const refreshOne = (updated: Order) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    setActiveOrder(prev => prev && prev.id === updated.id ? updated : prev);
  };

  const handleAccept = async (order: Order) => {
    const updated = await acceptOrder(order, t('orders.notif.accepted.title'), `${t('orders.notif.accepted.body')} "${title(order)}"`);
    if (updated) refreshOne(updated);
  };

  const startEditTerms = (order: Order) => {
    setEditPrice(order.price);
    setEditDeadline(order.delivery_deadline ? order.delivery_deadline.slice(0, 10) : '');
    setEditingTerms(true);
  };

  const saveTerms = async (order: Order) => {
    setSavingTerms(true);
    const deadlineIso = editDeadline ? new Date(editDeadline).toISOString() : null;
    const updated = await updateOrderTerms(order, editPrice, deadlineIso, t('orders.notif.termsChanged.title'), `${t('orders.notif.termsChanged.body')} "${title(order)}"`);
    setSavingTerms(false);
    if (updated) { refreshOne(updated); setEditingTerms(false); }
  };

  const [deliverNote, setDeliverNote] = useState('');
  const [deliverLink, setDeliverLink] = useState('');
  const [delivering, setDelivering] = useState(false);
  const handleDeliver = async () => {
    if (!activeOrder) return;
    setDelivering(true);
    const updated = await deliverOrder(activeOrder, deliverNote, deliverLink, t('orders.notif.delivered.title'), `${t('orders.notif.delivered.body')} "${title(activeOrder)}"`);
    setDelivering(false);
    if (updated) { refreshOne(updated); setDeliverNote(''); setDeliverLink(''); }
  };

  const submitRevision = async (order: Order) => {
    const updated = await requestRevision(order, revisionDays, t('orders.notif.revision.title'), `${t('orders.notif.revision.body')} "${title(order)}" (${revisionDays} ${t('board.days')})`);
    if (updated) { refreshOne(updated); setRevisionMode(false); }
  };

  const handleComplete = async (order: Order) => {
    const updated = await completeOrder(order, t('orders.notif.completed.title'), `${t('orders.notif.completed.body')} "${title(order)}"`);
    if (updated) {
      refreshOne(updated);
      setActiveOrder(null);
      setReviewOrder(updated);
    }
  };

  const handleCancel = async (order: Order) => {
    if (!window.confirm(t('orders.cancelConfirm'))) return;
    const updated = await cancelOrder(order, profile.id, t('orders.notif.cancelled.title'), `${t('orders.notif.cancelled.body')} "${title(order)}"`);
    if (updated) refreshOne(updated);
  };

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const submitReview = async () => {
    if (!reviewOrder) return;
    setSavingReview(true);
    // Reviewee's rating / review_count are recomputed by an on_review_insert
    // DB trigger (the reviewer's session can't write to the reviewee's
    // profile row directly under RLS).
    await supabase.from('reviews').insert({
      order_id: reviewOrder.id,
      gig_id: reviewOrder.gig_id,
      reviewer_id: profile.id,
      reviewee_id: reviewOrder.seller_id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    });
    setSavingReview(false);
    setReviewOrder(null);
    setReviewRating(5);
    setReviewComment('');
    load();
  };

  const openChat = (userId: string) => {
    if (onOpenChat) onOpenChat(userId);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('orders.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('orders.subtitle')}</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={Package} title={t('orders.empty.title')} description={t('orders.empty.description')} />
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const other = counterparty(order);
            const remaining = order.status === 'active' && order.delivery_deadline ? daysUntil(order.delivery_deadline) : null;
            return (
              <button key={order.id} onClick={() => { setActiveOrder(order); setEditingTerms(false); setRevisionMode(false); }} className="w-full card p-4 flex items-center gap-3 text-left hover:shadow-card-hover transition-shadow">
                <Avatar src={other?.avatar_url ?? undefined} name={other?.display_name || other?.email} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{title(order)}</div>
                  <div className="text-xs text-slate-500">
                    {isSeller(order) ? t('orders.forBuyer') : t('orders.fromSeller')} {other?.display_name || other?.full_name} · {timeAgo(order.created_at)}
                    {remaining !== null && (
                      <span className={remaining < 0 ? 'text-error-600 ml-1' : 'ml-1'}>
                        · {remaining < 0 ? t('orders.overdue') : `${t('orders.daysLeft')} ${remaining}`}
                      </span>
                    )}
                  </div>
                </div>
                <Badge color={STATUS_COLOR[order.status]}>{statusLabel(order.status)}</Badge>
                <span className="font-bold text-slate-900 dark:text-white shrink-0">{formatPrice(order.price)}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeOrder && (() => {
        const order = activeOrder;
        const other = counterparty(order);
        const remaining = order.delivery_deadline ? daysUntil(order.delivery_deadline) : null;
        return (
          <Modal open onClose={() => setActiveOrder(null)} size="lg" title={title(order)}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={() => other && setViewingProfileId(other.id)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <Avatar src={other?.avatar_url ?? undefined} name={other?.display_name || other?.email} size={44} />
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 dark:text-white">{other?.display_name || other?.full_name}</div>
                    <div className="text-xs text-slate-500">{isSeller(order) ? t('orders.buyer') : t('orders.seller')}</div>
                  </div>
                </button>
                {other && (
                  <button onClick={() => openChat(other.id)} className="btn-secondary text-sm"><MessageCircle className="w-4 h-4" /> {t('gigs.write')}</button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 mb-0.5">{t('gigs.price')}</div>
                  <div className="font-bold text-brand-600 dark:text-brand-400">{formatPrice(order.price)}</div>
                </div>
                <div className="bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 mb-0.5">{t('companies.status')}</div>
                  <Badge color={STATUS_COLOR[order.status]}>{statusLabel(order.status)}</Badge>
                </div>
                <div className="bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 mb-0.5 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> {t('board.duration')}</div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">{order.delivery_deadline ? formatDateTime(order.delivery_deadline) : '—'}</div>
                </div>
              </div>

              {order.status === 'active' && remaining !== null && (
                <div className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${remaining < 0 ? 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400' : 'bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-300'}`}>
                  <Clock className="w-4 h-4 shrink-0" />
                  {remaining < 0 ? `${t('orders.overdue')} ${Math.abs(remaining)} ${t('board.days')}` : `${t('orders.daysLeft')} ${remaining} ${t('board.days')}`}
                </div>
              )}

              {order.requirements && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">{t('orders.requirements')}</div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl p-3 whitespace-pre-wrap">{order.requirements}</p>
                </div>
              )}

              {(order.status === 'delivered' || order.status === 'completed') && order.delivery_note && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> {t('orders.delivery')}</div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-brand-50 dark:bg-brand-900/10 rounded-xl p-3 whitespace-pre-wrap">{order.delivery_note}</p>
                  {order.delivery_link && (
                    <a href={order.delivery_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mt-2">
                      {order.delivery_link} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Buyer: edit terms while pending (before freelancer confirms) */}
              {isBuyer(order) && order.status === 'pending' && (
                editingTerms ? (
                  <div className="space-y-3 border-t border-slate-200 dark:border-[#232a3d] pt-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{t('orders.editTerms')}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">{t('gigs.price')}</label>
                        <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} className="input" />
                      </div>
                      <div>
                        <label className="label">{t('board.duration')}</label>
                        <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="input" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingTerms(false)} className="btn-secondary text-sm">{t('settings.cancel')}</button>
                      <button onClick={() => saveTerms(order)} disabled={savingTerms} className="btn-primary text-sm">
                        {savingTerms ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />} {t('orders.saveTerms')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-200 dark:border-[#232a3d] pt-4">
                    <div className="px-3 py-2 mb-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {t('orders.awaitingSeller')}
                    </div>
                    <button onClick={() => startEditTerms(order)} className="btn-secondary text-sm"><Pencil className="w-4 h-4" /> {t('orders.editTerms')}</button>
                  </div>
                )
              )}

              {/* Seller: accept pending order (possibly revised terms) */}
              {isSeller(order) && order.status === 'pending' && (
                <button onClick={() => handleAccept(order)} className="btn-primary w-full"><Check className="w-4 h-4" /> {t('orders.action.accept')}</button>
              )}

              {/* Seller: deliver */}
              {isSeller(order) && order.status === 'active' && (
                <div className="space-y-3 border-t border-slate-200 dark:border-[#232a3d] pt-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">{t('orders.action.deliver')}</h4>
                  <textarea value={deliverNote} onChange={e => setDeliverNote(e.target.value)} rows={3} placeholder={t('orders.deliverNote.placeholder')} className="input" />
                  <input type="text" value={deliverLink} onChange={e => setDeliverLink(e.target.value)} placeholder={t('orders.deliverLink.placeholder')} className="input" />
                  <button onClick={handleDeliver} disabled={delivering} className="btn-primary w-full">
                    {delivering ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />} {t('orders.action.deliver')}
                  </button>
                </div>
              )}

              {isSeller(order) && order.status === 'delivered' && (
                <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm rounded-xl">{t('orders.awaitingBuyer')}</div>
              )}

              {/* Buyer: delivered -> accept or revision */}
              {isBuyer(order) && order.status === 'delivered' && (
                revisionMode ? (
                  <div className="space-y-3 border-t border-slate-200 dark:border-[#232a3d] pt-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{t('orders.revisionDays')}</h4>
                    <p className="text-xs text-slate-500">{t('orders.revisionDays.hint')}</p>
                    <input type="number" min={1} value={revisionDays} onChange={e => setRevisionDays(Math.max(1, Number(e.target.value)))} className="input w-32" />
                    <div className="flex gap-2">
                      <button onClick={() => setRevisionMode(false)} className="btn-secondary text-sm">{t('settings.cancel')}</button>
                      <button onClick={() => submitRevision(order)} className="btn-primary text-sm"><RotateCcw className="w-4 h-4" /> {t('orders.action.revision')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 border-t border-slate-200 dark:border-[#232a3d] pt-4">
                    <button onClick={() => setRevisionMode(true)} className="btn-secondary flex-1"><RotateCcw className="w-4 h-4" /> {t('orders.action.revision')}</button>
                    <button onClick={() => handleComplete(order)} className="btn-primary flex-1"><Check className="w-4 h-4" /> {t('orders.action.complete')}</button>
                  </div>
                )
              )}

              {/* Cancel (either party, before delivered) */}
              {(order.status === 'pending' || order.status === 'active') && (
                <button onClick={() => handleCancel(order)} className="w-full text-center text-sm text-error-600 hover:text-error-700 pt-2"><X className="w-3.5 h-3.5 inline" /> {t('orders.action.cancel')}</button>
              )}

              {order.status === 'completed' && (
                <div className="px-4 py-3 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 text-sm rounded-xl flex items-center gap-2">
                  <PartyPopper className="w-4 h-4 shrink-0" /> {t('orders.congrats')}
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {reviewOrder && (
        <Modal open onClose={() => setReviewOrder(null)} size="sm" title={t('orders.review.title')}>
          <div className="p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto">
              <PartyPopper className="w-7 h-7 text-success-600" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">{t('orders.congrats')}</div>
              <p className="text-sm text-slate-500 mt-1">{t('orders.review.subtitle')}</p>
            </div>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setReviewRating(n)}>
                  <Star className={`w-8 h-8 ${n <= reviewRating ? 'fill-warning-500 text-warning-500' : 'text-slate-300 dark:text-slate-600'}`} />
                </button>
              ))}
            </div>
            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} placeholder={t('orders.review.placeholder')} className="input text-left" />
            <div className="flex gap-2">
              <button onClick={() => setReviewOrder(null)} className="btn-secondary flex-1">{t('orders.review.skip')}</button>
              <button onClick={submitReview} disabled={savingReview} className="btn-primary flex-1">
                {savingReview ? <Spinner className="w-4 h-4" /> : <Star className="w-4 h-4" />} {t('orders.review.submit')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {viewingProfileId && (
        <UserProfileModal
          userId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
          onMessage={(id) => { setViewingProfileId(null); openChat(id); }}
        />
      )}
    </div>
  );
}
