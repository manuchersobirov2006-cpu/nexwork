import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth, DEVICE_REMEMBERED_KEY } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { LandingPage } from './screens/LandingPage';
import { Onboarding } from './screens/Onboarding';
import { DashboardShell, type ScreenKey } from './components/DashboardShell';
import { DashboardOverview } from './screens/DashboardOverview';
import { SpecialistsScreen } from './screens/SpecialistsScreen';
import { GigsScreen } from './screens/GigsScreen';
import { BoardScreen } from './screens/BoardScreen';
import { ChatScreen } from './screens/ChatScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { PassportScreen } from './screens/PassportScreen';
import { PortfolioScreen } from './screens/PortfolioScreen';
import { PublicPortfolioScreen } from './screens/PublicPortfolioScreen';
import { GuestBrowseScreen } from './screens/GuestBrowseScreen';
import { WelcomeBackScreen } from './screens/WelcomeBackScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { MfaChallengeScreen } from './screens/MfaChallengeScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { CompaniesScreen } from './screens/CompaniesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AdminScreen } from './screens/AdminScreen';
import { SupportScreen } from './screens/SupportScreen';
import { Spinner } from './components/ui';
import { ShieldAlert } from 'lucide-react';

const VALID_SCREENS: ScreenKey[] = [
  'dashboard', 'gigs', 'services', 'board', 'chat', 'orders',
  'passport', 'portfolio', 'analytics', 'companies', 'settings', 'admin', 'support',
];

function getScreenFromHash(): ScreenKey {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (hash === 'admin') return 'admin';
  if (VALID_SCREENS.includes(hash as ScreenKey)) return hash as ScreenKey;
  return 'dashboard';
}

function getPublicPortfolioId(): string | null {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const match = hash.match(/^p\/([^/]+)$/i);
  return match ? match[1] : null;
}

function getGuestBrowseParams(): { q?: string; cat?: string; mode?: string } | null {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash.startsWith('browse')) return null;
  const queryIndex = hash.indexOf('?');
  const params = new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : '');
  return { q: params.get('q') ?? undefined, cat: params.get('cat') ?? undefined, mode: params.get('mode') ?? undefined };
}

function AppContent() {
  const { session, profile, loading, needsOnboarding, needsRoleSelection, isPasswordRecovery, needsMfaVerification } = useAuth();
  const [activeScreen, setActiveScreen] = useState<ScreenKey>(getScreenFromHash());
  const [chatTarget, setChatTarget] = useState<string | undefined>(undefined);
  const [publicPortfolioId, setPublicPortfolioId] = useState<string | null>(getPublicPortfolioId());
  const [guestBrowse, setGuestBrowse] = useState(getGuestBrowseParams());
  const [forceShowLanding, setForceShowLanding] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      setPublicPortfolioId(getPublicPortfolioId());
      setGuestBrowse(getGuestBrowseParams());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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

  if (publicPortfolioId) {
    return <PublicPortfolioScreen publicId={publicPortfolioId} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0a0e17]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 animate-pulse-soft overflow-hidden">
            <img src="/logo.svg" alt="Nexwork" className="w-full h-full object-cover" />
          </div>
          <Spinner className="w-6 h-6 text-brand-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (isPasswordRecovery) {
    return <ResetPasswordScreen />;
  }

  if (guestBrowse && (!session || !profile)) {
    return <GuestBrowseScreen initialQuery={guestBrowse.q} initialCategory={guestBrowse.cat} initialMode={guestBrowse.mode} />;
  }

  if (!session || !profile) {
    const deviceRemembered = !forceShowLanding && localStorage.getItem(DEVICE_REMEMBERED_KEY);
    if (deviceRemembered) {
      return <WelcomeBackScreen onShowLanding={() => setForceShowLanding(true)} />;
    }
    return <LandingPage />;
  }

  if (needsMfaVerification) {
    return <MfaChallengeScreen />;
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
      {activeScreen === 'gigs' && <SpecialistsScreen onOpenChat={handleOpenChat} />}
      {activeScreen === 'services' && <GigsScreen />}
      {activeScreen === 'board' && <BoardScreen onOpenChat={handleOpenChat} />}
      {activeScreen === 'chat' && <ChatScreen targetUserId={chatTarget} />}
      {activeScreen === 'orders' && <OrdersScreen onOpenChat={handleOpenChat} />}
      {activeScreen === 'passport' && <PassportScreen />}
      {activeScreen === 'portfolio' && <PortfolioScreen />}
      {activeScreen === 'analytics' && <AnalyticsScreen />}
      {activeScreen === 'companies' && <CompaniesScreen />}
      {activeScreen === 'settings' && <SettingsScreen />}
      {activeScreen === 'support' && <SupportScreen />}
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
