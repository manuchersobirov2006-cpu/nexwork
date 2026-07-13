import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { PREMIUM_PLANS } from '../lib/constants';
import { Badge, Spinner } from '../components/ui';
import { Crown, Check, Zap, TrendingUp, Shield, Star } from 'lucide-react';

const BENEFITS = [
  { icon: TrendingUp, title: 'Приоритет в поиске', description: 'Ваши услуги отображаются выше конкурентов' },
  { icon: Zap, title: 'Меньше комиссий', description: 'Сниженная комиссия платформы на все заказы' },
  { icon: Crown, title: 'Премиум-бейдж', description: 'Выделитесь золотым значком в профиле и каталоге' },
  { icon: Shield, title: 'VIP-поддержка', description: 'Приоритетная поддержка 24/7' },
  { icon: Star, title: 'Расширенная аналитика', description: 'Подробные графики и отчёты по эффективности' },
];

export function PremiumScreen() {
  const { profile, updateProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  if (!profile) return null;

  const handleActivate = async () => {
    if (!selectedPlan) return;
    setActivating(true);
    const plan = PREMIUM_PLANS.find(p => p.key === selectedPlan);
    const until = new Date();
    until.setMonth(until.getMonth() + 1);
    await updateProfile({
      is_premium: true,
      premium_until: until.toISOString(),
    });
    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'premium',
      title: 'Premium активирован!',
      body: `План ${plan?.name} активирован на 1 месяц`,
      link: 'premium',
    });
    setActivating(false);
    setActivated(true);
    setTimeout(() => setActivated(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-warning-400 to-warning-600 mb-4">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Nexwork Premium</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          Откройте все возможности платформы и выйдите на новый уровень
        </p>
        {profile.is_premium && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 rounded-full text-sm font-medium">
            <Check className="w-4 h-4" /> Premium активен до {new Date(profile.premium_until || '').toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>

      {activated && (
        <div className="card p-4 mb-6 bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800 animate-scale-in">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-success-600" />
            <div>
              <div className="font-bold text-success-700 dark:text-success-400">Premium активирован!</div>
              <div className="text-sm text-success-600 dark:text-success-500">Наслаждайтесь всеми преимуществами</div>
            </div>
          </div>
        </div>
      )}

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
                <Badge color="blue" className="shadow-md">Популярный</Badge>
              </div>
            )}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
              <div className="mt-3 flex items-baseline justify-center gap-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">${plan.price}</span>
                <span className="text-slate-500">/{plan.period}</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Check className="w-4 h-4 text-success-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => { setSelectedPlan(plan.key); handleActivate(); }}
              disabled={activating || profile.is_premium}
              className={`w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'} ${profile.is_premium ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {activating && selectedPlan === plan.key ? <Spinner className="w-4 h-4" /> : null}
              {profile.is_premium ? 'Активен' : 'Выбрать'}
            </button>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">Что вы получаете</h2>
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
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Частые вопросы</h3>
        <div className="space-y-4">
          {[
            { q: 'Можно ли отменить подписку?', a: 'Да, отменить можно в любой момент в настройках. Premium действует до конца оплаченного периода.' },
            { q: 'Какие способы оплаты?', a: 'Карты Visa, Mastercard, электронные кошельки и банковские переводы.' },
            { q: 'Возвращаете ли деньги?', a: 'Да, в течение 14 дней можно вернуть полную стоимость без вопросов.' },
          ].map((item, i) => (
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
