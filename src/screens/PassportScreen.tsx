import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/format';
import { Avatar, Badge, Stars, Spinner } from '../components/ui';
import { AvatarUpload } from '../components/AvatarUpload';
import { IdentityVerificationModal } from '../components/IdentityVerificationModal';
import { CertificatesSection } from '../components/CertificatesSection';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { SOCIAL_PLATFORMS, normalizeSocialUrl } from '../lib/socialLinks';
import { SocialLinksPicker } from '../components/SocialLinksPicker';
import type { Gig, Review, IdentityVerification, SocialLinks } from '../lib/types';
import {
  ShieldCheck, Shield, Phone, Mail, MapPin, Globe, Award,
  CheckCircle, Clock, TrendingUp, Edit, Save, X,
  Briefcase, Hourglass, XCircle, Send
} from 'lucide-react';

const NEXWORK_TG = 'https://t.me/nexwork_uz';
const NEXWORK_PHONE = '+998200103133';

function useVerificationSteps() {
  return [
    { key: 'identity', label: t('passport.step.identity.label'), icon: ShieldCheck, description: t('passport.step.identity.description') },
    { key: 'skills', label: t('passport.step.skills.label'), icon: Award, description: t('passport.step.skills.description') },
    { key: 'payment', label: t('passport.step.payment.label'), icon: Briefcase, description: t('passport.step.payment.description') },
  ];
}

