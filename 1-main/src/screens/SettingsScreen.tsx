import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { LANGUAGES, getAvatarUrl } from '../lib/constants';
import { Avatar, Badge, Toggle, Spinner } from '../components/ui';
import type { Language } from '../lib/i18n';
import {
  User, Bell, Shield, Crown,
  Camera, Save, LogOut, Moon, Sun, DollarSign, Key
} from 'lucide-react';

type Tab = 'profile' | 'notifications' | 'appearance' | 'security' | 'billing';

export function SettingsScreen() {
  const { profile, updateProfile, signOut } = useAuth();
  const { theme, toggleTheme, language, setLanguage } = useTheme();
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
    { key: 'profile', label: 'Профиль', icon: User },
    { key: 'notifications', label: 'Уведомления', icon: Bell },
    { key: 'appearance', label: 'Внешний вид', icon: Sun },
    { key: 'security', label: 'Безопасность', icon: Shield },
    { key: 'billing', label: 'Биллинг', icon: DollarSign },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Настройки</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Управляйте аккаунтом и предпочтениями</p>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-6">
        {/* Tabs sidebar */}
        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`nav-link whitespace-nowrap ${tab === t.key ? 'nav-link-active' : ''}`}
            >
              <t.icon className="w-5 h-5 shrink-0" />
              <span>{t.label}</span>
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
                      {profile.role === 'employer' ? 'Заказчик' : 'Фрилансер'}
                    </Badge>
                    {profile.is_premium && <Badge color="amber"><Crown className="w-3 h-3" /> Premium</Badge>}
                  </div>
                </div>
              </div>

              <div><label className="label">Отображаемое имя</label><input type="text" value={formData.display_name} onChange={e => setFormData({ ...formData, display_name: e.target.value })} className="input" /></div>
              <div><label className="label">Полное имя</label><input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="input" /></div>
              <div><label className="label">О себе</label><textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={3} className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Локация</label><input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="input" /></div>
                <div><label className="label">Телефон</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">URL аватара</label><input type="text" value={formData.avatar_url} onChange={e => setFormData({ ...formData, avatar_url: e.target.value })} placeholder="https://..." className="input" /></div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  Сохранить
                </button>
                {saved && <span className="text-sm text-success-600 animate-fade-in">Сохранено!</span>}
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Уведомления</h3>
              {[
                { key: 'orders' as const, label: 'Заказы', description: 'Новые заказы и изменения статуса' },
                { key: 'messages' as const, label: 'Сообщения', description: 'Новые сообщения в чатах' },
                { key: 'bids' as const, label: 'Заявки на тендеры', description: 'Ответы на ваши заявки' },
                { key: 'marketing' as const, label: 'Маркетинг', description: 'Новости и специальные предложения' },
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
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Тема</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => theme !== 'light' && toggleTheme()} className={`p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <Sun className="w-6 h-6 text-warning-500 mb-2" />
                    <div className="font-medium text-slate-900 dark:text-white text-sm">Светлая</div>
                  </button>
                  <button onClick={() => theme !== 'dark' && toggleTheme()} className={`p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <Moon className="w-6 h-6 text-brand-500 mb-2" />
                    <div className="font-medium text-slate-900 dark:text-white text-sm">Тёмная</div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Язык</h3>
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
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Безопасность</h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Пароль</span>
                </div>
                <button className="btn-secondary text-sm">Изменить пароль</button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Двухфакторная аутентификация</span>
                </div>
                <Toggle checked={false} onChange={() => {}} label="Включить 2FA" />
              </div>
              <div className="p-4 bg-error-50 dark:bg-error-900/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <LogOut className="w-4 h-4 text-error-600" />
                  <span className="text-sm font-medium text-error-700 dark:text-error-400">Выход из аккаунта</span>
                </div>
                <button onClick={signOut} className="btn-danger text-sm">Выйти из всех устройств</button>
              </div>
            </div>
          )}

          {tab === 'billing' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Биллинг</h3>
              <div className="p-4 bg-gradient-to-r from-warning-500/10 to-brand-500/10 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Crown className="w-8 h-8 text-warning-500" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Premium подписка</div>
                    <div className="text-sm text-slate-500">{profile.is_premium ? `Активна до ${new Date(profile.premium_until || '').toLocaleDateString('ru-RU')}` : 'Не активна'}</div>
                  </div>
                </div>
                {profile.is_premium ? (
                  <button className="btn-secondary text-sm">Управлять подпиской</button>
                ) : (
                  <button className="btn-primary text-sm">Активировать Premium</button>
                )}
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-success-600" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">Баланс</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">${profile.balance.toFixed(2)}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-sm font-medium text-slate-900 dark:text-white">История транзакций</span>
                <p className="text-xs text-slate-500 mt-1">Нет недавних транзакций</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
