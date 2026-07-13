import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { CATEGORIES, SKILLS_LIBRARY } from '../lib/constants';
import { Spinner } from '../components/ui';
import { Briefcase, PenTool, Check, ArrowRight, MapPin, Phone } from 'lucide-react';

export function Onboarding() {
  const { profile, updateProfile, completeOnboarding, needsRoleSelection, setRoleAndComplete } = useAuth();
  const [step, setStep] = useState(needsRoleSelection ? 0 : 0);
  const [role, setRole] = useState<'freelancer' | 'employer'>(profile?.role === 'employer' ? 'employer' : 'freelancer');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const s = skillInput.trim();
    if (s && !selectedSkills.includes(s)) {
      setSelectedSkills(prev => [...prev, s]);
    }
    setSkillInput('');
  };

  const handleFinish = async () => {
    setSaving(true);
    await updateProfile({
      role,
      bio: bio || null,
      location: location || null,
      phone: phone || null,
      categories: selectedCategories,
      skills: selectedSkills,
    });
    setSaving(false);
    completeOnboarding();
  };

  const handleRoleOnly = async () => {
    setSaving(true);
    await setRoleAndComplete(role);
    setSaving(false);
  };

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return selectedCategories.length > 0;
    if (step === 2) return role === 'employer' || selectedSkills.length > 0;
    return true;
  };

  // Simplified flow for Google users who just need role selection
  if (needsRoleSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg card p-8 animate-scale-in">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Добро пожаловать!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Вы вошли через Google. Выберите роль, чтобы продолжить — это можно изменить позже.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setRole('freelancer')}
              className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                role === 'freelancer'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
                role === 'freelancer' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
              }`}>
                <PenTool className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">Специалист / Креатор</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Предлагаю услуги, выполняю заказы</p>
              {role === 'freelancer' && <Check className="w-5 h-5 text-brand-600 mt-3" />}
            </button>
            <button
              onClick={() => setRole('employer')}
              className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                role === 'employer'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
                role === 'employer' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
              }`}>
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">Компания / Работодатель</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Публикую проекты, нанимаю</p>
              {role === 'employer' && <Check className="w-5 h-5 text-brand-600 mt-3" />}
            </button>
          </div>
          <button onClick={handleRoleOnly} disabled={saving} className="btn-primary w-full">
            {saving && <Spinner className="w-4 h-4" />}
            Продолжить <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl card p-8 animate-scale-in">
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Кто вы?</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Выберите роль — это можно изменить позже</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => setRole('freelancer')} className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${role === 'freelancer' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${role === 'freelancer' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}><PenTool className="w-6 h-6" /></div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Фрилансер</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Предлагаю услуги, выполняю заказы и тендеры</p>
                {role === 'freelancer' && <Check className="w-5 h-5 text-brand-600 mt-3" />}
              </button>
              <button onClick={() => setRole('employer')} className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${role === 'employer' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${role === 'employer' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}><Briefcase className="w-6 h-6" /></div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Заказчик</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Публикую проекты, нанимаю исполнителей</p>
                {role === 'employer' && <Check className="w-5 h-5 text-brand-600 mt-3" />}
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Выберите специализации</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{role === 'freelancer' ? 'В каких категориях вы работаете?' : 'Каких специалистов ищете?'}</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => toggleCategory(cat.key)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${selectedCategories.includes(cat.key) ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{cat.label}</button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && role === 'freelancer' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ваши навыки</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Добавьте навыки, чтобы клиенты вас нашли</p>
            <div className="mb-4 flex gap-2">
              <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())} placeholder="Например, React, Figma, SEO..." className="input flex-1" />
              <button onClick={addCustomSkill} className="btn-secondary">Добавить</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedSkills.map(skill => (
                <span key={skill} className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 gap-1.5">{skill}<button onClick={() => toggleSkill(skill)} className="hover:text-brand-900">×</button></span>
              ))}
            </div>
            <p className="text-sm text-slate-500 mb-2">Популярные:</p>
            <div className="flex flex-wrap gap-2">
              {SKILLS_LIBRARY.slice(0, 20).map(skill => (
                <button key={skill} onClick={() => toggleSkill(skill)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedSkills.includes(skill) ? 'hidden' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>+ {skill}</button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && role === 'employer' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">О компании</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Заполните базовую информацию</p>
            <div className="space-y-4">
              <div><label className="label">Местоположение</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Город, страна" className="input pl-10" /></div></div>
              <div><label className="label">Телефон</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 123 45 67" className="input pl-10" /></div></div>
              <div><label className="label">Описание</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Кратко о компании или ваших потребностях" className="input" /></div>
            </div>
          </div>
        )}

        {step === 3 && role === 'freelancer' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">О себе</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Расскажите клиентам о себе</p>
            <div className="space-y-4">
              <div><label className="label">Местоположение</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Город, страна" className="input pl-10" /></div></div>
              <div><label className="label">Телефон</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 123 45 67" className="input pl-10" /></div></div>
              <div><label className="label">Био</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Опишите свой опыт, подход к работе и достижения" className="input" /></div>
            </div>
          </div>
        )}

        {step === 3 && role === 'employer' && (
          <div className="text-center animate-fade-in py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success-100 dark:bg-success-900/30 text-success-600 mb-4"><Check className="w-8 h-8" /></div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Готово!</h2>
            <p className="text-slate-500 dark:text-slate-400">Можно публиковать проекты и искать исполнителей</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn-ghost disabled:opacity-30">Назад</button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="btn-primary">Далее <ArrowRight className="w-4 h-4" /></button>
          ) : (
            <button onClick={handleFinish} disabled={saving} className="btn-primary">{saving && <Spinner className="w-4 h-4" />} Завершить</button>
          )}
        </div>
      </div>
    </div>
  );
}
