import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { t } from '../lib/i18n';
import { PortfolioSection } from '../components/PortfolioSection';
import { MyGigsSection } from '../components/MyGigsSection';
import { TopBadgeSection } from '../components/TopBadgeSection';
import { Check, Copy, Share2 } from 'lucide-react';

export function PortfolioScreen() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  const publicUrl = `${window.location.origin}${window.location.pathname}#/p/${profile.public_id}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">{t('portfolio.title')}</h1>
      <p className="text-slate-500 text-sm mb-6">{t('portfolio.pageDescription')}</p>

      <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-3 animate-slide-up">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
          <Share2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{t('portfolio.shareTitle')}</div>
          <div className="text-xs text-slate-500 truncate">{publicUrl}</div>
        </div>
        <button onClick={handleCopy} className="btn-secondary text-sm shrink-0">
          {copied ? <Check className="w-4 h-4 text-success-600" /> : <Copy className="w-4 h-4" />}
          {copied ? t('portfolio.copied') : t('portfolio.copyLink')}
        </button>
      </div>

      {profile.role === 'freelancer' && <MyGigsSection profile={profile} />}
      {profile.role === 'freelancer' && <TopBadgeSection profile={profile} />}

      <PortfolioSection userId={profile.id} />
    </div>
  );
}
