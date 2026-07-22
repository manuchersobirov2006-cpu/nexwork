import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { CATEGORIES, COMPANY_SIZES, JOB_TYPE_LABELS, pexelsImage, getAvatarUrl } from '../lib/constants';
import { formatPrice, timeAgo } from '../lib/format';
import { Avatar, Badge, Modal, EmptyState, SkeletonCard, Spinner } from '../components/ui';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { needsIdentityVerification } from '../lib/verification';
import { VerificationRequiredNotice } from '../components/VerificationRequiredNotice';
import { translateText } from '../lib/translate';
import { sendJobApplicationMessage, setJobApplicationStatus } from '../lib/applications';
import { UserProfileModal } from '../components/UserProfileModal';
import { SOCIAL_PLATFORMS, normalizeSocialUrl } from '../lib/socialLinks';
import { SocialLinksPicker } from '../components/SocialLinksPicker';
import type { Company, Job, JobApplication, Profile, SocialLinks } from '../lib/types';
import {
  Building2, Plus, MapPin, Globe, Users, Search,
  Briefcase, Eye, Check, ExternalLink, Send, UserCheck, X, AlertCircle, Wallet, Languages,
  Paperclip, FileText, Trash2, Phone, Edit, CheckCircle,
} from 'lucide-react';

const RESUME_MAX_SIZE = 10 * 1024 * 1024;
const RESUME_ACCEPT = '.pdf,.doc,.docx';

const COMPANY_LOGOS = [
  pexelsImage(3184465, 80, 80), pexelsImage(1966452, 80, 80), pexelsImage(3184292, 80, 80),
  pexelsImage(270404, 80, 80), pexelsImage(1181244, 80, 80), pexelsImage(267350, 80, 80),
];

type Tab = 'jobs' | 'companies' | 'applicants';

