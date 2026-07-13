import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { timeAgo, classNames } from '../lib/format';
import { Avatar, Badge } from './ui';
import { t } from '../lib/i18n';
import type { Notification } from '../lib/types';
import {
  Sun, Moon, Bell, Search, LogOut, Menu, X, Settings,
  LayoutGrid, Gavel, MessageSquare, KanbanSquare, ShieldCheck,
  BarChart3, Building2, Crown, Home, ChevronDown, Shield
} from 'lucide-react';

export type ScreenKey =
  | 'dashboard' | 'gigs' | 'board' | 'chat' | 'kanban'
  | 'passport' | 'analytics' | 'companies' | 'premium' | 'settings' | 'admin';

interface NavItem {
  key: ScreenKey;
  label: string;
  icon: React.ElementType;
}

function useNavItems(): NavItem[] {
  return [
    { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutGrid },
    { key: 'gigs', label: t('nav.gigs'), icon: Home },
    { key: 'board', label: t('nav.board'), icon: Gavel },
    { key: 'chat', label: t('nav.chat'), icon: MessageSquare },
    { key: 'kanban', label: t('nav.kanban'), icon: KanbanSquare },
    { key: 'passport', label: t('nav.passport'), icon: ShieldCheck },
    { key: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
    { key: 'companies', label: t('nav.companies'), icon: Building2 },
    { key: 'premium', label: t('nav.premium'), icon: Crown },
    { key: 'settings', label: t('nav.settings'), icon: Settings },
    { key: 'admin', label: t('nav.admin'), icon: Shield },
  ];
}

export function DashboardShell({
  active,
  onNavigate,
  children,
}: {
  active: ScreenKey;
  onNavigate: (screen: ScreenKey) => void;
  children: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme, language } = useTheme();
  void language;
  const NAV_ITEMS = useNavItems();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }, [profile]);

  const loadUnreadChats = useCallback(async () => {
    if (!profile) return;
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_id', profile.id);
    if (count !== null) setUnreadChats(count);
  }, [profile]);

  useEffect(() => {
    loadNotifications();
    loadUnreadChats();
    const interval = setInterval(() => { loadNotifications(); loadUnreadChats(); }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications, loadUnreadChats]);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    loadNotifications();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const totalBadge = unreadCount + (unreadChats > 0 ? 1 : 0);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar - desktop */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300
      `}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                <path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-extrabold text-slate-900 dark:text-white">NexWork</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="btn-ghost lg:hidden !p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
          {NAV_ITEMS.filter(item => item.key !== 'admin' || profile?.is_admin).map(item => {
            const isActive = active === item.key;
            const showDot = (item.key === 'chat' && unreadChats > 0) || (item.key === 'premium' && !profile?.is_premium);
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); setSidebarOpen(false); }}
                className={classNames('nav-link w-full', isActive && 'nav-link-active')}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {showDot && <span className="w-2 h-2 rounded-full bg-error-500" />}
                {item.key === 'premium' && <Crown className="w-3.5 h-3.5 text-warning-500" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button onClick={handleSignOut} className="nav-link w-full text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20">
            <LogOut className="w-5 h-5" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="btn-ghost lg:hidden !p-2">
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('nav.search')}
                className="input-sm input pl-9 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn-ghost !p-2" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen && unreadCount > 0) markAllRead(); }} className="btn-ghost !p-2 relative">
                <Bell className="w-5 h-5" />
                {totalBadge > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-error-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalBadge > 9 ? '9+' : totalBadge}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 card shadow-card-hover z-40 animate-slide-down max-h-96 overflow-y-auto scrollbar-thin">
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">{t('header.notifications')}</span>
                      {unreadCount > 0 && <Badge color="red">{unreadCount} {t('header.new')}</Badge>}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">{t('header.noNotifications')}</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.is_read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}>
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                              {n.body && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>}
                              <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                            </div>
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Profile */}
            <button onClick={() => onNavigate('passport')} className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Avatar src={profile?.avatar_url ?? undefined} name={profile?.display_name || profile?.full_name || profile?.email} size={32} />
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                  {profile?.display_name || profile?.full_name || t('header.user')}
                </div>
                <div className="text-xs text-slate-500">{profile?.role === 'employer' ? t('role.employer') : profile?.role === 'admin' ? t('role.admin') : t('role.freelancer')}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
