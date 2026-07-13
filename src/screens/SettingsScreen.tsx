import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { LANGUAGES, getAvatarUrl } from '../lib/constants';
import { Avatar, Badge, Toggle, Spinner } from '../components/ui';
import { t } from '../lib/i18n';
import type { Language } from '../lib/i18n';
import {
  User, Bell, Shield, Crown,
  Camera, Save, LogOut, Moon, Sun, DollarSign, Key
} from 'lucide-react';

type Tab = 'profile' | 'notifications' | 'appearance' | 'security' | 'billing';

export function SettingsScreen() {
  const { profile, updateProfile, signOut } = useAuth();
  const { theme, toggleTheme, language, setLanguage } = useTheme();
  void language;
  const [tab, setTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    phone: profile?.phone || '',
    avatar_url: profile?.avatar_url || '',
  });

  const [notifSettings, setNotifSettings] = useState({
    orders: true,
    messages: true,
    bids: true,
    marketing: false,
  });

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    await updateProfile(formData);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: t('settings.tab.profile'), icon: User },
    { key: 'notifications', label: t('settings.tab.notifications'), icon: Bell },
    { key: 'appearance', label: t('settings.tab.appearance'), icon: Sun },
    { key: 'security', label: t('settings.tab.security'), icon: Shield },
    { key: 'billing', label: t('settings.tab.billing'), icon: DollarSign },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-6">
        {/* Tabs sidebar */}
        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          {tabs.map(tabItem => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`nav-link whitespace-nowrap ${tab === tabItem.key ? 'nav-link-active' : ''}`}
            >
              <tabItem.icon className="w-5 h-5 shrink-0" />
              <span>{tabItem.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card p-6">
          {tab === 'profile' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <Avatar src={formData.avatar_url || getAvatarUrl(profile)} name={profile.display_name || profile.email} size={72} />
                  <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md">
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{profile.display_name || profile.full_name}</div>
                  <div className="text-sm text-slate-500">{profile.email}</div>
                  <div className="flex gap-1 mt-1">
                    <Badge color={profile.role === 'employer' ? 'purple' : 'blue'}>
                      {profile.role === 'employer' ? t('role.employer') : t('role.freelancer')}
                    </Badge>
                    {profile.is_premium && <Badge color="amber"><Crown className="w-3 h-3" /> {t('passport.premium')}</Badge>}
                  </div>
                </div>
              </div>

              <div><label className="label">{t('settings.displayName')}</label><input type="text" value={formData.display_name} onChange={e => setFormData({ ...formData, display_name: e.target.value })} className="input" /></div>
              <div><label className="label">{t('settings.fullName')}</label><input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="input" /></div>
              <div><label className="label">{t('settings.about')}</label><textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={3} className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">{t('settings.location')}</label><input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="input" /></div>
                <div><label className="label">{t('settings.phone')}</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">{t('settings.avatarUrl')}</label><input type="text" value={formData.avatar_url} onChange={e => setFormData({ ...formData, avatar_url: e.target.value })} placeholder="https://..." className="input" /></div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {t('settings.save')}
                </button>
                {saved && <span className="text-sm text-success-600 animate-fade-in">{t('settings.saved')}</span>}
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{t('settings.notif.title')}</h3>
              {[
                { key: 'orders' as const, label: t('settings.notif.orders'), description: t('settings.notif.orders.desc') },
                { key: 'messages' as const, label: t('settings.notif.messages'), description: t('settings.notif.messages.desc') },
                { key: 'bids' as const, label: t('settings.notif.bids'), description: t('settings.notif.bids.desc') },
                { key: 'marketing' as const, label: t('settings.notif.marketing'), description: t('settings.notif.marketing.desc') },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.description}</div>
                  </div>
                  <Toggle checked={notifSettings[item.key]} onChange={v => setNotifSettings({ ...notifSettings, [item.key]: v })} />
                </div>
              ))}
            </div>
          )}

          {tab === 'appearance' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">{t('settings.theme')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => theme !== 'light' && toggleTheme()} className={`p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <Sun className="w-6 h-6 text-warning-500 mb-2" />
                    <div className="font-medium text-slate-900 dark:text-white text-sm">{t('settings.theme.light')}</div>
                  </button>
                  <button onClick={() => theme !== 'dark' && toggleTheme()} className={`p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <Moon className="w-6 h-6 text-brand-500 mb-2" />
                    <div className="font-medium text-slate-900 dark:text-white text-sm">{t('settings.theme.dark')}</div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">{t('settings.language')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as Language)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${language === lang.code ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                      <div className="text-2xl mb-1">{lang.flag}</div>
                      <div className="text-xs font-medium text-slate-900 dark:text-white">{lang.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{t('settings.security')}</h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{t('settings.password')}</span>
                </div>
                <button className="btn-secondary text-sm">{t('settings.changePassword')}</button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{t('settings.twoFactor')}</span>
                </div>
                <Toggle checked={false} onChange={() => {}} label={t('settings.enable2fa')} />
              </div>
              <div className="p-4 bg-error-50 dark:bg-error-900/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <LogOut className="w-4 h-4 text-error-600" />
                  <span className="text-sm font-medium text-error-700 dark:text-error-400">{t('settings.signOut')}</span>
                </div>
                <button onClick={signOut} className="btn-danger text-sm">{t('settings.signOutAll')}</button>
              </div>
            </div>
          )}

          {tab === 'billing' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{t('settings.billing')}</h3>
              <div className="p-4 bg-gradient-to-r from-warning-500/10 to-brand-500/10 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Crown className="w-8 h-8 text-warning-500" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{t('settings.premiumSubscription')}</div>
                    <div className="text-sm text-slate-500">{profile.is_premium ? `${t('settings.activeUntil')} ${new Date(profile.premium_until || '').toLocaleDateString('ru-RU')}` : t('settings.notActive')}</div>
                  </div>
                </div>
                {profile.is_premium ? (
                  <button className="btn-secondary text-sm">{t('settings.manageSubscription')}</button>
                ) : (
                  <button className="btn-primary text-sm">{t('settings.activatePremium')}</button>
                )}
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-success-600" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{t('settings.balance')}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">${profile.balance.toFixed(2)}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-sm font-medium text-slate-900 dark:text-white">{t('settings.transactionHistory')}</span>
                <p className="text-xs text-slate-500 mt-1">{t('settings.noTransactions')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
