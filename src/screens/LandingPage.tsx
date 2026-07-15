import { useState, useEffect } from 'react';
import { AuthModal } from '../components/AuthModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { FooterInfoModal, type FooterInfoKey } from '../components/FooterInfoModal';
import { CATEGORIES } from '../lib/constants';
import { useTheme } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { t, getLanguage } from '../lib/i18n';
import {
  Search, Sun, Moon, Menu, X, ArrowRight, Check, Star,
  Palette, Code, Megaphone, PenLine, Video, Music, Briefcase,
  Sparkles, Database, Lightbulb, Shield, Zap, TrendingUp,
  Users, Globe, MessageSquare, Award, ChevronRight
} from 'lucide-react';

const ICONS: Record<string, React.ElementType> = {
  Palette, Code, Megaphone, PenLine, Video, Music, Briefcase,
  Sparkles, Database, Lightbulb, Shield, Zap, TrendingUp,
  MessageSquare, Award, Globe, Users, Check, Star,
};

interface ContentRow {
  key: string;
  section: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

function getDefaultStats() {
  return [
    { key: 'freelancers', label: t('landing.stat.freelancers'), value: '12,500+', icon: Users },
    { key: 'orders', label: t('landing.stat.orders'), value: '85,000+', icon: Check },
    { key: 'countries', label: t('landing.stat.countries'), value: '15', icon: Globe },
    { key: 'rating', label: t('landing.stat.rating'), value: '4.8', icon: Star },
  ];
}

function getDefaultFeatures() {
  return [
    { key: 'passport', icon: Shield, title: t('landing.feature.passport.title'), description: t('landing.feature.passport.description') },
    { key: 'instant', icon: Zap, title: t('landing.feature.instant.title'), description: t('landing.feature.instant.description') },
    { key: 'analytics', icon: TrendingUp, title: t('landing.feature.analytics.title'), description: t('landing.feature.analytics.description') },
    { key: 'messenger', icon: MessageSquare, title: t('landing.feature.messenger.title'), description: t('landing.feature.messenger.description') },
    { key: 'quality', icon: Award, title: t('landing.feature.quality.title'), description: t('landing.feature.quality.description') },
    { key: 'localization', icon: Globe, title: t('landing.feature.localization.title'), description: t('landing.feature.localization.description') },
  ];
}

function getDefaultSteps() {
  return [
    { key: 'step1', num: '01', title: t('landing.step1.title'), description: t('landing.step1.description') },
    { key: 'step2', num: '02', title: t('landing.step2.title'), description: t('landing.step2.description') },
    { key: 'step3', num: '03', title: t('landing.step3.title'), description: t('landing.step3.description') },
  ];
}

function getDefaultHero() {
  const titles: Record<string, string> = {
    ru: 'Найти работу стало проще',
    uz: 'Ish topish osonlashdi',
    en: 'Finding work just got easier',
  };
  const subtitles: Record<string, string> = {
    ru: 'Nexwork соединяет фрилансеров и заказчиков в Центральной Азии. Услуги, тендеры, мессенджер и аналитика — всё в одной платформе.',
    uz: "Nexwork Markaziy Osiyodagi frilanserlar va buyurtmachilarni bog'laydi. Xizmatlar, tenderlar, messenjer va analitika — barchasi bitta platformada.",
    en: 'Nexwork connects freelancers and clients across Central Asia. Services, tenders, messaging, and analytics — all in one platform.',
  };
  return {
    title: titles[getLanguage()] ?? titles.ru,
    subtitle: subtitles[getLanguage()] ?? subtitles.ru,
  };
}

function getIcon(name: string): React.ElementType {
  return ICONS[name] || Briefcase;
}

export function LandingPage({ onNavigateDashboard }: { onNavigateDashboard?: () => void }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [footerModal, setFooterModal] = useState<FooterInfoKey | null>(null);
  const { theme, toggleTheme, language } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const [heroTitle, setHeroTitle] = useState(getDefaultHero().title);
  const [heroSubtitle, setHeroSubtitle] = useState(getDefaultHero().subtitle);
  const [stats, setStats] = useState(getDefaultStats());
  const [features, setFeatures] = useState(getDefaultFeatures());
  const [steps, setSteps] = useState(getDefaultSteps());

  // The hero title/subtitle are always the code-defined slogan (not sourced
  // from platform_content) so it can't be overridden by stale admin-authored
  // DB content. Stats/features/steps still come from the DB for ru.
  useEffect(() => {
    setHeroTitle(getDefaultHero().title);
    setHeroSubtitle(getDefaultHero().subtitle);

    if (language !== 'ru') {
      setStats(getDefaultStats());
      setFeatures(getDefaultFeatures());
      setSteps(getDefaultSteps());
      return;
    }

    supabase
      .from('platform_content')
      .select('*')
      .eq('is_active', true)
      .order('section')
      .order('sort_order')
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const rows = data as ContentRow[];

        const statRows = rows.filter(r => r.section === 'stats');
        if (statRows.length > 0) {
          setStats(statRows.map((r, i) => ({
            key: r.key,
            label: r.title,
            value: r.description || '0',
            icon: i === 0 ? Users : i === 1 ? Check : i === 2 ? Globe : Star,
          })));
        }

        const featureRows = rows.filter(r => r.section === 'feature');
        if (featureRows.length > 0) {
          setFeatures(featureRows.map(r => {
            const defaultF = getDefaultFeatures().find(f => f.key === r.key);
            return {
              key: r.key,
              icon: (defaultF?.icon || getIcon(r.key)) as ReturnType<typeof getDefaultFeatures>[number]['icon'],
              title: r.title,
              description: r.description || '',
            };
          }));
        }

        const stepRows = rows.filter(r => r.section === 'steps');
        if (stepRows.length > 0) {
          setSteps(stepRows.map((r, i) => ({
            key: r.key,
            num: `0${i + 1}`,
            title: r.title,
            description: r.description || '',
          })));
        }
      });
  }, [language]);

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/logo.svg" alt="Nexwork" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">Nexwork</span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <a href="#features" className="btn-ghost">{t('landing.nav.features')}</a>
              <a href="#how" className="btn-ghost">{t('landing.nav.how')}</a>
              <a href="#categories" className="btn-ghost">{t('landing.nav.categories')}</a>
              {onNavigateDashboard && (
                <button onClick={onNavigateDashboard} className="btn-ghost">{t('nav.cabinet')}</button>
              )}
            </nav>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button onClick={toggleTheme} className="btn-ghost !p-2" aria-label="Toggle theme">
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <button onClick={() => openAuth('signin')} className="btn-ghost hidden sm:inline-flex">{t('landing.nav.signin')}</button>
              <button onClick={() => openAuth('signup')} className="btn-primary !px-4 !py-2 text-sm">
                {t('landing.nav.start')}
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="btn-ghost md:hidden !p-2">
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-1 animate-slide-down">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="btn-ghost w-full justify-start">{t('landing.nav.features')}</a>
              <a href="#how" onClick={() => setMobileMenuOpen(false)} className="btn-ghost w-full justify-start">{t('landing.nav.how')}</a>
              <a href="#categories" onClick={() => setMobileMenuOpen(false)} className="btn-ghost w-full justify-start">{t('landing.nav.categories')}</a>
              <button onClick={() => openAuth('signin')} className="btn-ghost w-full justify-start">{t('landing.nav.signin')}</button>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-white to-white dark:from-brand-950/20 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full text-sm font-medium mb-6 animate-slide-down">
            <Sparkles className="w-4 h-4" />
            {t('landing.hero.badge')}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight max-w-4xl mx-auto animate-slide-up">
            {heroTitle.split(' ').slice(0, -2).join(' ')} <span className="text-gradient">{heroTitle.split(' ').slice(-2).join(' ')}</span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto animate-slide-up">
            {heroSubtitle}
          </p>

          {/* Search bar */}
          <div className="mt-8 max-w-2xl mx-auto animate-slide-up">
            <div className="flex flex-col sm:flex-row gap-2 p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-card-hover border border-slate-200 dark:border-slate-800">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('landing.hero.search')}
                  className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <button onClick={() => openAuth('signup')} className="btn-primary !py-3">
                <Search className="w-4 h-4" />
                {t('landing.hero.find')}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in">
            {stats.map(stat => (
              <div key={stat.key} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 mb-2">
                  <stat.icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{t('landing.categories.title')}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">{t('landing.categories.subtitle')}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {CATEGORIES.map((cat, i) => {
              const Icon = ICONS[cat.icon] || Briefcase;
              return (
                <button
                  key={cat.key}
                  onClick={() => openAuth('signup')}
                  className="group card p-5 text-center hover:shadow-card-hover hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-200 animate-scale-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">{language === 'en' ? cat.labelEn : language === 'uz' ? cat.labelUz : cat.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{t('landing.features.title')}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">{t('landing.features.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.key}
                className="card p-6 hover:shadow-card-hover transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white mb-4">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{t('landing.how.title')}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">{t('landing.how.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.key} className="relative animate-slide-up" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="text-5xl font-extrabold text-brand-200 dark:text-brand-900 mb-2">{step.num}</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-4 w-8 h-8 text-slate-300 dark:text-slate-700" />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button onClick={() => openAuth('signup')} className="btn-primary text-base !px-8 !py-3.5">
              {t('landing.how.cta')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-10 sm:p-16 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                {t('landing.cta.title')}
              </h2>
              <p className="text-brand-100 text-lg mb-8 max-w-2xl mx-auto">
                {t('landing.cta.subtitle')}
              </p>
              <button onClick={() => openAuth('signup')} className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-brand-700 font-bold rounded-xl hover:bg-brand-50 transition-all duration-200 active:scale-95 shadow-lg">
                {t('landing.cta.button')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                <img src="/logo.svg" alt="Nexwork" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">Nexwork</span>
              <span className="text-sm text-slate-400">© 2026</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400">
              <button onClick={() => setFooterModal('about')} className="hover:text-brand-600">{t('landing.footer.about')}</button>
              <button onClick={() => setFooterModal('terms')} className="hover:text-brand-600">{t('landing.footer.terms')}</button>
              <button onClick={() => setFooterModal('privacy')} className="hover:text-brand-600">{t('landing.footer.privacy')}</button>
              <button onClick={() => setFooterModal('support')} className="hover:text-brand-600">{t('landing.footer.support')}</button>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} />
      {footerModal && <FooterInfoModal topic={footerModal} onClose={() => setFooterModal(null)} />}
    </div>
  );
}
