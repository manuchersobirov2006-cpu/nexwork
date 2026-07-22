import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { timeAgo, classNames } from '../lib/format';
import { Avatar } from './ui';
import { t } from '../lib/i18n';
import { useTranslatedNotifications } from '../lib/useTranslatedNotifications';
import { consumeNotifPromptPending } from '../lib/pushNotifications';
import { EnableNotificationsModal } from './EnableNotificationsModal';
import type { Notification } from '../lib/types';
import {
  Sun, Moon, Bell, Search, LogOut, Menu, X, Settings,
  LayoutGrid, Gavel, MessageSquare, ShieldCheck,
  BarChart3, Building2, Users, ChevronDown, Shield, Briefcase, Package, LifeBuoy, Tag
} from 'lucide-react';

export type ScreenKey =
  | 'dashboard' | 'gigs' | 'services' | 'board' | 'chat' | 'orders'
  | 'passport' | 'portfolio' | 'analytics' | 'companies' | 'settings' | 'admin' | 'support';

interface NavItem {
  key: ScreenKey;
  label: string;
  icon: React.ElementType;
}

function useNavItems(): NavItem[] {
  return [
    { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutGrid },
    { key: 'gigs', label: t('nav.gigs'), icon: Users },
    { key: 'services', label: t('nav.services'), icon: Tag },
    { key: 'board', label: t('nav.board'), icon: Gavel },
    { key: 'orders', label: t('nav.orders'), icon: Package },
    { key: 'companies', label: t('nav.companies'), icon: Building2 },
    { key: 'passport', label: t('nav.passport'), icon: ShieldCheck },
    { key: 'portfolio', label: t('nav.portfolio'), icon: Briefcase },
    { key: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
    { key: 'chat', label: t('nav.chat'), icon: MessageSquare },
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
  const { profile, signOut, updateProfile } = useAuth();
  const [switchingRole, setSwitchingRole] = useState(false);
  const { theme, toggleTheme, language } = useTheme();
  void language;
  const NAV_ITEMS = useNavItems();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const getTranslatedNotification = useTranslatedNotifications(notifications);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    if (profile && consumeNotifPromptPending(profile.id)) setShowNotifPrompt(true);
  }, [profile]);

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
    const onMessagesRead = () => loadUnreadChats();
    window.addEventListener('messages-read', onMessagesRead);
    return () => { clearInterval(interval); window.removeEventListener('messages-read', onMessagesRead); };
  }, [loadNotifications, loadUnreadChats]);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    loadNotifications();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSwitchRole = async (role: 'freelancer' | 'employer') => {
    if (!profile || role === profile.role || switchingRole) return;
    setSwitchingRole(true);
    await updateProfile({ role });
    setSwitchingRole(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-transparent overflow-hidden">
      {/* Sidebar - desktop */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0c101c] border-r border-slate-200 dark:border-[#232a3d] flex flex-col transition-transform duration-300
      `}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#232a3d]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/logo.svg" alt="Nexwork" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-white">NexWork</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="btn-ghost lg:hidden !p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {profile && (profile.role === 'freelancer' || profile.role === 'employer') && (
          <div className="p-3 pb-0">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-[#161c2b] rounded-xl">
              <button
                type="button"
                disabled={switchingRole}
                onClick={() => handleSwitchRole('freelancer')}
                className={classNames(
                  'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  profile.role === 'freelancer' ? 'bg-white dark:bg-[#0c101c] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                )}
              >
                <Briefcase className="w-3.5 h-3.5" /> {t('role.freelancer')}
              </button>
              <button
                type="button"
                disabled={switchingRole}
                onClick={() => handleSwitchRole('employer')}
                className={classNames(
                  'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  profile.role === 'employer' ? 'bg-white dark:bg-[#0c101c] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                )}
              >
                <Building2 className="w-3.5 h-3.5" /> {t('role.employer')}
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
          {NAV_ITEMS.filter(item => item.key !== 'admin' || profile?.is_admin)
            .filter(item => item.key !== 'portfolio' || profile?.role !== 'employer')
            .map(item => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); setSidebarOpen(false); }}
                className={classNames('nav-link w-full', isActive && 'nav-link-active')}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.key === 'chat' && unreadChats > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadChats > 99 ? '99+' : unreadChats}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-[#232a3d] space-y-1">
          <button
            onClick={() => { onNavigate('support'); setSidebarOpen(false); }}
            className={classNames('nav-link w-full', active === 'support' && 'nav-link-active')}
          >
            <LifeBuoy className="w-5 h-5" />
            <span>{t('nav.support')}</span>
          </button>
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
        <header className="h-16 bg-white dark:bg-[#0c101c] border-b border-slate-200 dark:border-[#232a3d] flex items-center justify-between px-4 sm:px-6 shrink-0">
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
              <button onClick={() => setNotifOpen(!notifOpen)} className="btn-ghost !p-2 relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-error-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 card shadow-card-hover z-40 animate-slide-down max-h-96 overflow-y-auto scrollbar-thin">
                    <div className="p-3 border-b border-slate-200 dark:border-[#232a3d] flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">{t('header.notifications')}</span>
                      {unreadCount > 0 ? (
                        <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-700 font-medium">{t('header.markAllRead')}</button>
                      ) : (
                        <span className="text-xs text-slate-400">{t('header.allRead')}</span>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">{t('header.noNotifications')}</div>
                    ) : (
                      notifications.map(n => {
                        const tn = getTranslatedNotification(n);
                        return (
                          <div key={n.id} className={`p-3 border-b border-slate-100 dark:border-[#232a3d] hover:bg-slate-50 dark:hover:bg-[#161c2b]/50 ${!n.is_read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}>
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tn.title}</p>
                                {tn.body && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tn.body}</p>}
                                <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                              </div>
                              {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Profile */}
            <button onClick={() => onNavigate('passport')} className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#161c2b] transition-colors">
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {children}
        </main>
      </div>

      {showNotifPrompt && <EnableNotificationsModal onClose={() => setShowNotifPrompt(false)} />}
    </div>
  );
}
