import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { LandingPage } from './screens/LandingPage';
import { Onboarding } from './screens/Onboarding';
import { DashboardShell, type ScreenKey } from './components/DashboardShell';
import { DashboardOverview } from './screens/DashboardOverview';
import { GigsScreen } from './screens/GigsScreen';
import { BoardScreen } from './screens/BoardScreen';
import { ChatScreen } from './screens/ChatScreen';
import { KanbanScreen } from './screens/KanbanScreen';
import { PassportScreen } from './screens/PassportScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { CompaniesScreen } from './screens/CompaniesScreen';
import { PremiumScreen } from './screens/PremiumScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AdminScreen } from './screens/AdminScreen';
import { Spinner } from './components/ui';
import { ShieldAlert } from 'lucide-react';

const VALID_SCREENS: ScreenKey[] = [
  'dashboard', 'gigs', 'board', 'chat', 'kanban',
  'passport', 'analytics', 'companies', 'premium', 'settings', 'admin',
];

function getScreenFromHash(): ScreenKey {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (hash === 'admin') return 'admin';
  if (VALID_SCREENS.includes(hash as ScreenKey)) return hash as ScreenKey;
  return 'dashboard';
}

function AppContent() {
  const { session, profile, loading, needsOnboarding, needsRoleSelection } = useAuth();
  const [activeScreen, setActiveScreen] = useState<ScreenKey>(getScreenFromHash());
  const [chatTarget, setChatTarget] = useState<string | undefined>(undefined);

  useEffect(() => {
    const onHashChange = () => setActiveScreen(getScreenFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = useCallback((screen: ScreenKey) => {
    setActiveScreen(screen);
    const hash = screen === 'dashboard' ? '' : `/${screen}`;
    window.location.hash = hash;
    if (screen !== 'chat') setChatTarget(undefined);
  }, []);

  const handleOpenChat = useCallback((userId: string) => {
    setChatTarget(userId);
    setActiveScreen('chat');
    window.location.hash = '/chat';
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4 animate-pulse-soft">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white">
              <path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <Spinner className="w-6 h-6 text-brand-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <LandingPage />;
  }

  if (needsRoleSelection) {
    return <Onboarding />;
  }

  if (needsOnboarding) {
    return <Onboarding />;
  }

  // Admin route guard: /admin must NEVER render the regular dashboard
  if (activeScreen === 'admin') {
    if (!profile.is_admin) {
      return (
        <DashboardShell active={activeScreen} onNavigate={handleNavigate}>
          <div className="flex items-center justify-center min-h-[60vh] p-8">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-error-100 dark:bg-error-900/30 mb-4">
                <ShieldAlert className="w-8 h-8 text-error-600 dark:text-error-400" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Доступ ограничен</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                У вас нет прав для доступа к панели администратора. Если вы считаете, что это ошибка, обратитесь к администратору.
              </p>
              <button onClick={() => handleNavigate('dashboard')} className="btn-primary">
                Вернуться на главную
              </button>
            </div>
          </div>
        </DashboardShell>
      );
    }
    return (
      <DashboardShell active={activeScreen} onNavigate={handleNavigate}>
        <AdminScreen />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell active={activeScreen} onNavigate={handleNavigate}>
      {activeScreen === 'dashboard' && <DashboardOverview onNavigate={handleNavigate} />}
      {activeScreen === 'gigs' && <GigsScreen onOpenChat={handleOpenChat} />}
      {activeScreen === 'board' && <BoardScreen onOpenChat={handleOpenChat} />}
      {activeScreen === 'chat' && <ChatScreen targetUserId={chatTarget} />}
      {activeScreen === 'kanban' && <KanbanScreen />}
      {activeScreen === 'passport' && <PassportScreen />}
      {activeScreen === 'analytics' && <AnalyticsScreen />}
      {activeScreen === 'companies' && <CompaniesScreen />}
      {activeScreen === 'premium' && <PremiumScreen />}
      {activeScreen === 'settings' && <SettingsScreen />}
    </DashboardShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
