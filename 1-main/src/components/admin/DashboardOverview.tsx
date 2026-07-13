import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/ui';
import { formatPrice } from '../../lib/format';
import { Users, Package, Gavel, ShoppingCart, DollarSign, UserCheck, TrendingUp, Clock } from 'lucide-react';

type OrderRow = { id: string; price: number; status: string; created_at: string; gig?: { title: string }[] };

type OverviewStats = {
  totalUsers: number;
  totalGigs: number;
  activeGigs: number;
  totalProjects: number;
  totalOrders: number;
  completedOrders: number;
  pendingVerifications: number;
  totalRevenue: number;
  platformFee: number;
  suspendedUsers: number;
};

export function DashboardOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<{ id: string; display_name: string | null; full_name: string | null; email: string; role: string; created_at: string }[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [usersRes, gigsRes, projectsRes, ordersRes, verifRes, suspendedRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('gigs').select('id, status', { count: 'exact' }),
      supabase.from('projects').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id, price, status, created_at, gig:gig_id(title)'),
      supabase.from('identity_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_suspended', true),
    ]);

    const recentUsersData = await supabase.from('profiles').select('id, display_name, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(6);

    const orders = (ordersRes.data || []) as OrderRow[];
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((s, o) => s + o.price, 0);
    const activeGigs = ((gigsRes.data || []) as { id: string; status: string }[]).filter(g => g.status === 'active').length;

    setStats({
      totalUsers: usersRes.count || 0,
      totalGigs: gigsRes.count || 0,
      activeGigs,
      totalProjects: projectsRes.count || 0,
      totalOrders,
      completedOrders: completedOrders.length,
      pendingVerifications: verifRes.count || 0,
      totalRevenue,
      platformFee: totalRevenue * 0.1,
      suspendedUsers: suspendedRes.count || 0,
    });

    setRecentUsers(recentUsersData.data || []);
    setRecentOrders(orders.slice(0, 6));

    setLoading(false);
  };

  if (loading || !stats) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  const cards = [
    { label: 'Всего пользователей', value: stats.totalUsers, icon: Users, color: 'blue', tab: 'users' },
    { label: 'Активных услуг', value: stats.activeGigs, icon: Package, color: 'cyan', tab: 'gigs' },
    { label: 'Проектов', value: stats.totalProjects, icon: Gavel, color: 'purple', tab: 'projects' },
    { label: 'Заказов', value: stats.totalOrders, icon: ShoppingCart, color: 'green', tab: 'orders' },
    { label: 'Заявок на верификацию', value: stats.pendingVerifications, icon: UserCheck, color: 'red', tab: 'verifications' },
    { label: 'Заблокированных', value: stats.suspendedUsers, icon: Clock, color: 'amber', tab: 'users' },
    { label: 'Доход платформы', value: formatPrice(stats.platformFee), icon: DollarSign, color: 'amber', tab: 'overview' },
    { label: 'Завершённых заказов', value: stats.completedOrders, icon: TrendingUp, color: 'green', tab: 'orders' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => onNavigate(card.tab)}
            className="card p-5 text-left hover:shadow-card-hover hover:-translate-y-0.5 transition-all animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-${card.color}-100 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{card.label}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Новые пользователи</h3>
            <button onClick={() => onNavigate('users')} className="text-xs text-brand-600 hover:text-brand-700">Все →</button>
          </div>
          <div className="space-y-2">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'employer' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'bg-brand-100 text-brand-600 dark:bg-brand-900/30'}`}>
                  {(u.display_name || u.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.display_name || u.full_name}</div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
                </div>
                <span className="text-xs text-slate-400">{u.role === 'employer' ? 'Заказчик' : u.role === 'admin' ? 'Админ' : 'Фрилансер'}</span>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Нет пользователей</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Последние заказы</h3>
            <button onClick={() => onNavigate('orders')} className="text-xs text-brand-600 hover:text-brand-700">Все →</button>
          </div>
          <div className="space-y-2">
            {recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{o.gig?.[0]?.title || 'Заказ'}</div>
                  <div className="text-xs text-slate-500">{o.status}</div>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">{formatPrice(o.price)}</span>
              </div>
            ))}
            {recentOrders.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Нет заказов</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
