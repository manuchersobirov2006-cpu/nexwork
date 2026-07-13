import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/format';
import { Avatar, Badge, Stars, Spinner } from '../components/ui';
import { AvatarUpload } from '../components/AvatarUpload';
import { PhoneVerificationModal } from '../components/PhoneVerificationModal';
import { IdentityVerificationModal } from '../components/IdentityVerificationModal';
import type { Gig, Review, IdentityVerification } from '../lib/types';
import {
  ShieldCheck, Shield, Phone, Mail, MapPin, Globe, Award,
  CheckCircle, Clock, TrendingUp, Edit, Save, X,
  Briefcase, Zap, Hourglass, XCircle
} from 'lucide-react';

const VERIFICATION_STEPS = [
  { key: 'phone', label: 'Телефон', icon: Phone, description: 'Подтвердите номер телефона' },
  { key: 'identity', label: 'Личность', icon: ShieldCheck, description: 'Загрузите документ, удостоверяющий личность' },
  { key: 'skills', label: 'Навыки', icon: Award, description: 'Пройдите тестирование по навыкам' },
  { key: 'payment', label: 'Платёжные данные', icon: Briefcase, description: 'Привяжите счёт для вывода средств' },
];

export function PassportScreen() {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editData, setEditData] = useState({
    full_name: profile?.full_name || '',
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    phone: profile?.phone || '',
    skills: profile?.skills || [],
    languages: profile?.languages || [],
  });
  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityVerif, setIdentityVerif] = useState<IdentityVerification | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from('gigs').select('*').eq('seller_id', profile.id).eq('status', 'active').then(({ data }) => {
      if (data) setGigs(data as Gig[]);
    });
    supabase.from('reviews').select('*, reviewer:reviewer_id(*)').eq('reviewee_id', profile.id).order('created_at', { ascending: false }).limit(5).then(({ data }) => {
      if (data) setReviews(data as Review[]);
    });
    supabase.from('identity_verifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      if (data) setIdentityVerif(data as IdentityVerification);
    });
  }, [profile]);

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    await updateProfile(editData);
    setSaving(false);
    setEditing(false);
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !editData.skills.includes(s)) setEditData({ ...editData, skills: [...editData.skills, s] });
    setSkillInput('');
  };

  const addLang = () => {
    const l = langInput.trim();
    if (l && !editData.languages.includes(l)) setEditData({ ...editData, languages: [...editData.languages, l] });
    setLangInput('');
  };

  const verificationPercent = VERIFICATION_STEPS.filter(s => {
    if (s.key === 'phone') return profile.verification_level === 'phone' || profile.verification_level === 'identity' || profile.verification_level === 'full' || !!profile.phone;
    if (s.key === 'identity') return profile.verification_level === 'identity' || profile.verification_level === 'full';
    if (s.key === 'skills') return profile.skills.length > 0;
    if (s.key === 'payment') return profile.balance > 0;
    return false;
  }).length / VERIFICATION_STEPS.length * 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Цифровой паспорт</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ваш профиль и верификация</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary">
            <Edit className="w-4 h-4" /> Редактировать
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Сохранить</button>
          </div>
        )}
      </div>

      {/* Passport card */}
      <div className="card overflow-hidden mb-6 animate-slide-up">
        <div className="h-32 bg-gradient-to-r from-brand-600 to-accent-500 relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="px-6 pb-6 -mt-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-4">
            <AvatarUpload size={96} />
            <div className="relative">
              {profile.is_verified && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-brand-600 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 pt-2">
              {editing ? (
                <div className="space-y-2">
                  <input type="text" value={editData.display_name} onChange={e => setEditData({ ...editData, display_name: e.target.value })} placeholder="Отображаемое имя" className="input" />
                  <input type="text" value={editData.full_name} onChange={e => setEditData({ ...editData, full_name: e.target.value })} placeholder="Полное имя" className="input" />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile.display_name || profile.full_name || 'Пользователь'}</h2>
                  <p className="text-sm text-slate-500">{profile.email}</p>
                  {profile.public_id && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-400">ID:</span>
                      <code className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 rounded">{profile.public_id}</code>
                      <button
                        onClick={() => navigator.clipboard?.writeText(profile.public_id)}
                        className="text-xs text-brand-600 hover:text-brand-700"
                      >Копировать</button>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge color={profile.role === 'employer' ? 'purple' : 'blue'}>
                  {profile.role === 'employer' ? 'Заказчик' : profile.role === 'admin' ? 'Админ' : 'Фрилансер'}
                </Badge>
                {profile.is_premium && <Badge color="amber"><Zap className="w-3 h-3" /> Premium</Badge>}
                {profile.is_verified && <Badge color="green"><Shield className="w-3 h-3" /> Проверен</Badge>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{profile.rating.toFixed(1)}</div>
              <Stars rating={profile.rating} size={12} />
              <div className="text-xs text-slate-500 mt-1">{profile.review_count} отзывов</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{profile.completed_orders}</div>
              <CheckCircle className="w-4 h-4 text-success-600 mx-auto mt-1" />
              <div className="text-xs text-slate-500 mt-1">Заказов выполнено</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{profile.response_rate}%</div>
              <TrendingUp className="w-4 h-4 text-brand-600 mx-auto mt-1" />
              <div className="text-xs text-slate-500 mt-1">Откликов</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{gigs.length}</div>
              <Briefcase className="w-4 h-4 text-accent-600 mx-auto mt-1" />
              <div className="text-xs text-slate-500 mt-1">Активных услуг</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* About & Info */}
        <div className="card p-6 animate-slide-up">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Информация</h3>
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="label">О себе</label>
                <textarea value={editData.bio} onChange={e => setEditData({ ...editData, bio: e.target.value })} rows={3} className="input" placeholder="Расскажите о себе..." />
              </div>
              <div>
                <label className="label">Местоположение</label>
                <input type="text" value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })} className="input" placeholder="Город, страна" />
              </div>
              <div>
                <label className="label">Телефон</label>
                <input type="tel" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="input" placeholder="+998..." />
              </div>
              <div>
                <label className="label">Навыки</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="input" placeholder="Добавить навык" />
                  <button onClick={addSkill} className="btn-secondary">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editData.skills.map(s => <span key={s} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{s}<button onClick={() => setEditData({ ...editData, skills: editData.skills.filter(x => x !== s) })} className="ml-1">×</button></span>)}
                </div>
              </div>
              <div>
                <label className="label">Языки</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLang())} className="input" placeholder="Добавить язык" />
                  <button onClick={addLang} className="btn-secondary">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editData.languages.map(l => <span key={l} className="badge bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">{l}<button onClick={() => setEditData({ ...editData, languages: editData.languages.filter(x => x !== l) })} className="ml-1">×</button></span>)}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {profile.bio && <div><p className="text-sm text-slate-600 dark:text-slate-400">{profile.bio}</p></div>}
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><MapPin className="w-4 h-4 text-slate-400" />{profile.location || 'Не указано'}</div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Mail className="w-4 h-4 text-slate-400" />{profile.email}</div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Phone className="w-4 h-4 text-slate-400" />{profile.phone || 'Не указано'}</div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Clock className="w-4 h-4 text-slate-400" />Регистрация: {formatDate(profile.created_at)}</div>
              {profile.skills.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Навыки</p>
                  <div className="flex flex-wrap gap-2">{profile.skills.map(s => <Badge key={s} color="blue">{s}</Badge>)}</div>
                </div>
              )}
              {profile.languages.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Языки</p>
                  <div className="flex flex-wrap gap-2">{profile.languages.map(l => <Badge key={l} color="cyan"><Globe className="w-3 h-3" />{l}</Badge>)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verification */}
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Верификация</h3>
            <Badge color={verificationPercent === 100 ? 'green' : 'amber'}>{Math.round(verificationPercent)}%</Badge>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-4">
            <div className="h-full bg-brand-600 rounded-full transition-all duration-500" style={{ width: `${verificationPercent}%` }} />
          </div>
          <div className="space-y-3">
            {VERIFICATION_STEPS.map(step => {
              const phoneDone = profile.verification_level === 'phone' || profile.verification_level === 'identity' || profile.verification_level === 'full' || (!!profile.phone && profile.verification_level !== 'none');
              const identityApproved = profile.verification_level === 'identity' || profile.verification_level === 'full';
              const identityPending = identityVerif?.status === 'pending';
              const identityRejected = identityVerif?.status === 'rejected';
              const skillsDone = profile.skills.length > 0;
              const paymentDone = profile.balance > 0;
              const done = (step.key === 'phone' && phoneDone) ||
                (step.key === 'identity' && identityApproved) ||
                (step.key === 'skills' && skillsDone) ||
                (step.key === 'payment' && paymentDone);
              return (
                <div key={step.key} className={`flex items-center gap-3 p-3 rounded-xl ${done ? 'bg-success-50 dark:bg-success-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${done ? 'bg-success-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {done ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{step.label}</div>
                    <div className="text-xs text-slate-500">{step.description}</div>
                    {step.key === 'identity' && identityPending && (
                      <div className="text-xs text-warning-600 flex items-center gap-1 mt-1"><Hourglass className="w-3 h-3" /> На рассмотрении</div>
                    )}
                    {step.key === 'identity' && identityRejected && identityVerif?.rejection_reason && (
                      <div className="text-xs text-error-600 flex items-center gap-1 mt-1"><XCircle className="w-3 h-3" /> Отклонено: {identityVerif.rejection_reason}</div>
                    )}
                  </div>
                  {!done && step.key === 'phone' && (
                    <button onClick={() => setShowPhoneModal(true)} className="btn-ghost text-xs">Подтвердить</button>
                  )}
                  {!done && step.key === 'identity' && !identityPending && (
                    <button onClick={() => setShowIdentityModal(true)} className="btn-ghost text-xs">Подтвердить</button>
                  )}
                  {!done && step.key === 'identity' && identityPending && (
                    <Badge color="amber"><Hourglass className="w-3 h-3" /> Ожидает</Badge>
                  )}
                  {!done && step.key !== 'phone' && step.key !== 'identity' && (
                    <button className="btn-ghost text-xs">Подтвердить</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="card p-6 mt-6 animate-slide-up">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Последние отзывы</h3>
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <Avatar src={(r.reviewer as any)?.avatar_url ?? undefined} name={(r.reviewer as any)?.display_name || (r.reviewer as any)?.email} size={36} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">{(r.reviewer as any)?.display_name || (r.reviewer as any)?.full_name}</span>
                    <Stars rating={r.rating} size={12} />
                  </div>
                  {r.comment && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{r.comment}</p>}
                  <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PhoneVerificationModal open={showPhoneModal} onClose={() => setShowPhoneModal(false)} onVerified={() => { setShowPhoneModal(false); refreshProfile?.(); }} />
      <IdentityVerificationModal open={showIdentityModal} onClose={() => setShowIdentityModal(false)} onSubmitted={() => { setShowIdentityModal(false); refreshProfile?.(); }} existingVerif={identityVerif} />
    </div>
  );
}
