import { useState } from 'react';
import { SOCIAL_PLATFORMS } from '../lib/socialLinks';
import { t } from '../lib/i18n';
import type { SocialLinks } from '../lib/types';
import { Plus, X } from 'lucide-react';

export function SocialLinksPicker({ value, onChange }: {
  value: SocialLinks;
  onChange: (key: keyof SocialLinks, val: string | undefined) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const added = SOCIAL_PLATFORMS.filter(p => value[p.key] != null);
  const available = SOCIAL_PLATFORMS.filter(p => value[p.key] == null);

  const addPlatform = (key: keyof SocialLinks) => {
    onChange(key, '');
    setMenuOpen(false);
  };

  const removePlatform = (key: keyof SocialLinks) => {
    onChange(key, undefined);
  };

  return (
    <div className="space-y-2">
      {added.map(platform => (
        <div key={platform.key} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${platform.colorClass} flex items-center justify-center shrink-0`}>
            <platform.icon className="w-4 h-4 text-white" />
          </div>
          <input
            type="text"
            value={value[platform.key] || ''}
            onChange={e => onChange(platform.key, e.target.value)}
            placeholder={platform.placeholder}
            className="input"
            autoFocus
          />
          <button type="button" onClick={() => removePlatform(platform.key)} className="btn-ghost !p-1.5 shrink-0" title={t('social.remove')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {available.length > 0 && (
        <div className="relative w-fit">
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="btn-secondary text-sm">
            <Plus className="w-4 h-4" /> {t('social.addButton')}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-56 card shadow-card-hover z-40 animate-slide-down p-1.5">
                {available.map(platform => (
                  <button
                    key={platform.key}
                    type="button"
                    onClick={() => addPlatform(platform.key)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#161c2b] transition-colors text-left"
                  >
                    <div className={`w-7 h-7 rounded-lg ${platform.colorClass} flex items-center justify-center shrink-0`}>
                      <platform.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{platform.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
