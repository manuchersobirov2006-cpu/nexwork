import { useState } from 'react';
import { t } from '../lib/i18n';
import { ShoppingCart, Package, ShieldCheck, Gavel, Wallet, Scale, ChevronDown, Clock3 } from 'lucide-react';

type CategoryKey = 'orders' | 'gigs' | 'account' | 'tenders' | 'finance' | 'rights';

const CATEGORIES: { key: CategoryKey; icon: React.ElementType }[] = [
  { key: 'orders', icon: ShoppingCart },
  { key: 'gigs', icon: Package },
  { key: 'account', icon: ShieldCheck },
  { key: 'tenders', icon: Gavel },
  { key: 'finance', icon: Wallet },
  { key: 'rights', icon: Scale },
];

export function FaqSection() {
  const [category, setCategory] = useState<CategoryKey>('orders');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const items = [0, 1, 2, 3, 4].map(i => ({
    q: t(`faq.${category}.q${i}`),
    a: t(`faq.${category}.a${i}`),
  })).filter(item => item.q && !item.q.startsWith('faq.'));

  return (
    <div className="card p-4 sm:p-5 animate-slide-up mt-4 sm:mt-6">
      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-1">{t('faq.title')}</h3>
      <p className="text-xs sm:text-sm text-slate-500 mb-4">{t('faq.subtitle')}</p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => { setCategory(c.key); setOpenIndex(0); }}
            className={`flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-xl border transition-all text-center ${
              category === c.key
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                : 'border-slate-200 dark:border-[#232a3d] text-slate-600 dark:text-slate-400 hover:border-brand-300 dark:hover:border-brand-700'
            }`}
          >
            <c.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[11px] sm:text-xs font-medium leading-tight">{t(`faq.category.${c.key}`)}</span>
          </button>
        ))}
      </div>

      {category === 'rights' && (
        <p className="text-[11px] text-slate-400 mb-3 italic">{t('faq.rights.legalNote')}</p>
      )}

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-[#232a3d] overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 p-3 text-left bg-slate-50 dark:bg-[#161c2b]/50 hover:bg-slate-100 dark:hover:bg-[#161c2b] transition-colors"
            >
              <span className="text-sm font-medium text-slate-900 dark:text-white">{item.q}</span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`} />
            </button>
            {openIndex === i && (
              <div className="p-3 pt-2.5 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line animate-slide-down">
                {item.a}
                {category === 'orders' && i === 0 && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
                    <Clock3 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{t('faq.escrow.comingSoon')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
