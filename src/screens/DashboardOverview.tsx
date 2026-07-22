import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { formatPrice, timeAgo } from '../lib/format';
import { Avatar, Badge, Stars, Spinner, EmptyState } from '../components/ui';
import { AdBanner } from '../components/AdBanner';
import { UserProfileModal } from '../components/UserProfileModal';
import { t } from '../lib/i18n';
import { useTranslatedNotifications } from '../lib/useTranslatedNotifications';
import type { ScreenKey } from '../components/DashboardShell';
import type { Order, Gig, Project, Notification } from '../lib/types';
import {
  DollarSign, ShoppingCart, Eye, TrendingUp, Plus,
  Package, Gavel, MessageSquare,
  CheckCircle, Clock, AlertCircle, Sparkles
} from 'lucide-react';

export function DashboardOverview({ onNavigate }: { onNavigate: (s: ScreenKey) => void }) {
  const { profile } = useAuth();
  const { language } = useTheme();
  void language;
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const getTranslatedNotification = useTranslatedNotifications(notifications);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      // A user can switch between the freelancer/employer role at any time,
      // but past orders keep whichever side they were actually on — filter
      // by that (not the current role toggle) or completed deals silently
      // disappear the moment the role is switched.
      supabase.from('orders').select('*, gig:gig_id(*), buyer:buyer_id(*), seller:seller_id(*)').or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`).order('created_at', { ascending: false }).limit(5),
      supabase.from('gigs').select('*').eq('seller_id', profile.id).eq('status', 'active').limit(5),
      supabase.from('projects').select('*').eq('employer_id', profile.id).limit(5),
      supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
    ]).then(([o, g, p, n]) => {
      if (o.data) setOrders(o.data as Order[]);
      if (g.data) setGigs(g.data as Gig[]);
      if (p.data) setProjects(p.data as Project[]);
      if (n.data) setNotifications(n.data as Notification[]);
      setLoading(false);
    });
  }, [profile]);

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner className="w-8 h-8 text-brand-600" /></div>;
  if (!profile) return null;

  const completedRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.price, 0);
  const activeOrders = orders.filter(o => o.status === 'active' || o.status === 'pending');
  const totalViews = gigs.reduce((s, g) => s + g.views, 0);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('dash.morning');
    if (h < 18) return t('dash.day');
    return t('dash.evening');
  })();

  const stats = [
    { label: t('dash.stat.earned'), value: formatPrice(completedRevenue), icon: DollarSign, color: 'success' },
    { label: t('dash.stat.activeOrders'), value: activeOrders.length.toString(), icon: ShoppingCart, color: 'blue' },
    { label: t('dash.stat.views'), value: totalViews.toString(), icon: Eye, color: 'accent' },
    { label: t('dash.stat.gigs'), value: gigs.length.toString(), icon: Package, color: 'amber' },
  ];

  const quickActions = profile.role === 'freelancer'
    ? [
        { label: t('dash.action.createGig'), icon: Plus, screen: 'portfolio' as ScreenKey, color: 'bg-brand-600' },
        { label: t('dash.action.findTenders'), icon: Gavel, screen: 'board' as ScreenKey, color: 'bg-accent-600' },
        { label: t('dash.action.messages'), icon: MessageSquare, screen: 'chat' as ScreenKey, color: 'bg-success-600' },
        { label: t('dash.action.analytics'), icon: TrendingUp, screen: 'analytics' as ScreenKey, color: 'bg-purple-600' },
      ]
    : [
        { label: t('dash.action.postProject'), icon: Plus, screen: 'board' as ScreenKey, color: 'bg-brand-600' },
        { label: t('dash.action.findGigs'), icon: Package, screen: 'gigs' as ScreenKey, color: 'bg-accent-600' },
        { label: t('dash.action.messages'), icon: MessageSquare, screen: 'chat' as ScreenKey, color: 'bg-success-600' },
        { label: t('dash.action.companies'), icon: Package, screen: 'companies' as ScreenKey, color: 'bg-purple-600' },
      ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdBanner />

      {/* Welcome */}
      <div className="mb-4 sm:mb-6 animate-slide-up">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
          {greeting}, {profile.display_name || profile.full_name}!
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          {profile.role === 'employer' ? t('dash.subtitle.employer') : t('dash.subtitle.freelancer')}
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="card p-3.5 sm:p-5 animate-slide-up min-w-0 w-[calc(50%-6px)] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3 bg-${stat.color}-100 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
              <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
            <div className="text-xs sm:text-sm text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Quick actions */}
        <div className="card p-4 sm:p-5 animate-slide-up">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-3 sm:mb-4">{t('dash.quickActions')}</h3>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => onNavigate(action.screen)}
                className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#161c2b]/50 hover:bg-slate-100 dark:hover:bg-[#161c2b] transition-colors group min-w-0 w-[calc(50%-4px)] sm:w-[calc(50%-6px)]"
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${action.color} text-white flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center break-words">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="card p-4 sm:p-5 animate-slide-up lg:col-span-2">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{t('dash.recentOrders')}</h3>
            {orders.length > 0 && <button onClick={() => onNavigate('orders')} className="text-sm text-brand-600 hover:text-brand-700 font-medium">{t('dash.all')}</button>}
          </div>
          {orders.length === 0 ? (
            <EmptyState icon={ShoppingCart} title={t('dash.noOrders')} description={profile.role === 'freelancer' ? t('dash.noOrders.freelancer') : t('dash.noOrders.employer')} action={<button onClick={() => onNavigate('gigs')} className="btn-primary mt-2 text-sm">{t('dash.toCatalog')}</button>} />
          ) : (
            <div className="space-y-2">
              {orders.map(order => {
                const otherParty = order.buyer_id === profile.id ? order.seller : order.buyer;
                const otherProfile = otherParty as any;
                return (
                  <div key={order.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                    <button onClick={() => otherProfile?.id && setViewingProfileId(otherProfile.id)} className="shrink-0 hover:opacity-80 transition-opacity">
                      <Avatar src={otherProfile?.avatar_url ?? undefined} name={otherProfile?.display_name || otherProfile?.email} size={34} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{order.gig?.title || t('dash.order')}</div>
                      <button onClick={() => otherProfile?.id && setViewingProfileId(otherProfile.id)} className="block w-full text-left text-xs text-slate-500 truncate hover:text-brand-600 hover:underline">
                        {otherProfile?.display_name || otherProfile?.full_name} · {timeAgo(order.created_at)}
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 shrink-0">
                      {order.status === 'completed' ? <Badge color="green"><CheckCircle className="w-3 h-3" /> {t('dash.status.completed')}</Badge>
                        : order.status === 'active' ? <Badge color="blue"><Clock className="w-3 h-3" /> {t('dash.status.active')}</Badge>
                        : order.status === 'pending' ? <Badge color="amber"><Clock className="w-3 h-3" /> {t('dash.status.pending')}</Badge>
                        : <Badge color="red"><AlertCircle className="w-3 h-3" /> {order.status}</Badge>}
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">{formatPrice(order.price)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent notifications + Recommended gigs */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
        <div className="card p-4 sm:p-5 animate-slide-up">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-3 sm:mb-4">{t('dash.notifications')}</h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">{t('dash.noNotifications')}</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => {
                const tn = getTranslatedNotification(n);
                return (
                  <div key={n.id} className={`flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl ${!n.is_read ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'bg-slate-50 dark:bg-[#161c2b]/50'}`}>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{tn.title}</div>
                      {tn.body && <div className="text-xs text-slate-500 mt-0.5">{tn.body}</div>}
                      <div className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {profile.role === 'freelancer' && gigs.length > 0 && (
          <div className="card p-4 sm:p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{t('dash.myGigs')}</h3>
              <button onClick={() => onNavigate('gigs')} className="text-sm text-brand-600 font-medium">{t('dash.all')}</button>
            </div>
            <div className="space-y-2">
              {gigs.map(gig => (
                <div key={gig.id} className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{gig.title}</div>
                    <div className="text-xs text-slate-500">{gig.orders_count} {t('dash.ordersCount')} · {gig.views} {t('dash.viewsCount')}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-brand-600 dark:text-brand-400">{formatPrice(gig.price)}</div>
                    {gig.rating > 0 && <div className="flex items-center gap-0.5 justify-end"><Stars rating={gig.rating} size={10} /></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.role === 'employer' && projects.length > 0 && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">{t('dash.myProjects')}</h3>
              <button onClick={() => onNavigate('board')} className="text-sm text-brand-600 font-medium">{t('dash.all')}</button>
            </div>
            <div className="space-y-2">
              {projects.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center shrink-0">
                    <Gavel className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.title}</div>
                    <div className="text-xs text-slate-500">{p.bids_count} {t('dash.bidsCount')} · {timeAgo(p.created_at)}</div>
                  </div>
                  <Badge color={p.status === 'open' ? 'green' : p.status === 'in_progress' ? 'blue' : 'slate'}>
                    {p.status === 'open' ? t('dash.status.open') : p.status === 'in_progress' ? t('dash.status.in_progress') : t('dash.status.done')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {viewingProfileId && <UserProfileModal userId={viewingProfileId} onClose={() => setViewingProfileId(null)} />}
    </div>
  );
}