export function PassportScreen() {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const { language } = useTheme();
  void language;
  const VERIFICATION_STEPS = useVerificationSteps();
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
    social_links: profile?.social_links || {},
  });
  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');
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

  const startEditing = () => {
    setEditData({
      full_name: profile.full_name || '',
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      location: profile.location || '',
      phone: profile.phone || '',
      skills: profile.skills || [],
      languages: profile.languages || [],
      social_links: profile.social_links || {},
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const cleanedLinks: SocialLinks = {};
    for (const platform of SOCIAL_PLATFORMS) {
      const value = editData.social_links[platform.key];
      if (value && value.trim()) cleanedLinks[platform.key] = normalizeSocialUrl(value);
    }
    await updateProfile({ ...editData, social_links: cleanedLinks });
    setSaving(false);
    setEditing(false);
  };

  const setSocialLink = (key: keyof SocialLinks, value: string | undefined) => {
    const next = { ...editData.social_links };
    if (value === undefined) delete next[key];
    else next[key] = value;
    setEditData({ ...editData, social_links: next });
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
    if (s.key === 'identity') return profile.verification_level === 'identity' || profile.verification_level === 'full';
    if (s.key === 'skills') return profile.skills.length > 0;
    if (s.key === 'payment') return profile.balance > 0;
    return false;
  }).length / VERIFICATION_STEPS.length * 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('passport.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('passport.subtitle')}</p>
        </div>
        {!editing ? (
          <button onClick={startEditing} className="btn-secondary">
            <Edit className="w-4 h-4" /> {t('passport.edit')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary"><X className="w-4 h-4" /> {t('passport.cancel')}</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} {t('passport.save')}</button>
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
            <div className="relative shrink-0">
              <AvatarUpload size={96} />
              {profile.is_verified && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-brand-600 border-2 border-white dark:border-slate-900 flex items-center justify-center pointer-events-none">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 pt-2">
              {editing ? (
                <div className="space-y-2">
                  <input type="text" value={editData.display_name} onChange={e => setEditData({ ...editData, display_name: e.target.value })} placeholder={t('passport.displayName')} className="input" />
                  <input type="text" value={editData.full_name} onChange={e => setEditData({ ...editData, full_name: e.target.value })} placeholder={t('passport.fullName')} className="input" />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile.display_name || profile.full_name || t('passport.user')}</h2>
                  <p className="text-sm text-slate-500">{profile.email}</p>
                  {profile.public_id && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-400">ID:</span>
                      <code className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-100 dark:bg-[#161c2b] text-brand-600 dark:text-brand-400 rounded">{profile.public_id}</code>
                      <button
                        onClick={() => navigator.clipboard?.writeText(profile.public_id)}
                        className="text-xs text-brand-600 hover:text-brand-700"
                      >{t('passport.copy')}</button>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge color={profile.role === 'employer' ? 'purple' : 'blue'}>
                  {profile.role === 'employer' ? t('role.employer') : profile.role === 'admin' ? t('role.admin') : t('role.freelancer')}
                </Badge>
                {profile.is_verified && <Badge color="green"><Shield className="w-3 h-3" /> {t('passport.verified')}</Badge>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="text-center p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{profile.rating.toFixed(1)}</div>
              <Stars rating={profile.rating} size={12} />
              <div className="text-xs text-slate-500 mt-1">{profile.review_count} {t('passport.reviews')}</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{profile.completed_orders}</div>
              <CheckCircle className="w-4 h-4 text-success-600 mx-auto mt-1" />
              <div className="text-xs text-slate-500 mt-1">{t('passport.ordersCompleted')}</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{profile.response_rate}%</div>
              <TrendingUp className="w-4 h-4 text-brand-600 mx-auto mt-1" />
              <div className="text-xs text-slate-500 mt-1">{t('passport.responses')}</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{gigs.length}</div>
              <Briefcase className="w-4 h-4 text-accent-600 mx-auto mt-1" />
              <div className="text-xs text-slate-500 mt-1">{t('passport.activeGigs')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* About & Info */}
        <div className="card p-6 animate-slide-up">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">{t('passport.info')}</h3>
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="label">{t('passport.about')}</label>
                <textarea value={editData.bio} onChange={e => setEditData({ ...editData, bio: e.target.value })} rows={3} className="input" placeholder={t('passport.about.placeholder')} />
              </div>
              <div>
                <label className="label">{t('passport.location')}</label>
                <input type="text" value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })} className="input" placeholder={t('passport.location.placeholder')} />
              </div>
              <div>
                <label className="label">{t('passport.phone')}</label>
                <input type="tel" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="input" placeholder="+998..." />
              </div>
              <div>
                <label className="label">{t('passport.skills')}</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="input" placeholder={t('passport.skills.add')} />
                  <button onClick={addSkill} className="btn-secondary">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editData.skills.map(s => <span key={s} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{s}<button onClick={() => setEditData({ ...editData, skills: editData.skills.filter(x => x !== s) })} className="ml-1">×</button></span>)}
                </div>
              </div>
              <div>
                <label className="label">{t('passport.languages')}</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLang())} className="input" placeholder={t('passport.languages.add')} />
                  <button onClick={addLang} className="btn-secondary">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editData.languages.map(l => <span key={l} className="badge bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">{l}<button onClick={() => setEditData({ ...editData, languages: editData.languages.filter(x => x !== l) })} className="ml-1">×</button></span>)}
                </div>
              </div>
              <div>
                <label className="label">{t('passport.socialLinks')}</label>
                <SocialLinksPicker value={editData.social_links} onChange={setSocialLink} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {profile.bio && <div><p className="text-sm text-slate-600 dark:text-slate-400">{profile.bio}</p></div>}
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><MapPin className="w-4 h-4 text-slate-400" />{profile.location || t('passport.notSpecified')}</div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Mail className="w-4 h-4 text-slate-400" />{profile.email}</div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Phone className="w-4 h-4 text-slate-400" />{profile.phone || t('passport.notSpecified')}</div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Clock className="w-4 h-4 text-slate-400" />{t('passport.registration')}: {formatDate(profile.created_at)}</div>
              {profile.skills.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('passport.skills')}</p>
                  <div className="flex flex-wrap gap-2">{profile.skills.map(s => <Badge key={s} color="blue">{s}</Badge>)}</div>
                </div>
              )}
              {profile.languages.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('passport.languages')}</p>
                  <div className="flex flex-wrap gap-2">{profile.languages.map(l => <Badge key={l} color="cyan"><Globe className="w-3 h-3" />{l}</Badge>)}</div>
                </div>
              )}
              {SOCIAL_PLATFORMS.some(p => profile.social_links?.[p.key]) && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('passport.socialLinks')}</p>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_PLATFORMS.filter(p => profile.social_links?.[p.key]).map(platform => (
                      <a
                        key={platform.key}
                        href={profile.social_links[platform.key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={platform.label}
                        className={`w-9 h-9 rounded-xl ${platform.colorClass} flex items-center justify-center hover:opacity-80 transition-opacity`}
                      >
                        <platform.icon className="w-4 h-4 text-white" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verification */}
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">{t('passport.verification')}</h3>
            <Badge color={verificationPercent === 100 ? 'green' : 'amber'}>{Math.round(verificationPercent)}%</Badge>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-4">
            <div className="h-full bg-brand-600 rounded-full transition-all duration-500" style={{ width: `${verificationPercent}%` }} />
          </div>
          <div className="space-y-3">
            {VERIFICATION_STEPS.map(step => {
              const identityApproved = profile.verification_level === 'identity' || profile.verification_level === 'full';
              const identityPending = identityVerif?.status === 'pending';
              const identityRejected = identityVerif?.status === 'rejected';
              const skillsDone = profile.skills.length > 0;
              const paymentDone = profile.balance > 0;
              const done = (step.key === 'identity' && identityApproved) ||
                (step.key === 'skills' && skillsDone) ||
                (step.key === 'payment' && paymentDone);
              return (
                <div key={step.key} className={`flex items-center gap-3 p-3 rounded-xl ${done ? 'bg-success-50 dark:bg-success-900/20' : 'bg-slate-50 dark:bg-[#161c2b]/50'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${done ? 'bg-success-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {done ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{step.label}</div>
                    <div className="text-xs text-slate-500">{step.description}</div>
                    {step.key === 'identity' && identityPending && (
                      <div className="text-xs text-warning-600 flex items-center gap-1 mt-1"><Hourglass className="w-3 h-3" /> {t('passport.underReview')}</div>
                    )}
                    {step.key === 'identity' && identityRejected && identityVerif?.rejection_reason && (
                      <div className="text-xs text-error-600 flex items-center gap-1 mt-1"><XCircle className="w-3 h-3" /> {t('passport.rejected')}: {identityVerif.rejection_reason}</div>
                    )}
                  </div>
                  {!done && step.key === 'identity' && !identityPending && (
                    <button onClick={() => setShowIdentityModal(true)} className="btn-ghost text-xs">{t('passport.verify')}</button>
                  )}
                  {!done && step.key === 'identity' && identityPending && (
                    <Badge color="amber"><Hourglass className="w-3 h-3" /> {t('passport.pending')}</Badge>
                  )}
                  {!done && step.key === 'payment' && (
                    <span className="text-xs text-slate-400 shrink-0">{t('passport.notAvailable')}</span>
                  )}
                  {!done && step.key === 'skills' && (
                    <button className="btn-ghost text-xs">{t('passport.verify')}</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Certificates */}
      <CertificatesSection userId={profile.id} publicId={profile.public_id} />

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="card p-6 mt-6 animate-slide-up">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">{t('passport.recentReviews')}</h3>
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
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

      {/* Support */}
      <div className="card p-6 mt-6 animate-slide-up">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">{t('passport.support')}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <a
            href={NEXWORK_TG}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl hover:bg-slate-100 dark:hover:bg-[#161c2b] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">Telegram</div>
              <div className="text-xs text-slate-500">@nexwork_uz</div>
            </div>
          </a>
          <a
            href={`tel:${NEXWORK_PHONE}`}
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl hover:bg-slate-100 dark:hover:bg-[#161c2b] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{t('passport.phone')}</div>
              <div className="text-xs text-slate-500">{NEXWORK_PHONE}</div>
            </div>
          </a>
        </div>
      </div>

      <IdentityVerificationModal open={showIdentityModal} onClose={() => setShowIdentityModal(false)} onSubmitted={() => { setShowIdentityModal(false); refreshProfile?.(); }} existingVerif={identityVerif} />
    </div>
  );
}
