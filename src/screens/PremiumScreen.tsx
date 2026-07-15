import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { PREMIUM_PLANS } from '../lib/constants';
import { Badge } from '../components/ui';
import { t } from '../lib/i18n';
import { formatPrice } from '../lib/format';
import { Crown, Check, Zap, TrendingUp, Shield, Star } from 'lucide-react';

const NEXWORK_TG = 'https://t.me/nexwork_uz';

function useBenefits() {
  return [
    { icon: TrendingUp, title: t('premium.benefit.priority.title'), description: t('premium.benefit.priority.description') },
    { icon: Zap, title: t('premium.benefit.fees.title'), description: t('premium.benefit.fees.description') },
    { icon: Crown, title: t('premium.benefit.badge.title'), description: t('premium.benefit.badge.description') },
    { icon: Shield, title: t('premium.benefit.support.title'), description: t('premium.benefit.support.description') },
    { icon: Star, title: t('premium.benefit.analytics.title'), description: t('premium.benefit.analytics.description') },
  ];
}

const LOCALE_MAP: Record<string, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

export function PremiumScreen() {
  const { profile } = useAuth();
  const { language } = useTheme();
  const locale = LOCALE_MAP[language] || 'ru-RU';
  const BENEFITS = useBenefits();

  if (!profile) return null;

  const planName = (plan: typeof PREMIUM_PLANS[number]) => (language === 'en' ? plan.nameEn : language === 'uz' ? plan.nameUz : plan.name);
  const planPeriod = (plan: typeof PREMIUM_PLANS[number]) => (language === 'en' ? plan.periodEn : language === 'uz' ? plan.periodUz : plan.period);
  const planFeatures = (plan: typeof PREMIUM_PLANS[number]) => (language === 'en' ? plan.featuresEn : language === 'uz' ? plan.featuresUz : plan.features);

  const handleSelectPlan = (plan: typeof PREMIUM_PLANS[number]) => {
    const message = `Здравствуйте! Хочу оформить тариф "${planName(plan)}" (${formatPrice(plan.price)}/${planPeriod(plan)}). Мой ID: ${profile.public_id}`;
    const url = `${NEXWORK_TG}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const faq = [
    { q: t('premium.faq.q1'), a: t('premium.faq.a1') },
    { q: t('premium.faq.q2'), a: t('premium.faq.a2') },
    { q: t('premium.faq.q3'), a: t('premium.faq.a3') },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-warning-400 to-warning-600 mb-4">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Nexwork Premium</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          {t('premium.subtitle')}
        </p>
        {profile.is_premium && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 rounded-full text-sm font-medium">
            <Check className="w-4 h-4" /> {t('premium.activeUntil')} {new Date(profile.premium_until || '').toLocaleDateString(locale)}
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {PREMIUM_PLANS.map((plan, i) => (
          <div
            key={plan.key}
            className={`card p-6 relative animate-slide-up ${plan.popular ? 'border-brand-500 ring-2 ring-brand-500/20' : ''}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge color="blue" className="shadow-md">{t('premium.popular')}</Badge>
              </div>
            )}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{planName(plan)}</h3>
              <div className="mt-3 flex items-baseline justify-center gap-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{formatPrice(plan.price)}</span>
                <span className="text-slate-500">/{planPeriod(plan)}</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {planFeatures(plan).map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Check className="w-4 h-4 text-success-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSelectPlan(plan)}
              disabled={profile.is_premium}
              className={`w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'} ${profile.is_premium ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {profile.is_premium ? t('premium.active') : t('premium.select')}
            </button>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">{t('premium.whatYouGet')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map((b, i) => (
            <div key={i} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white flex items-center justify-center mb-3">
                <b.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">{b.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{b.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="card p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">{t('premium.faq')}</h3>
        <div className="space-y-4">
          {faq.map((item, i) => (
            <div key={i} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
              <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">{item.q}</h4>
              <p className="text-sm text-slate-500">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
