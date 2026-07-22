import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatPrice, formatDateTime, daysUntil } from '../lib/format';
import { acceptOrder, deliverOrder, requestRevision, completeOrder } from '../lib/orders';
import { Badge, Modal, Spinner } from './ui';
import { t } from '../lib/i18n';
import type { Order } from '../lib/types';
import { Check, Send, RotateCcw, Clock, ChevronDown, ChevronUp, PartyPopper, Star } from 'lucide-react';

const STATUS_COLOR: Record<Order['status'], 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'purple'> = {
  pending: 'amber',
  active: 'blue',
  delivered: 'purple',
  completed: 'green',
  cancelled: 'slate',
  disputed: 'red',
};

export function OrderStatusBar({ userId, otherUserId }: { userId: string; otherUserId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [deliverNote, setDeliverNote] = useState('');
  const [deliverLink, setDeliverLink] = useState('');
  const [delivering, setDelivering] = useState(false);
  const [revisionMode, setRevisionMode] = useState(false);
  const [revisionDays, setRevisionDays] = useState(1);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, gig:gig_id(*), project:project_id(*), buyer:buyer_id(*), seller:seller_id(*)')
      .or(`and(buyer_id.eq.${userId},seller_id.eq.${otherUserId}),and(buyer_id.eq.${otherUserId},seller_id.eq.${userId})`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setOrder(data as Order | null);
    setLoading(false);
  }, [userId, otherUserId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !order) return null;

  const title = order.gig?.title || order.project?.title || t('orders.untitled');
  const isSeller = order.seller_id === userId;
  const isBuyer = order.buyer_id === userId;
  const remaining = order.delivery_deadline ? daysUntil(order.delivery_deadline) : null;

  const handleAccept = async () => {
    const updated = await acceptOrder(order, t('orders.notif.accepted.title'), `${t('orders.notif.accepted.body')} "${title}"`);
    if (updated) setOrder(updated);
  };

  const handleDeliver = async () => {
    setDelivering(true);
    const updated = await deliverOrder(order, deliverNote, deliverLink, t('orders.notif.delivered.title'), `${t('orders.notif.delivered.body')} "${title}"`);
    setDelivering(false);
    if (updated) { setOrder(updated); setDeliverNote(''); setDeliverLink(''); setExpanded(false); }
  };

  const submitRevision = async () => {
    const updated = await requestRevision(order, revisionDays, t('orders.notif.revision.title'), `${t('orders.notif.revision.body')} "${title}" (${revisionDays} ${t('board.days')})`);
    if (updated) { setOrder(updated); setRevisionMode(false); setExpanded(false); }
  };

  const handleComplete = async () => {
    const updated = await completeOrder(order, t('orders.notif.completed.title'), `${t('orders.notif.completed.body')} "${title}"`);
    if (updated) { setOrder(updated); setExpanded(false); setShowReview(true); }
  };

  const submitReview = async () => {
    setSavingReview(true);
    // Reviewee's rating / review_count are recomputed by an on_review_insert
    // DB trigger (the reviewer's session can't write to the reviewee's
    // profile row directly under RLS).
    await supabase.from('reviews').insert({
      order_id: order.id,
      gig_id: order.gig_id,
      reviewer_id: userId,
      reviewee_id: order.seller_id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    });
    setSavingReview(false);
    setShowReview(false);
    setReviewRating(5);
    setReviewComment('');
  };

  return (
    <div className="border-b border-slate-200 dark:border-[#232a3d] bg-slate-50 dark:bg-[#10141f]/50 shrink-0">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left">
        <Badge color={STATUS_COLOR[order.status]}>{t(`orders.status.${order.status}`)}</Badge>
        <span className="text-sm font-medium text-slate-900 dark:text-white truncate flex-1">{title}</span>
        {order.status === 'active' && remaining !== null && (
          <span className={`text-xs flex items-center gap-1 shrink-0 ${remaining < 0 ? 'text-error-600' : 'text-slate-500'}`}>
            <Clock className="w-3 h-3" /> {remaining < 0 ? `${t('orders.overdue')} ${Math.abs(remaining)} ${t('board.days')}` : `${remaining} ${t('board.days')}`}
          </span>
        )}
        <span className="font-bold text-slate-900 dark:text-white text-sm shrink-0">{formatPrice(order.price)}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3 animate-slide-down">
          <div className="text-xs text-slate-500">
            {t('board.duration')}: {order.delivery_deadline ? formatDateTime(order.delivery_deadline) : '—'}
          </div>

          {order.status === 'completed' && (
            <div className="text-sm text-success-600 font-medium">{t('orders.congrats')}</div>
          )}

          {isSeller && order.status === 'pending' && (
            <button onClick={handleAccept} className="btn-primary text-sm w-full"><Check className="w-4 h-4" /> {t('orders.action.accept')}</button>
          )}

          {isBuyer && order.status === 'pending' && (
            <div className="text-xs text-amber-600">{t('orders.awaitingSeller')}</div>
          )}

          {isSeller && order.status === 'active' && (
            <div className="space-y-2">
              <textarea value={deliverNote} onChange={e => setDeliverNote(e.target.value)} rows={2} placeholder={t('orders.deliverNote.placeholder')} className="input text-sm" />
              <input type="text" value={deliverLink} onChange={e => setDeliverLink(e.target.value)} placeholder={t('orders.deliverLink.placeholder')} className="input text-sm" />
              <button onClick={handleDeliver} disabled={delivering} className="btn-primary text-sm w-full">
                {delivering ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />} {t('orders.action.deliver')}
              </button>
            </div>
          )}

          {isSeller && order.status === 'delivered' && (
            <div className="text-xs text-purple-600">{t('orders.awaitingBuyer')}</div>
          )}

          {isBuyer && order.status === 'delivered' && (
            revisionMode ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">{t('orders.revisionDays.hint')}</div>
                <input type="number" min={1} value={revisionDays} onChange={e => setRevisionDays(Math.max(1, Number(e.target.value)))} className="input text-sm w-24" />
                <div className="flex gap-2">
                  <button onClick={() => setRevisionMode(false)} className="btn-secondary text-sm flex-1">{t('settings.cancel')}</button>
                  <button onClick={submitRevision} className="btn-primary text-sm flex-1"><RotateCcw className="w-4 h-4" /> {t('orders.action.revision')}</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setRevisionMode(true)} className="btn-secondary text-sm flex-1"><RotateCcw className="w-4 h-4" /> {t('orders.action.revision')}</button>
                <button onClick={handleComplete} className="btn-primary text-sm flex-1"><Check className="w-4 h-4" /> {t('orders.action.complete')}</button>
              </div>
            )
          )}
        </div>
      )}

      {showReview && (
        <Modal open onClose={() => setShowReview(false)} size="sm" title={t('orders.review.title')}>
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
              <button onClick={() => setShowReview(false)} className="btn-secondary flex-1">{t('orders.review.skip')}</button>
              <button onClick={submitReview} disabled={savingReview} className="btn-primary flex-1">
                {savingReview ? <Spinner className="w-4 h-4" /> : <Star className="w-4 h-4" />} {t('orders.review.submit')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
