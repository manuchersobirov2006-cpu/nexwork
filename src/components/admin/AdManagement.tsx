import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/admin';
import { Spinner, EmptyState, Toggle } from '../../components/ui';
import type { Ad } from '../../lib/types';
import { Megaphone, Plus, Trash2, Edit, Save, X } from 'lucide-react';

export function AdManagement({ adminId }: { adminId: string }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Ad | 'new' | null>(null);
  const [form, setForm] = useState({ title: '', description: '', image_url: '', link_url: '', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ads').select('*').order('sort_order', { ascending: true });
    if (data) setAds(data as Ad[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startNew = () => {
    setForm({ title: '', description: '', image_url: '', link_url: '', sort_order: ads.length });
    setEditing('new');
  };

  const startEdit = (ad: Ad) => {
    setForm({ title: ad.title, description: ad.description || '', image_url: ad.image_url || '', link_url: ad.link_url || '', sort_order: ad.sort_order });
    setEditing(ad);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editing === 'new') {
      const { data, error } = await supabase.from('ads').insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim() || null,
        sort_order: form.sort_order,
        created_by: adminId,
      }).select('*').single();
      if (!error && data) {
        await logAdminAction({ adminId, actionType: 'create_ad', targetTable: 'ads', targetId: data.id, afterValue: { title: form.title } });
        setAds(prev => [...prev, data as Ad].sort((a, b) => a.sort_order - b.sort_order));
      }
    } else if (editing) {
      const { error } = await supabase.from('ads').update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim() || null,
        sort_order: form.sort_order,
        updated_at: new Date().toISOString(),
      }).eq('id', editing.id);
      if (!error) {
        await logAdminAction({ adminId, actionType: 'edit_ad', targetTable: 'ads', targetId: editing.id, afterValue: form });
        setAds(prev => prev.map(a => a.id === editing.id ? { ...a, ...form, description: form.description || null, image_url: form.image_url || null, link_url: form.link_url || null } : a));
      }
    }
    setSaving(false);
    setEditing(null);
  };

  const handleToggleActive = async (ad: Ad) => {
    await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_active: !a.is_active } : a));
  };

  const handleDelete = async (ad: Ad) => {
    if (!window.confirm('Удалить эту рекламу?')) return;
    await supabase.from('ads').delete().eq('id', ad.id);
    await logAdminAction({ adminId, actionType: 'delete_ad', targetTable: 'ads', targetId: ad.id, beforeValue: { title: ad.title } });
    setAds(prev => prev.filter(a => a.id !== ad.id));
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">Мини-баннеры показываются вверху раздела "Обзор" у всех пользователей</p>
        <button onClick={startNew} className="btn-primary text-sm shrink-0"><Plus className="w-4 h-4" /> Добавить рекламу</button>
      </div>

      {ads.length === 0 ? (
        <EmptyState icon={Megaphone} title="Реклама не добавлена" description="Создайте первый баннер для главной страницы" />
      ) : (
        <div className="space-y-2">
          {ads.map(ad => (
            <div key={ad.id} className="card p-4 flex items-center gap-3">
              {ad.image_url ? (
                <img src={ad.image_url} alt={ad.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-brand-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-white truncate">{ad.title}</div>
                {ad.description && <div className="text-xs text-slate-500 truncate">{ad.description}</div>}
              </div>
              <Toggle checked={ad.is_active} onChange={() => handleToggleActive(ad)} />
              <button onClick={() => startEdit(ad)} className="btn-ghost !p-1.5" title="Редактировать"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(ad)} className="btn-ghost !p-1.5 text-error-600" title="Удалить"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-md card p-6 animate-scale-in space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white">{editing === 'new' ? 'Новая реклама' : 'Редактировать рекламу'}</h3>
            <div><label className="label">Заголовок</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus /></div>
            <div><label className="label">Описание</label><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><label className="label">Ссылка на картинку</label><input className="input" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
            <div><label className="label">Ссылка при клике (необязательно)</label><input className="input" value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." /></div>
            <div><label className="label">Порядок показа</label><input type="number" className="input" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#232a3d]">
              <button onClick={() => setEditing(null)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={handleSave} disabled={saving || !form.title.trim()} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
