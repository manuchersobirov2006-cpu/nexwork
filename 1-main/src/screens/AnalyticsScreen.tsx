import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { formatPrice, formatNumber } from '../lib/format';
import { Badge, EmptyState, Spinner } from '../components/ui';
import type { Order, Gig, Project, Bid } from '../lib/types';
import {
  BarChart3, TrendingUp, DollarSign, ShoppingCart,
  Eye, Star, Activity
} from 'lucide-react';

export function AnalyticsScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);

  useEffect(() => {
    if (!profile) return;
    const isFreelancer = profile.role === 'freelancer';
    Promise.all([
      supabase.from('orders').select('*, gig:gig_id(*)').eq(isFreelancer ? 'seller_id' : 'buyer_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('gigs').select('*').eq('seller_id', profile.id),
      supabase.from('projects').select('*').eq('employer_id', profile.id),
      supabase.from('bids').select('*, project:project_id(*)').eq('freelancer_id', profile.id),
    ]).then(([ordersRes, gigsRes, projectsRes, bidsRes]) => {
      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (gigsRes.data) setGigs(gigsRes.data as Gig[]);
      if (projectsRes.data) setProjects(projectsRes.data as Project[]);
      if (bidsRes.data) setBids(bidsRes.data as Bid[]);
      setLoading(false);
    });
  }, [profile]);

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner className="w-8 h-8 text-brand-600" /></div>;
  if (!profile) return null;

  const completedOrders = orders.filter(o => o.status === 'completed');
  const activeOrders = orders.filter(o => o.status === 'active' || o.status === 'pending');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.price, 0);
  const totalViews = gigs.reduce((sum, g) => sum + g.views, 0) + projects.reduce((sum, p) => sum + p.views, 0);
  const avgRating = gigs.length > 0 ? gigs.reduce((sum, g) => sum + g.rating, 0) / gigs.length : profile.rating;
  const acceptedBids = bids.filter(b => b.status === 'accepted');

  // Monthly revenue data (last 6 months)
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthOrders = completedOrders.filter(o => {
      const d = new Date(o.completed_at || o.created_at);
      return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
    });
    return {
      label: month.toLocaleDateString('ru-RU', { month: 'short' }),
      value: monthOrders.reduce((sum, o) => sum + o.price, 0),
      count: monthOrders.length,
    };
  }).reverse();

  const maxRevenue = Math.max(...monthlyData.map(d => d.value), 1);

  const stats = [
    { label: 'Общий доход', value: formatPrice(totalRevenue), icon: DollarSign, color: 'success', change: '+12%' },
    { label: 'Активных заказов', value: activeOrders.length.toString(), icon: ShoppingCart, color: 'blue', change: `${activeOrders.length} в работе` },
    { label: 'Всего просмотров', value: formatNumber(totalViews), icon: Eye, color: 'accent', change: '+8%' },
    { label: 'Средний рейтинг', value: avgRating.toFixed(1), icon: Star, color: 'amber', change: `${profile.review_count} отзывов` },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Аналитика</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Отслеживайте свою эффективность</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${stat.color}-100 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-400">{stat.change}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Доход по месяцам</h3>
              <p className="text-xs text-slate-500">Последние 6 месяцев</p>
            </div>
            <TrendingUp className="w-5 h-5 text-success-600" />
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {monthlyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{d.value > 0 ? formatPrice(d.value) : ''}</div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg flex items-end" style={{ height: '140px' }}>
                  <div
                    className="w-full bg-gradient-to-t from-brand-600 to-accent-500 rounded-t-lg transition-all duration-500"
                    style={{ height: `${(d.value / maxRevenue) * 100}%`, minHeight: d.value > 0 ? '8px' : '0' }}
                  />
                </div>
                <div className="text-xs text-slate-500">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Order status distribution */}
        <div className="card p-6 animate-slide-up">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Статусы заказов</h3>
          <div className="space-y-4">
            {[
              { label: 'Завершено', count: completedOrders.length, color: 'bg-success-500' },
              { label: 'В работе', count: orders.filter(o => o.status === 'active').length, color: 'bg-brand-500' },
              { label: 'Ожидает', count: orders.filter(o => o.status === 'pending').length, color: 'bg-warning-500' },
              { label: 'Доставлен', count: orders.filter(o => o.status === 'delivered').length, color: 'bg-purple-500' },
              { label: 'Отменён', count: orders.filter(o => o.status === 'cancelled').length, color: 'bg-error-500' },
            ].map(s => {
              const total = orders.length || 1;
              const pct = (s.count / total) * 100;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{s.label}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{s.count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <div className={`h-full ${s.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top gigs */}
        {profile.role === 'freelancer' && (
          <div className="card p-6 animate-slide-up">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Топ услуг по заказам</h3>
            {gigs.length === 0 ? (
              <EmptyState icon={BarChart3} title="Нет данных" description="Создайте услуги для анализа" />
            ) : (
              <div className="space-y-3">
                {gigs.sort((a, b) => b.orders_count - a.orders_count).slice(0, 5).map(gig => (
                  <div key={gig.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{gig.title}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{gig.views}</span>
                        <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{gig.orders_count}</span>
                        {gig.rating > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-warning-500" />{gig.rating}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-brand-600 dark:text-brand-400">{formatPrice(gig.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent orders */}
        <div className="card p-6 animate-slide-up">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Последние заказы</h3>
          {orders.length === 0 ? (
            <EmptyState icon={Activity} title="Нет заказов" description="Заказы появятся здесь" />
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 6).map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {order.gig?.title || 'Заказ'}
                    </div>
                    <div className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge color={order.status === 'completed' ? 'green' : order.status === 'active' ? 'blue' : 'amber'}>
                      {order.status === 'completed' ? 'Завершён' : order.status === 'active' ? 'В работе' : order.status === 'pending' ? 'Ожидает' : order.status}
                    </Badge>
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{formatPrice(order.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bids summary for freelancers */}
      {profile.role === 'freelancer' && bids.length > 0 && (
        <div className="card p-6 mt-6 animate-slide-up">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Мои заявки на тендеры</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{bids.length}</div>
              <div className="text-xs text-slate-500">Всего заявок</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-2xl font-bold text-success-600">{acceptedBids.length}</div>
              <div className="text-xs text-slate-500">Принято</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-2xl font-bold text-warning-600">{bids.filter(b => b.status === 'pending').length}</div>
              <div className="text-xs text-slate-500">Ожидают</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{((acceptedBids.length / bids.length) * 100).toFixed(0)}%</div>
              <div className="text-xs text-slate-500">Конверсия</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
