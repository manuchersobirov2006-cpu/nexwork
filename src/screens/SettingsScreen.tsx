import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { LANGUAGES, getAvatarUrl } from '../lib/constants';
import { Avatar, Badge, Toggle, Spinner } from '../components/ui';
import { t } from '../lib/i18n';
import type { Language } from '../lib/i18n';
import { isPushSupported, isIosNotStandalone, isCurrentDeviceSubscribed, subscribeToPush, unsubscribeFromPush } from '../lib/pushNotifications';
import {
  User, Bell, Shield, ShieldCheck,
  Camera, Save, LogOut, Moon, Sun, Key, Eye, EyeOff, Check, X, BellRing,
  Info, Share, PlusSquare, Smartphone, Mail
} from 'lucide-react';

type Tab = 'profile' | 'notifications' | 'appearance' | 'security';

export function SettingsScreen() {
  const { profile, updateProfile, signOut, updatePassword, mfaEnroll, mfaVerifyEnrollment, mfaUnenroll, mfaListFactors } = useAuth();
  const { theme, toggleTheme, language, setLanguage } = useTheme();
  void language;
  const [tab, setTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [pushSupported, setPushSupported] = useState(true);
  const [pushNeedsHomeScreen, setPushNeedsHomeScreen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (isIosNotStandalone()) {
      setPushSupported(false);
      setPushNeedsHomeScreen(true);
      setPushLoading(false);
      return;
    }
    if (!isPushSupported()) {
      setPushSupported(false);
      setPushLoading(false);
      return;
    }
    isCurrentDeviceSubscribed().then(v => { setPushEnabled(v); setPushLoading(false); });
  }, []);

  const handleTogglePush = async (next: boolean) => {
    if (!profile) return;
    setPushError(null);
    setPushLoading(true);
    if (next) {
      const { error } = await subscribeToPush(profile.id);
      if (error === 'denied') {
        setPushError(t('settings.push.deniedError'));
      } else if (error) {
        setPushError(t('settings.push.genericError'));
      } else {
        setPushEnabled(true);
      }
    } else {
      await unsubscribeFromPush();
      setPushEnabled(false);
    }
    setPushLoading(false);
  };

  const handleToggleEmail = async (next: boolean) => {
    await updateProfile({ email_notifications_enabled: next });
  };

  const [mfaFactors, setMfaFactors] = useState<{ id: string; status: string }[]>([]);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSaving, setMfaSaving] = useState(false);

  const loadMfaFactors = useCallback(async () => {
    setMfaLoading(true);
    const factors = await mfaListFactors();
    setMfaFactors(factors);
    setMfaLoading(false);
  }, [mfaListFactors]);

  useEffect(() => { loadMfaFactors(); }, [loadMfaFactors]);

  const mfaEnabled = mfaFactors.some(f => f.status === 'verified');

  const handleStartEnroll = async () => {
    setMfaError(null);
    setEnrolling(true);
    const { factorId, qrCode: qr, secret: s, error } = await mfaEnroll();
    if (error) {
      setMfaError(error);
      setEnrolling(false);
      return;
    }
    setEnrollFactorId(factorId);
    setQrCode(qr);
    setSecret(s);
  };

  const handleCancelEnroll = async () => {
    if (enrollFactorId) await mfaUnenroll(enrollFactorId);
    setEnrolling(false);
    setEnrollFactorId(null);
    setQrCode(null);
    setSecret(null);
    setMfaCode('');
    setMfaError(null);
  };

  const handleVerifyEnroll = async () => {
    if (!enrollFactorId) return;
    setMfaError(null);
    setMfaSaving(true);
    const { error } = await mfaVerifyEnrollment(enrollFactorId, mfaCode.trim());
    setMfaSaving(false);
    if (error) {
      setMfaError(error);
      return;
    }
    setEnrolling(false);
    setEnrollFactorId(null);
    setQrCode(null);
    setSecret(null);
    setMfaCode('');
    loadMfaFactors();
  };

  const handleDisableMfa = async (factorId: string) => {
    if (!window.confirm(t('settings.mfa.disableConfirm'))) return;
    await mfaUnenroll(factorId);
    loadMfaFactors();
  };

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

  const handleChangePassword = async () => {
    setPwError(null);
    if (newPassword.length < 6) {
      setPwError(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t('auth.passwordsDontMatch'));
      return;
    }
    setPwSaving(true);
    const { error } = await updatePassword(newPassword);
    setPwSaving(false);
    if (error) {
      setPwError(error);
    } else {
      setPwSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setPwSuccess(false); setShowPasswordForm(false); }, 2000);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: t('settings.tab.profile'), icon: User },
    { key: 'notifications', label: t('settings.tab.notifications'), icon: Bell },
    { key: 'appearance', label: t('settings.tab.appearance'), icon: Sun },
    { key: 'security', label: t('settings.tab.security'), icon: Shield },
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

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
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
              <div className="p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                      <BellRing className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{t('settings.push.title')}</div>
                      <div className="text-xs text-slate-500">{pushNeedsHomeScreen ? t('settings.push.iosHomeScreen') : pushSupported ? t('settings.push.description') : t('settings.push.unsupported')}</div>
                    </div>
                  </div>
                  {pushLoading ? <Spinner className="w-4 h-4 text-brand-600" /> : (
                    <Toggle checked={pushEnabled} onChange={handleTogglePush} disabled={!pushSupported} />
                  )}
                </div>
                {pushError && <p className="text-xs text-error-600 mt-2">{pushError}</p>}
                {pushNeedsHomeScreen && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
                    <div className="flex gap-2 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 mb-4">
                      <Info className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-slate-300">{t('settings.push.iosWhy')}</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { icon: Share, text: t('settings.push.iosStep1') },
                        { icon: PlusSquare, text: t('settings.push.iosStep2') },
                        { icon: Smartphone, text: t('settings.push.iosStep3') },
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </div>
                          <step.icon className="w-4 h-4 text-slate-400 shrink-0" />
                          <p className="text-xs text-slate-600 dark:text-slate-300">{step.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{t('settings.email.title')}</div>
                      <div className="text-xs text-slate-500">{t('settings.email.description')}</div>
                    </div>
                  </div>
                  <Toggle checked={profile?.email_notifications_enabled ?? true} onChange={handleToggleEmail} />
                </div>
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{t('settings.notif.title')}</h3>
              {[
                { key: 'orders' as const, label: t('settings.notif.orders'), description: t('settings.notif.orders.desc') },
                { key: 'messages' as const, label: t('settings.notif.messages'), description: t('settings.notif.messages.desc') },
                { key: 'bids' as const, label: t('settings.notif.bids'), description: t('settings.notif.bids.desc') },
                { key: 'marketing' as const, label: t('settings.notif.marketing'), description: t('settings.notif.marketing.desc') },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
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
                  <button onClick={() => theme !== 'light' && toggleTheme()} className={`p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-[#232a3d]'}`}>
                    <Sun className="w-6 h-6 text-warning-500 mb-2" />
                    <div className="font-medium text-slate-900 dark:text-white text-sm">{t('settings.theme.light')}</div>
                  </button>
                  <button onClick={() => theme !== 'dark' && toggleTheme()} className={`p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-[#232a3d]'}`}>
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
                      className={`p-3 rounded-xl border-2 transition-all text-center ${language === lang.code ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-[#232a3d]'}`}
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
              <div className="p-4 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{t('settings.password')}</span>
                </div>

                {!showPasswordForm ? (
                  <button onClick={() => { setShowPasswordForm(true); setPwError(null); setPwSuccess(false); }} className="btn-secondary text-sm">{t('settings.changePassword')}</button>
                ) : pwSuccess ? (
                  <div className="flex items-center gap-2 text-sm text-success-600"><Check className="w-4 h-4" /> {t('auth.resetPassword.success')}</div>
                ) : (
                  <div className="space-y-3 max-w-sm animate-slide-down">
                    <div>
                      <label className="label">{t('auth.resetPassword.newPassword')}</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="input pl-10 pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">{t('auth.resetPassword.confirmPassword')}</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input pl-10" />
                      </div>
                    </div>
                    {pwError && (
                      <div className="px-3 py-2 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 text-sm rounded-xl">{pwError}</div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword(''); setPwError(null); }} className="btn-secondary text-sm">{t('settings.cancel')}</button>
                      <button onClick={handleChangePassword} disabled={pwSaving || !newPassword || !confirmPassword} className="btn-primary text-sm">
                        {pwSaving && <Spinner className="w-4 h-4" />}
                        {t('auth.resetPassword.save')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{t('settings.twoFactor')}</span>
                </div>

                {mfaLoading ? (
                  <Spinner className="w-4 h-4 text-brand-600" />
                ) : enrolling ? (
                  <div className="space-y-3 max-w-sm animate-slide-down">
                    {qrCode && (
                      <div className="bg-white p-3 rounded-xl inline-block">
                        <img src={qrCode} alt="QR" className="w-40 h-40" />
                      </div>
                    )}
                    {secret && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">{t('settings.mfa.manualCode')}</div>
                        <code className="text-xs font-mono bg-slate-100 dark:bg-[#161c2b] px-2 py-1 rounded break-all">{secret}</code>
                      </div>
                    )}
                    <div>
                      <label className="label">{t('settings.mfa.enterCode')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={mfaCode}
                        onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="input text-center text-xl tracking-[0.4em] font-mono"
                      />
                    </div>
                    {mfaError && (
                      <div className="px-3 py-2 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 text-sm rounded-xl">{mfaError}</div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handleCancelEnroll} className="btn-secondary text-sm">{t('settings.cancel')}</button>
                      <button onClick={handleVerifyEnroll} disabled={mfaSaving || mfaCode.length !== 6} className="btn-primary text-sm">
                        {mfaSaving && <Spinner className="w-4 h-4" />}
                        {t('settings.mfa.confirm')}
                      </button>
                    </div>
                  </div>
                ) : mfaEnabled ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-success-600"><ShieldCheck className="w-4 h-4" /> {t('settings.mfa.enabled')}</div>
                    <button onClick={() => handleDisableMfa(mfaFactors.find(f => f.status === 'verified')!.id)} className="btn-secondary text-sm text-error-600">
                      <X className="w-4 h-4" /> {t('settings.mfa.disable')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">{t('settings.mfa.hint')}</p>
                    <button onClick={handleStartEnroll} className="btn-secondary text-sm">{t('settings.enable2fa')}</button>
                    {mfaError && (
                      <div className="px-3 py-2 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 text-sm rounded-xl">{mfaError}</div>
                    )}
                  </div>
                )}
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
        </div>
      </div>
    </div>
  );
}
