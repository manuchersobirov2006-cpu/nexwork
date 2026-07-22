import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { formatPrice, timeAgo } from '../lib/format';
import { Avatar, Badge, Spinner, EmptyState } from '../components/ui';
import type { Order } from '../lib/types';
import {
  LayoutDashboard, Users, Package, Gavel, ShoppingCart,
  Shield, UserCheck, FileText, ScrollText, Megaphone, Briefcase, Building2, Send, Star
} from 'lucide-react';
import { DashboardOverview } from '../components/admin/DashboardOverview';
import { UserManagement } from '../components/admin/UserManagement';
import { GigManagement, ProjectManagement, JobManagement, CompanyManagement } from '../components/admin/ContentManagement';
import { VerificationQueue } from '../components/admin/VerificationQueue';
import { PlatformContentEditor } from '../components/admin/PlatformContentEditor';
import { AuditLogView } from '../components/admin/AuditLogView';
import { AdManagement } from '../components/admin/AdManagement';
import { NotificationsManagement } from '../components/admin/NotificationsManagement';
import { BadgeRequestsManagement } from '../components/admin/BadgeRequestsManagement';

type Tab = 'overview' | 'users' | 'gigs' | 'projects' | 'jobs' | 'companies' | 'orders' | 'verifications' | 'content' | 'audit' | 'ads' | 'notifications' | 'badges';

export function AdminScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [pendingVerifCount, setPendingVerifCount] = useState(0);
  const [pendingBadgeCount, setPendingBadgeCount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const loadPendingCount = useCallback(async () => {
    const { count } = await supabase.from('identity_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    if (count !== null) setPendingVerifCount(count);
  }, []);

  const loadPendingBadgeCount = useCallback(async () => {
    const { count } = await supabase.from('badge_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    if (count !== null) setPendingBadgeCount(count);
  }, []);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    const { data } = await supabase.from('orders').select('*, buyer:buyer_id(*), seller:seller_id(*), gig:gig_id(*)').order('created_at', { ascending: false }).limit(50);
    if (data) setOrders(data as Order[]);
    setLoadingOrders(false);
  }, []);

  useEffect(() => { loadPendingCount(); loadOrders(); loadPendingBadgeCount(); }, [loadPendingCount, loadOrders, loadPendingBadgeCount]);

  // Access control — non-admins see this
  if (!profile?.is_admin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState icon={Shield} title="Доступ ограничен" description="Эта страница доступна только администраторам платформы Nexwork." />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'overview', label: 'Обзор', icon: LayoutDashboard },
    { key: 'verifications', label: 'Верификация', icon: UserCheck, badge: pendingVerifCount },
    { key: 'users', label: 'Пользователи', icon: Users },
    { key: 'gigs', label: 'Услуги', icon: Package },
    { key: 'projects', label: 'Проекты', icon: Gavel },
    { key: 'jobs', label: 'Вакансии', icon: Briefcase },
    { key: 'companies', label: 'Компании', icon: Building2 },
    { key: 'orders', label: 'Заказы', icon: ShoppingCart },
    { key: 'content', label: 'Контент', icon: FileText },
    { key: 'ads', label: 'Реклама', icon: Megaphone },
    { key: 'badges', label: 'Бейджи', icon: Star, badge: pendingBadgeCount },
    { key: 'notifications', label: 'Уведомления', icon: Send },
    { key: 'audit', label: 'Журнал', icon: ScrollText },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-error-500 to-error-700 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Админ-панель</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">Управление платформой Nexwork</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 bg-slate-100 dark:bg-[#161c2b] rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${tab === t.key ? 'bg-white dark:bg-[#10141f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge ? <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-error-500 text-white rounded-full">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'overview' && <DashboardOverview onNavigate={(t) => setTab(t as Tab)} />}
      {tab === 'verifications' && <VerificationQueue adminId={profile.id} onAction={loadPendingCount} />}
      {tab === 'users' && <UserManagement adminId={profile.id} />}
      {tab === 'gigs' && <GigManagement adminId={profile.id} />}
      {tab === 'projects' && <ProjectManagement adminId={profile.id} />}
      {tab === 'jobs' && <JobManagement adminId={profile.id} />}
      {tab === 'companies' && <CompanyManagement adminId={profile.id} />}
      {tab === 'content' && <PlatformContentEditor adminId={profile.id} />}
      {tab === 'ads' && <AdManagement adminId={profile.id} />}
      {tab === 'notifications' && <NotificationsManagement adminId={profile.id} />}
      {tab === 'badges' && <BadgeRequestsManagement adminId={profile.id} />}
      {tab === 'audit' && <AuditLogView />}
      {tab === 'orders' && (
        <div className="animate-fade-in space-y-2">
          {loadingOrders ? (
            <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>
          ) : orders.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Нет заказов" />
          ) : (
            orders.map(o => (
              <div key={o.id} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5 text-success-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{o.gig?.title || 'Заказ'}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    {(o as any).buyer && <Avatar src={(o as any).buyer.avatar_url ?? undefined} name={(o as any).buyer.display_name || (o as any).buyer.email} size={16} />}
                    {(o as any).buyer?.display_name} → {(o as any).seller?.display_name} · {timeAgo(o.created_at)}
                  </div>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">{formatPrice(o.price)}</span>
                <Badge color={o.status === 'completed' ? 'green' : o.status === 'active' ? 'blue' : 'amber'}>{o.status}</Badge>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