export function CompaniesScreen() {
  const { profile } = useAuth();
  const { language } = useTheme();
  const jobTypeLabel = (key: string) => { const v = JOB_TYPE_LABELS[key]; if (!v) return key; return language === 'en' ? v.en : language === 'uz' ? v.uz : v.ru; };
  const catLabel = (key: string) => { const c = CATEGORIES.find(c => c.key === key); if (!c) return key; return language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label; };
  const [tab, setTab] = useState<Tab>('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (tab === 'jobs') {
      let query = supabase.from('jobs').select('*, employer:employer_id(*)').eq('status', 'active');
      if (category !== 'all') query = query.eq('category', category);
      if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      const { data } = await query.order('created_at', { ascending: false }).limit(50);
      if (data) setJobs(data as Job[]);
    } else {
      let query = supabase.from('companies').select('*');
      if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      const { data } = await query.order('created_at', { ascending: false }).limit(50);
      if (data) setCompanies(data as Company[]);
    }
    setLoading(false);
  }, [tab, search, category]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('companies.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('companies.subtitle')}</p>
        </div>
        {profile?.role === 'employer' && (
          <div className="flex gap-2">
            <button onClick={() => setShowCreateJob(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> {t('companies.jobBtn')}
            </button>
            <button onClick={() => setShowCreateCompany(true)} className="btn-secondary">
              <Plus className="w-4 h-4" /> {t('companies.companyBtn')}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-slate-100 dark:bg-[#161c2b] rounded-xl w-fit">
        <button onClick={() => setTab('jobs')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'jobs' ? 'bg-white dark:bg-[#10141f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
          <Briefcase className="w-4 h-4 inline mr-1.5" /> {t('companies.tab.jobs')}
        </button>
        <button onClick={() => setTab('companies')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'companies' ? 'bg-white dark:bg-[#10141f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
          <Building2 className="w-4 h-4 inline mr-1.5" /> {t('companies.tab.companies')}
        </button>
        {profile?.role === 'employer' && (
          <button onClick={() => setTab('applicants')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'applicants' ? 'bg-white dark:bg-[#10141f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
            <UserCheck className="w-4 h-4 inline mr-1.5" /> {t('companies.tab.applicants')}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'jobs' ? t('companies.searchJobs') : t('companies.searchCompanies')} className="input pl-10" />
          </div>
          {tab === 'jobs' && (
            <select value={category} onChange={e => setCategory(e.target.value)} className="input sm:w-48">
              <option value="all">{t('companies.allCategories')}</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{catLabel(c.key)}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tab === 'jobs' ? (
        jobs.length === 0 ? (
          <EmptyState icon={Briefcase} title={t('companies.noJobs.title')} description={t('companies.noJobs.description')} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {jobs.map((job) => {
              const employer = job.employer as unknown as Profile | undefined;
              return (
                <div key={job.id} className="card p-5 hover:shadow-card-hover transition-all cursor-pointer animate-fade-in" onClick={() => setSelectedJob(job)}>
                  <div className="flex items-start gap-3 mb-3">
                    <img src={getAvatarUrl(employer || {})} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{job.title}</h3>
                      <p className="text-sm text-slate-500">{employer?.display_name || employer?.full_name}</p>
                    </div>
                    {job.is_remote && <Badge color="cyan">{t('companies.remote')}</Badge>}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{job.description}</p>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mb-3">
                    {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{jobTypeLabel(job.job_type)}</span>
                    {(job.salary_min || job.salary_max) && (
                      <span className="flex items-center gap-1 font-medium text-success-600">
                        {job.salary_min && job.salary_max ? `${formatPrice(job.salary_min, job.currency)}—${formatPrice(job.salary_max, job.currency)}` : formatPrice(job.salary_min || job.salary_max || 0, job.currency)}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{job.views}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#232a3d]">
                    <div className="flex gap-1">
                      {job.skills_required.slice(0, 3).map(s => <Badge key={s} color="slate" className="!text-[10px]">{s}</Badge>)}
                    </div>
                    <span className="text-xs text-slate-400">{timeAgo(job.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        companies.length === 0 ? (
          <EmptyState icon={Building2} title={t('companies.noCompanies.title')} description={t('companies.noCompanies.description')} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company, i) => {
              const logo = COMPANY_LOGOS[i % COMPANY_LOGOS.length];
              return (
                <div key={company.id} className="card p-5 hover:shadow-card-hover transition-all animate-fade-in">
                  <div className="flex items-start gap-3 mb-3">
                    <img src={company.logo_url || logo} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        {company.name}
                        {company.is_verified && <Check className="w-4 h-4 text-brand-500" />}
                      </h3>
                      <p className="text-sm text-slate-500">{company.industry || t('companies.company')}</p>
                    </div>
                  </div>
                  {company.description && <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{company.description}</p>}
                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mb-3">
                    {company.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{company.location}</span>}
                    {company.size && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{company.size}</span>}
                  </div>
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
                      <Globe className="w-4 h-4" /> {company.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'applicants' && <ApplicantsView />}

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onApplied={loadData} />}
      {showCreateJob && <CreateJobModal onClose={() => setShowCreateJob(false)} onCreated={() => { setShowCreateJob(false); loadData(); }} />}
      {showCreateCompany && <CreateCompanyModal onClose={() => setShowCreateCompany(false)} onCreated={() => { setShowCreateCompany(false); loadData(); }} />}
    </div>
  );
}

function ApplicantsView() {
  const [applications, setApplications] = useState<(JobApplication & { applicant?: Profile; job?: Job })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('job_applications')
      .select('*, applicant:applicant_id(*), job:job_id(*)')
      .order('created_at', { ascending: false });
    if (data) setApplications(data as (JobApplication & { applicant?: Profile; job?: Job })[]);
    setLoading(false);
  };

  const handleStatusChange = async (appId: string, status: 'accepted' | 'rejected') => {
    await setJobApplicationStatus(appId, status);
    const app = applications.find(a => a.id === appId);
    if (app?.applicant_id) {
      await supabase.from('notifications').insert({
        user_id: app.applicant_id, type: 'job',
        title: status === 'accepted' ? t('companies.youAccepted.title') : t('companies.youRejected.title'),
        body: `${t('companies.applicationStatus')} «${app.job?.title || t('companies.vacancy')}»: ${status === 'accepted' ? t('companies.status.accepted') : t('companies.status.rejected')}`,
      });
    }
    load();
  };

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'accepted', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-[#161c2b] text-slate-600'}`}>
            {f === 'all' ? t('companies.filter.all') : f === 'pending' ? t('companies.filter.pending') : f === 'accepted' ? t('companies.filter.accepted') : t('companies.filter.rejected')}
            {f !== 'all' && <span className="ml-1 text-xs opacity-70">({applications.filter(a => a.status === f).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UserCheck} title={t('companies.noApplicants.title')} description={t('companies.noApplicants.description')} />
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <div key={app.id} className="card p-4 flex items-center gap-3">
              <Avatar src={app.applicant?.avatar_url ?? undefined} name={app.applicant?.display_name || app.applicant?.email} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-white truncate">{app.applicant?.display_name || app.applicant?.full_name}</div>
                <div className="text-xs text-slate-500 truncate">{t('companies.appliedTo')} {app.job?.title}</div>
                {app.cover_letter && <div className="text-xs text-slate-400 mt-1 line-clamp-2">{app.cover_letter}</div>}
                {app.resume_url && (
                  <a href={app.resume_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-1">
                    <FileText className="w-3 h-3" /> {t('companies.resume')}
                  </a>
                )}
                <div className="text-[10px] text-slate-400 mt-0.5">{timeAgo(app.created_at)}</div>
              </div>
              <Badge color={app.status === 'pending' ? 'amber' : app.status === 'accepted' ? 'green' : app.status === 'rejected' ? 'red' : 'slate'}>
                {app.status === 'pending' ? t('companies.status.pending') : app.status === 'accepted' ? t('companies.status.accepted') : app.status === 'rejected' ? t('companies.status.rejected') : t('companies.status.withdrawn')}
              </Badge>
              <div className="flex gap-1">
                <button onClick={() => setViewingProfileId(app.applicant_id)} className="btn-ghost !p-1.5" title={t('companies.viewApplicant')}><Eye className="w-4 h-4" /></button>
                {app.status === 'pending' && (
                  <>
                    <button onClick={() => handleStatusChange(app.id, 'accepted')} className="btn-ghost !p-1.5 text-success-600" title={t('companies.accept')}><Check className="w-4 h-4" /></button>
                    <button onClick={() => handleStatusChange(app.id, 'rejected')} className="btn-ghost !p-1.5 text-error-600" title={t('companies.reject')}><X className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingProfileId && <UserProfileModal userId={viewingProfileId} onClose={() => setViewingProfileId(null)} />}
    </div>
  );
}

function JobDetailModal({ job, onClose, onApplied }: { job: Job; onClose: () => void; onApplied?: () => void }) {
  const { profile } = useAuth();
  const employer = job.employer as unknown as Profile | undefined;
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingApp, setExistingApp] = useState<JobApplication | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', job.id)
      .eq('applicant_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setExistingApp(data as JobApplication); setApplied(true); }
      });
  }, [profile, job.id]);

  const handleResumeSelect = (file: File | null) => {
    setResumeError(null);
    if (!file) { setResumeFile(null); return; }
    if (!/\.(pdf|docx?|PDF|DOCX?)$/.test(file.name)) {
      setResumeError(t('companies.resume.badFormat'));
      return;
    }
    if (file.size > RESUME_MAX_SIZE) {
      setResumeError(t('companies.resume.tooLarge'));
      return;
    }
    setResumeFile(file);
  };

  const handleApply = async () => {
    if (!profile || profile.role !== 'freelancer' || needsIdentityVerification(profile)) return;
    setApplying(true);
    setError(null);

    let resumeUrl: string | null = null;
    if (resumeFile) {
      const ext = resumeFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const path = `${profile.id}/${job.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(path, resumeFile, { upsert: false, contentType: resumeFile.type });
      if (uploadError) {
        setError(t('companies.resume.uploadError'));
        setApplying(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(path);
      resumeUrl = urlData.publicUrl;
    }

    const { data, error: insertError } = await supabase.from('job_applications').insert({
      job_id: job.id,
      applicant_id: profile.id,
      cover_letter: coverLetter || null,
      resume_url: resumeUrl,
    }).select().single();

    if (insertError) {
      if (insertError.code === '23505') {
        setError(t('companies.alreadyApplied'));
        setApplied(true);
      } else {
        setError(insertError.message);
      }
    } else if (data) {
      const application = data as JobApplication;
      setApplied(true);
      setExistingApp(application);
      await supabase.from('notifications').insert({
        user_id: job.employer_id, type: 'job',
        title: t('companies.newApplication.title'),
        body: `${t('companies.newApplication.body')} «${job.title}»`,
        link: 'applicants',
      });
      await sendJobApplicationMessage({
        application_id: application.id,
        job_id: job.id,
        job_title: job.title,
        employer_id: job.employer_id,
        applicant_id: profile.id,
        cover_letter: coverLetter || null,
        resume_url: resumeUrl,
      }, `${t('companies.newApplication.body')} «${job.title}»`);
      await supabase.from('jobs').update({ applicants_count: job.applicants_count + 1 }).eq('id', job.id);
      onApplied?.();
    }
    setApplying(false);
  };

  const handleWithdraw = async () => {
    if (!existingApp) return;
    setApplying(true);
    const { error: withdrawError } = await supabase.from('job_applications')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', existingApp.id);
    if (!withdrawError) {
      setApplied(false);
      setExistingApp(null);
      onApplied?.();
    }
    setApplying(false);
  };

  const isOwnJob = profile?.id === job.employer_id;
  const [deleting, setDeleting] = useState(false);
  const [showEditJob, setShowEditJob] = useState(false);
  const [markingFilled, setMarkingFilled] = useState(false);

  const handleMarkFilled = async () => {
    if (!window.confirm(t('companies.markFilledConfirm'))) return;
    setMarkingFilled(true);
    const { error: fillError } = await supabase.from('jobs').update({ status: 'filled' }).eq('id', job.id);
    setMarkingFilled(false);
    if (!fillError) {
      onApplied?.();
      onClose();
    }
  };

  const handleDeleteJob = async () => {
    if (!window.confirm(t('companies.deleteJobConfirm'))) return;
    setDeleting(true);
    const { error: deleteError } = await supabase.from('jobs').delete().eq('id', job.id);
    setDeleting(false);
    if (!deleteError) {
      onApplied?.();
      onClose();
    }
  };

  const { language } = useTheme();
  const jobTypeLabel = (key: string) => { const v = JOB_TYPE_LABELS[key]; if (!v) return key; return language === 'en' ? v.en : language === 'uz' ? v.uz : v.ru; };

  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const handleTranslate = async () => {
    setTranslating(true);
    setTranslateError(null);
    try {
      const [tTitle, tDescription] = await Promise.all([
        translateText(job.title, language),
        translateText(job.description, language),
      ]);
      setTranslatedTitle(tTitle);
      setTranslatedDescription(tDescription);
    } catch {
      setTranslateError(t('board.translateError'));
    }
    setTranslating(false);
  };

  const displayTitle = translatedTitle ?? job.title;
  const displayDescription = translatedDescription ?? job.description;

  return (
    <Modal open onClose={onClose} size="lg" title={displayTitle}>
      <div className="p-6">
        <button onClick={() => employer && setViewingProfileId(employer.id)} className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity text-left">
          <Avatar src={employer?.avatar_url ?? undefined} name={employer?.display_name || employer?.email} size={44} />
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{employer?.display_name || employer?.full_name}</div>
            <div className="text-xs text-slate-500">{timeAgo(job.created_at)}</div>
          </div>
        </button>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {job.location && <div className="card p-3 text-center"><MapPin className="w-5 h-5 text-brand-600 mx-auto mb-1" /><div className="text-xs text-slate-500">{t('companies.location')}</div><div className="font-bold text-slate-900 dark:text-white text-sm">{job.location}</div></div>}
          <div className="card p-3 text-center"><Briefcase className="w-5 h-5 text-brand-600 mx-auto mb-1" /><div className="text-xs text-slate-500">{t('companies.type')}</div><div className="font-bold text-slate-900 dark:text-white text-sm">{jobTypeLabel(job.job_type)}</div></div>
          {(job.salary_min || job.salary_max) && <div className="card p-3 text-center"><Wallet className="w-5 h-5 text-success-600 mx-auto mb-1" /><div className="text-xs text-slate-500">{t('companies.salary')}</div><div className="font-bold text-slate-900 dark:text-white text-sm">{job.salary_min && job.salary_max ? `${formatPrice(job.salary_min, job.currency)}—${formatPrice(job.salary_max, job.currency)}` : formatPrice(job.salary_min || job.salary_max || 0, job.currency)}</div></div>}
          <div className="card p-3 text-center"><Eye className="w-5 h-5 text-brand-600 mx-auto mb-1" /><div className="text-xs text-slate-500">{t('companies.views')}</div><div className="font-bold text-slate-900 dark:text-white text-sm">{job.views}</div></div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-slate-900 dark:text-white">{t('companies.description')}</h4>
          {translatedDescription ? (
            <button onClick={() => { setTranslatedTitle(null); setTranslatedDescription(null); }} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              <Languages className="w-3.5 h-3.5" /> {t('board.showOriginal')}
            </button>
          ) : (
            <button onClick={handleTranslate} disabled={translating} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              {translating ? <Spinner className="w-3.5 h-3.5" /> : <Languages className="w-3.5 h-3.5" />} {t('board.translate')}
            </button>
          )}
        </div>
        {translateError && <p className="text-xs text-error-600 mb-2">{translateError}</p>}
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap mb-4">{displayDescription}</p>
        {job.skills_required.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{t('companies.requiredSkills')}</h4>
            <div className="flex flex-wrap gap-2">{job.skills_required.map(s => <Badge key={s} color="slate">{s}</Badge>)}</div>
          </div>
        )}

        {(job.contact_phone || SOCIAL_PLATFORMS.some(p => job.social_links?.[p.key])) && (
          <div className="mb-4">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{t('companies.contacts')}</h4>
            <div className="flex flex-wrap items-center gap-2">
              {job.contact_phone && (
                <a
                  href={`tel:${job.contact_phone}`}
                  className="flex items-center gap-2 px-3 py-2 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 rounded-xl text-sm font-medium hover:bg-success-100 dark:hover:bg-success-900/30 transition-colors"
                >
                  <Phone className="w-4 h-4" /> {job.contact_phone}
                </a>
              )}
              {SOCIAL_PLATFORMS.filter(p => job.social_links?.[p.key]).map(platform => (
                <a
                  key={platform.key}
                  href={job.social_links[platform.key]}
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

        {!isOwnJob && !applied && profile?.role === 'freelancer' && (
          <div className="border-t border-slate-200 dark:border-[#232a3d] pt-4 space-y-3">
            {needsIdentityVerification(profile) ? (
              <VerificationRequiredNotice messageKey="verify.required.apply" />
            ) : (
              <>
                <div>
                  <label className="label">{t('companies.coverLetter')}</label>
                  <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={4} placeholder={t('companies.coverLetter.placeholder')} className="input" />
                </div>
                <div>
                  <label className="label">{t('companies.resume')}</label>
                  {resumeFile ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#161c2b]/50 rounded-xl">
                      <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{resumeFile.name}</span>
                      <button type="button" onClick={() => setResumeFile(null)} className="btn-ghost !p-1"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 dark:border-[#232a3d] rounded-xl cursor-pointer hover:border-brand-400 transition-colors">
                      <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-500">{t('companies.resume.attach')}</span>
                      <input type="file" accept={RESUME_ACCEPT} className="hidden" onChange={e => handleResumeSelect(e.target.files?.[0] ?? null)} />
                    </label>
                  )}
                  {resumeError && <p className="text-xs text-error-600 mt-1">{resumeError}</p>}
                </div>
                {error && (
                  <div className="px-3 py-2 bg-error-50 dark:bg-error-900/20 text-error-700 text-sm rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}
                <button onClick={handleApply} disabled={applying} className="btn-primary w-full">
                  {applying ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {t('companies.apply')}
                </button>
              </>
            )}
          </div>
        )}

        {!isOwnJob && applied && existingApp?.status !== 'withdrawn' && (
          <div className="border-t border-slate-200 dark:border-[#232a3d] pt-4">
            <div className="px-4 py-3 bg-success-50 dark:bg-success-900/20 rounded-xl flex items-center gap-3">
              <Check className="w-5 h-5 text-success-600" />
              <div className="flex-1">
                <div className="font-medium text-success-700 dark:text-success-300">{t('companies.appliedToJob')}</div>
                <div className="text-xs text-slate-500">{t('companies.status')}: {existingApp?.status === 'pending' ? t('companies.underReview') : existingApp?.status}</div>
              </div>
              <button onClick={handleWithdraw} disabled={applying} className="btn-secondary !py-1.5 text-xs">{t('companies.withdraw')}</button>
            </div>
          </div>
        )}

        {isOwnJob && (
          <div className="border-t border-slate-200 dark:border-[#232a3d] pt-4 space-y-3">
            <div className="px-4 py-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-brand-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {job.status === 'filled' ? t('companies.jobFilledNotice') : t('companies.ownJobNotice')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowEditJob(true)} className="btn-secondary w-full">
                <Edit className="w-4 h-4" />
                {t('companies.editJob')}
              </button>
              {job.status === 'active' && (
                <button onClick={handleMarkFilled} disabled={markingFilled} className="btn-primary w-full">
                  {markingFilled ? <Spinner className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  {t('companies.markFilled')}
                </button>
              )}
            </div>
            <button onClick={handleDeleteJob} disabled={deleting} className="btn-danger w-full">
              {deleting ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              {t('companies.deleteJob')}
            </button>
          </div>
        )}
      </div>

      {viewingProfileId && <UserProfileModal userId={viewingProfileId} onClose={() => setViewingProfileId(null)} />}
      {showEditJob && (
        <EditJobModal
          job={job}
          onClose={() => setShowEditJob(false)}
          onSaved={() => { setShowEditJob(false); onApplied?.(); onClose(); }}
        />
      )}
    </Modal>
  );
}

function CreateJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('development');
  const [jobType, setJobType] = useState('full_time');
  const [salaryMin, setSalaryMin] = useState(500);
  const [salaryMax, setSalaryMax] = useState(2000);
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [socialLinks, setSocialLinksState] = useState<SocialLinks>({});
  const [saving, setSaving] = useState(false);

  const addSkill = () => { const s = skillInput.trim(); if (s && !skills.includes(s)) setSkills([...skills, s]); setSkillInput(''); };
  const setSocialLink = (key: keyof SocialLinks, value: string | undefined) => setSocialLinksState(prev => { const next = { ...prev }; if (value === undefined) delete next[key]; else next[key] = value; return next; });
  const { language } = useTheme();

  const handleCreate = async () => {
    if (!profile || profile.role !== 'employer' || !title || !description) return;
    setSaving(true);
    const cleanedLinks: SocialLinks = {};
    for (const platform of SOCIAL_PLATFORMS) {
      const value = socialLinks[platform.key];
      if (value?.trim()) cleanedLinks[platform.key] = normalizeSocialUrl(value);
    }
    await supabase.from('jobs').insert({
      employer_id: profile.id,
      title, description, category,
      job_type: jobType,
      salary_min: salaryMin, salary_max: salaryMax, currency,
      location: location || null, is_remote: isRemote,
      skills_required: skills, status: 'active',
      contact_phone: contactPhone.trim() || null,
      social_links: cleanedLinks,
    });
    setSaving(false);
    onCreated();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={t('companies.newJob')}>
      <div className="p-6 space-y-4">
        <div><label className="label">{t('companies.position')}</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('companies.position.placeholder')} className="input" /></div>
        <div><label className="label">{t('companies.description')}</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder={t('companies.jobDescription.placeholder')} className="input" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">{t('companies.category')}</label><select value={category} onChange={e => setCategory(e.target.value)} className="input">{CATEGORIES.map(c => <option key={c.key} value={c.key}>{language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label}</option>)}</select></div>
          <div><label className="label">{t('companies.employmentType')}</label><select value={jobType} onChange={e => setJobType(e.target.value)} className="input">{Object.entries(JOB_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{language === 'en' ? v.en : language === 'uz' ? v.uz : v.ru}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="label">{t('companies.salaryFrom')}</label><input type="number" value={salaryMin} onChange={e => setSalaryMin(Number(e.target.value))} className="input" /></div>
          <div><label className="label">{t('companies.salaryTo')}</label><input type="number" value={salaryMax} onChange={e => setSalaryMax(Number(e.target.value))} className="input" /></div>
          <div><label className="label">{t('companies.currency')}</label><select value={currency} onChange={e => setCurrency(e.target.value as 'UZS' | 'USD')} className="input"><option value="UZS">UZS</option><option value="USD">USD</option></select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">{t('companies.city')}</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder={t('companies.city')} className="input" /></div>
          <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isRemote} onChange={e => setIsRemote(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm text-slate-700 dark:text-slate-300">{t('companies.remoteWork')}</span></label></div>
        </div>
        <div>
          <label className="label">{t('companies.skills')}</label>
          <div className="flex gap-2 mb-2"><input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="input" /><button onClick={addSkill} className="btn-secondary">+</button></div>
          <div className="flex flex-wrap gap-2">{skills.map(s => <span key={s} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{s}<button onClick={() => setSkills(skills.filter(x => x !== s))} className="ml-1">×</button></span>)}</div>
        </div>
        <div>
          <label className="label">{t('companies.contactPhone')}</label>
          <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+998..." className="input" />
        </div>
        <div>
          <label className="label">{t('companies.contactLinks')}</label>
          <SocialLinksPicker value={socialLinks} onChange={setSocialLink} />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
          <button onClick={onClose} className="btn-secondary">{t('companies.cancel')}</button>
          <button onClick={handleCreate} disabled={saving || !title || !description} className="btn-primary">{saving && <Spinner className="w-4 h-4" />} {t('companies.publish')}</button>
        </div>
      </div>
    </Modal>
  );
}

function EditJobModal({ job, onClose, onSaved }: { job: Job; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(job.title);
  const [description, setDescription] = useState(job.description);
  const [category, setCategory] = useState(job.category);
  const [jobType, setJobType] = useState(job.job_type);
  const [salaryMin, setSalaryMin] = useState(job.salary_min ?? 0);
  const [salaryMax, setSalaryMax] = useState(job.salary_max ?? 0);
  const [currency, setCurrency] = useState<'UZS' | 'USD'>(job.currency === 'USD' ? 'USD' : 'UZS');
  const [location, setLocation] = useState(job.location ?? '');
  const [isRemote, setIsRemote] = useState(job.is_remote);
  const [skills, setSkills] = useState<string[]>(job.skills_required);
  const [skillInput, setSkillInput] = useState('');
  const [contactPhone, setContactPhone] = useState(job.contact_phone ?? '');
  const [socialLinks, setSocialLinksState] = useState<SocialLinks>(job.social_links ?? {});
  const [saving, setSaving] = useState(false);

  const addSkill = () => { const s = skillInput.trim(); if (s && !skills.includes(s)) setSkills([...skills, s]); setSkillInput(''); };
  const setSocialLink = (key: keyof SocialLinks, value: string | undefined) => setSocialLinksState(prev => { const next = { ...prev }; if (value === undefined) delete next[key]; else next[key] = value; return next; });
  const { language } = useTheme();

  const handleSave = async () => {
    if (!title || !description) return;
    setSaving(true);
    const cleanedLinks: SocialLinks = {};
    for (const platform of SOCIAL_PLATFORMS) {
      const value = socialLinks[platform.key];
      if (value?.trim()) cleanedLinks[platform.key] = normalizeSocialUrl(value);
    }
    const { error } = await supabase.from('jobs').update({
      title, description, category,
      job_type: jobType,
      salary_min: salaryMin, salary_max: salaryMax, currency,
      location: location || null, is_remote: isRemote,
      skills_required: skills,
      contact_phone: contactPhone.trim() || null,
      social_links: cleanedLinks,
    }).eq('id', job.id);
    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={t('companies.editJob')}>
      <div className="p-6 space-y-4">
        <div><label className="label">{t('companies.position')}</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('companies.position.placeholder')} className="input" /></div>
        <div><label className="label">{t('companies.description')}</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder={t('companies.jobDescription.placeholder')} className="input" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">{t('companies.category')}</label><select value={category} onChange={e => setCategory(e.target.value)} className="input">{CATEGORIES.map(c => <option key={c.key} value={c.key}>{language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label}</option>)}</select></div>
          <div><label className="label">{t('companies.employmentType')}</label><select value={jobType} onChange={e => setJobType(e.target.value)} className="input">{Object.entries(JOB_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{language === 'en' ? v.en : language === 'uz' ? v.uz : v.ru}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="label">{t('companies.salaryFrom')}</label><input type="number" value={salaryMin} onChange={e => setSalaryMin(Number(e.target.value))} className="input" /></div>
          <div><label className="label">{t('companies.salaryTo')}</label><input type="number" value={salaryMax} onChange={e => setSalaryMax(Number(e.target.value))} className="input" /></div>
          <div><label className="label">{t('companies.currency')}</label><select value={currency} onChange={e => setCurrency(e.target.value as 'UZS' | 'USD')} className="input"><option value="UZS">UZS</option><option value="USD">USD</option></select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">{t('companies.city')}</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder={t('companies.city')} className="input" /></div>
          <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isRemote} onChange={e => setIsRemote(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm text-slate-700 dark:text-slate-300">{t('companies.remoteWork')}</span></label></div>
        </div>
        <div>
          <label className="label">{t('companies.skills')}</label>
          <div className="flex gap-2 mb-2"><input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="input" /><button onClick={addSkill} className="btn-secondary">+</button></div>
          <div className="flex flex-wrap gap-2">{skills.map(s => <span key={s} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{s}<button onClick={() => setSkills(skills.filter(x => x !== s))} className="ml-1">×</button></span>)}</div>
        </div>
        <div>
          <label className="label">{t('companies.contactPhone')}</label>
          <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+998..." className="input" />
        </div>
        <div>
          <label className="label">{t('companies.contactLinks')}</label>
          <SocialLinksPicker value={socialLinks} onChange={setSocialLink} />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
          <button onClick={onClose} className="btn-secondary">{t('companies.cancel')}</button>
          <button onClick={handleSave} disabled={saving || !title || !description} className="btn-primary">{saving && <Spinner className="w-4 h-4" />} {t('companies.saveChanges')}</button>
        </div>
      </div>
    </Modal>
  );
}

function CreateCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('1-10');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const { language } = useTheme();

  const handleCreate = async () => {
    if (!profile || profile.role !== 'employer' || !name) return;
    setSaving(true);
    await supabase.from('companies').insert({
      owner_id: profile.id, name, description, industry, size, website, location,
    });
    setSaving(false);
    onCreated();
  };

  return (
    <Modal open onClose={onClose} size="md" title={t('companies.newCompany')}>
      <div className="p-6 space-y-4">
        <div><label className="label">{t('companies.name')}</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="input" /></div>
        <div><label className="label">{t('companies.description')}</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">{t('companies.industry')}</label><input type="text" value={industry} onChange={e => setIndustry(e.target.value)} className="input" /></div>
          <div><label className="label">{t('companies.size')}</label><select value={size} onChange={e => setSize(e.target.value)} className="input">{COMPANY_SIZES.map(s => <option key={s.key} value={s.key}>{language === 'en' ? s.labelEn : language === 'uz' ? s.labelUz : s.label}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">{t('companies.website')}</label><input type="text" value={website} onChange={e => setWebsite(e.target.value)} placeholder="example.com" className="input" /></div>
          <div><label className="label">{t('companies.location')}</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} className="input" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
          <button onClick={onClose} className="btn-secondary">{t('companies.cancel')}</button>
          <button onClick={handleCreate} disabled={saving || !name} className="btn-primary">{saving && <Spinner className="w-4 h-4" />} {t('companies.create')}</button>
        </div>
      </div>
    </Modal>
  );
}
