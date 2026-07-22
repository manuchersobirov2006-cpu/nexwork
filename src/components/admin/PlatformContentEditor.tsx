import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/admin';
import { Spinner, Modal, EmptyState, Badge } from '../../components/ui';
import { formatDate } from '../../lib/format';
import type { PlatformContent, PlatformCategory, PlatformTranslation, PlatformBlogPost } from '../../lib/types';
import { Search, Edit, Save, X, Plus, FileText, Layout, Globe, Tag, Calendar } from 'lucide-react';

type ContentTab = 'content' | 'categories' | 'translations' | 'blog';

export function PlatformContentEditor({ adminId }: { adminId: string }) {
  const [tab, setTab] = useState<ContentTab>('content');

  const tabs: { key: ContentTab; label: string; icon: React.ElementType }[] = [
    { key: 'content', label: 'Блоки лендинга', icon: Layout },
    { key: 'categories', label: 'Категории', icon: Tag },
    { key: 'translations', label: 'Переводы', icon: Globe },
    { key: 'blog', label: 'Блог', icon: FileText },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex gap-1 mb-4 p-1 bg-slate-100 dark:bg-[#161c2b] rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${tab === t.key ? 'bg-white dark:bg-[#10141f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'content' && <ContentBlocksEditor adminId={adminId} />}
      {tab === 'categories' && <CategoriesEditor adminId={adminId} />}
      {tab === 'translations' && <TranslationsEditor adminId={adminId} />}
      {tab === 'blog' && <BlogEditor adminId={adminId} />}
    </div>
  );
}

function ContentBlocksEditor({ adminId }: { adminId: string }) {
  const [items, setItems] = useState<PlatformContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlatformContent | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlatformContent>>({});
  const [saving, setSaving] = useState(false);
  const [sectionFilter, setSectionFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_content').select('*').order('section').order('sort_order');
    if (data) setItems(data as PlatformContent[]);
    setLoading(false);
  };

  const sections = [...new Set(items.map(i => i.section))];
  const filtered = sectionFilter === 'all' ? items : items.filter(i => i.section === sectionFilter);

  const startEdit = (item: PlatformContent) => {
    setEditing(item);
    setEditForm({ title: item.title, description: item.description, sort_order: item.sort_order, is_active: item.is_active });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const before = { title: editing.title, description: editing.description, sort_order: editing.sort_order, is_active: editing.is_active };
    const { error } = await supabase.from('platform_content').update({
      title: editForm.title, description: editForm.description,
      sort_order: editForm.sort_order, is_active: editForm.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', editing.id);
    if (!error) {
      await logAdminAction({ adminId, actionType: 'edit_platform_content', targetTable: 'platform_content', targetId: editing.id, beforeValue: before, afterValue: editForm });
      setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...editForm } as PlatformContent : i));
      setEditing(null);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div>
      <div className="mb-3 flex gap-2 flex-wrap">
        <button onClick={() => setSectionFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm ${sectionFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-[#161c2b] text-slate-600'}`}>Все</button>
        {sections.map(s => (
          <button key={s} onClick={() => setSectionFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${sectionFilter === s ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-[#161c2b] text-slate-600'}`}>{s}</button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(item => (
          <div key={item.id} className="card p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge color="slate">{item.section}</Badge>
                <span className="text-xs text-slate-400">#{item.sort_order}</span>
                {!item.is_active && <Badge color="red">скрыт</Badge>}
              </div>
              <div className="font-medium text-slate-900 dark:text-white mt-1">{item.title}</div>
              <div className="text-xs text-slate-500 truncate">{item.description}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">key: {item.key}</div>
            </div>
            <button onClick={() => startEdit(item)} className="btn-ghost !p-1.5"><Edit className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon={Layout} title="Нет контента" />}

      {editing && (
        <Modal open onClose={() => setEditing(null)} size="md" title={`Редактирование: ${editing.key}`}>
          <div className="p-6 space-y-4">
            <div><label className="label">Заголовок</label><input className="input" value={editForm.title ?? ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></div>
            <div><label className="label">Описание</label><textarea className="input" rows={3} value={editForm.description ?? ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Порядок</label><input type="number" className="input" value={editForm.sort_order ?? 0} onChange={e => setEditForm({ ...editForm, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.is_active ?? false} onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm">Активен</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
              <button onClick={() => setEditing(null)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Сохранить</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CategoriesEditor({ adminId }: { adminId: string }) {
  const [items, setItems] = useState<PlatformCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlatformCategory | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlatformCategory>>({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_categories').select('*').order('sort_order');
    if (data) setItems(data as PlatformCategory[]);
    setLoading(false);
  };

  const startEdit = (item: PlatformCategory) => {
    setEditing(item);
    setEditForm({ label: item.label, label_en: item.label_en, icon: item.icon, sort_order: item.sort_order, is_active: item.is_active });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const before = { label: editing.label, label_en: editing.label_en, icon: editing.icon, sort_order: editing.sort_order, is_active: editing.is_active };
    const { error } = await supabase.from('platform_categories').update({
      label: editForm.label, label_en: editForm.label_en, icon: editForm.icon,
      sort_order: editForm.sort_order, is_active: editForm.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', editing.id);
    if (!error) {
      await logAdminAction({ adminId, actionType: 'edit_category', targetTable: 'platform_categories', targetId: editing.id, beforeValue: before, afterValue: editForm });
      setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...editForm } as PlatformCategory : i));
      setEditing(null);
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('platform_categories').insert({
      key: editForm.key || 'new_category',
      label: editForm.label || 'Новая категория',
      label_en: editForm.label_en,
      icon: editForm.icon,
      sort_order: editForm.sort_order || 99,
      is_active: editForm.is_active ?? true,
    }).select().single();
    if (!error && data) {
      await logAdminAction({ adminId, actionType: 'create_category', targetTable: 'platform_categories', targetId: data.id, afterValue: editForm });
      setItems(prev => [...prev, data as PlatformCategory]);
      setCreating(false);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => { setCreating(true); setEditForm({ key: '', label: '', label_en: '', icon: 'Palette', sort_order: 99, is_active: true }); }} className="btn-primary !py-1.5 text-sm"><Plus className="w-4 h-4" /> Добавить</button>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="card p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-600">{(item.icon || '?').slice(0, 2)}</div>
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-white">{item.label}</div>
              <div className="text-xs text-slate-500">{item.key} · {item.label_en} · #{item.sort_order}</div>
            </div>
            {!item.is_active && <Badge color="red">скрыта</Badge>}
            <button onClick={() => startEdit(item)} className="btn-ghost !p-1.5"><Edit className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {editing && (
        <Modal open onClose={() => setEditing(null)} size="md" title={`Категория: ${editing.key}`}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Название (RU)</label><input className="input" value={editForm.label ?? ''} onChange={e => setEditForm({ ...editForm, label: e.target.value })} /></div>
              <div><label className="label">Название (EN)</label><input className="input" value={editForm.label_en ?? ''} onChange={e => setEditForm({ ...editForm, label_en: e.target.value })} /></div>
              <div><label className="label">Иконка</label><input className="input" value={editForm.icon ?? ''} onChange={e => setEditForm({ ...editForm, icon: e.target.value })} /></div>
              <div><label className="label">Порядок</label><input type="number" className="input" value={editForm.sort_order ?? 0} onChange={e => setEditForm({ ...editForm, sort_order: Number(e.target.value) })} /></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.is_active ?? false} onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm">Активна</span>
            </label>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
              <button onClick={() => setEditing(null)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Сохранить</button>
            </div>
          </div>
        </Modal>
      )}

      {creating && (
        <Modal open onClose={() => setCreating(false)} size="md" title="Новая категория">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Ключ (уникальный)</label><input className="input" value={editForm.key ?? ''} onChange={e => setEditForm({ ...editForm, key: e.target.value })} placeholder="design" /></div>
              <div><label className="label">Иконка</label><input className="input" value={editForm.icon ?? ''} onChange={e => setEditForm({ ...editForm, icon: e.target.value })} placeholder="Palette" /></div>
              <div><label className="label">Название (RU)</label><input className="input" value={editForm.label ?? ''} onChange={e => setEditForm({ ...editForm, label: e.target.value })} /></div>
              <div><label className="label">Название (EN)</label><input className="input" value={editForm.label_en ?? ''} onChange={e => setEditForm({ ...editForm, label_en: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
              <button onClick={() => setCreating(false)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />} Создать</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TranslationsEditor({ adminId }: { adminId: string }) {
  const [items, setItems] = useState<PlatformTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [localeFilter, setLocaleFilter] = useState('all');
  const [editing, setEditing] = useState<PlatformTranslation | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_translations').select('*').order('locale').order('key').limit(200);
    if (data) setItems(data as PlatformTranslation[]);
    setLoading(false);
  };

  const filtered = items.filter(t => {
    const matchSearch = !search || t.key.toLowerCase().includes(search.toLowerCase()) || t.value.toLowerCase().includes(search.toLowerCase());
    const matchLocale = localeFilter === 'all' || t.locale === localeFilter;
    return matchSearch && matchLocale;
  });

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const before = { value: editing.value };
    const { error } = await supabase.from('platform_translations').update({
      value: editValue, updated_at: new Date().toISOString(),
    }).eq('id', editing.id);
    if (!error) {
      await logAdminAction({ adminId, actionType: 'edit_translation', targetTable: 'platform_translations', targetId: editing.id, beforeValue: before, afterValue: { value: editValue } });
      setItems(prev => prev.map(i => i.id === editing.id ? { ...i, value: editValue } : i));
      setEditing(null);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div>
      <div className="card p-4 mb-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-10" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по ключу или значению..." />
        </div>
        <select value={localeFilter} onChange={e => setLocaleFilter(e.target.value)} className="input sm:w-32">
          <option value="all">Все языки</option>
          <option value="ru">RU</option>
          <option value="uz">UZ</option>
          <option value="kz">KZ</option>
          <option value="en">EN</option>
        </select>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-[#161c2b]/50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left p-3 w-20">Язык</th>
              <th className="text-left p-3">Ключ</th>
              <th className="text-left p-3 hidden md:table-cell">Значение</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#232a3d]">
            {filtered.slice(0, 100).map(t => (
              <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#161c2b]/30 cursor-pointer" onClick={() => { setEditing(t); setEditValue(t.value); }}>
                <td className="p-3"><Badge color="blue">{t.locale}</Badge></td>
                <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">{t.key}</td>
                <td className="p-3 hidden md:table-cell text-slate-700 dark:text-slate-300 truncate max-w-xs">{t.value}</td>
                <td className="p-3 text-right"><button className="btn-ghost !p-1.5"><Edit className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <EmptyState icon={Globe} title="Нет переводов" description="Добавьте строки переводов через таблицу" />}

      {editing && (
        <Modal open onClose={() => setEditing(null)} size="md" title={`Перевод: ${editing.locale} / ${editing.key}`}>
          <div className="p-6 space-y-4">
            <div><label className="label">Значение</label><textarea className="input" rows={3} value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus /></div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
              <button onClick={() => setEditing(null)} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Сохранить</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BlogEditor({ adminId }: { adminId: string }) {
  const [items, setItems] = useState<PlatformBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlatformBlogPost | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlatformBlogPost>>({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('platform_blog_posts').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setItems(data as PlatformBlogPost[]);
    setLoading(false);
  };

  const startEdit = (post: PlatformBlogPost) => {
    setEditing(post);
    setEditForm({ title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, cover_image_url: post.cover_image_url, status: post.status });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const before = { title: editing.title, slug: editing.slug, excerpt: editing.excerpt, content: editing.content, status: editing.status };
    const updates: Partial<PlatformBlogPost> = {
      title: editForm.title, slug: editForm.slug, excerpt: editForm.excerpt,
      content: editForm.content, cover_image_url: editForm.cover_image_url, status: editForm.status,
      updated_at: new Date().toISOString(),
    };
    if (editForm.status === 'published' && !editing.published_at) updates.published_at = new Date().toISOString();
    const { error } = await supabase.from('platform_blog_posts').update(updates).eq('id', editing.id);
    if (!error) {
      await logAdminAction({ adminId, actionType: 'edit_blog_post', targetTable: 'platform_blog_posts', targetId: editing.id, beforeValue: before, afterValue: updates });
      load();
      setEditing(null);
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('platform_blog_posts').insert({
      title: editForm.title || 'Новый пост',
      slug: editForm.slug || 'new-post-' + Date.now(),
      excerpt: editForm.excerpt,
      content: editForm.content || '',
      cover_image_url: editForm.cover_image_url,
      status: editForm.status || 'draft',
      author_id: adminId,
    }).select().single();
    if (!error && data) {
      await logAdminAction({ adminId, actionType: 'create_blog_post', targetTable: 'platform_blog_posts', targetId: data.id, afterValue: editForm });
      load();
      setCreating(false);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-brand-600" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => { setCreating(true); setEditForm({ title: '', slug: '', excerpt: '', content: '', cover_image_url: '', status: 'draft' }); }} className="btn-primary !py-1.5 text-sm"><Plus className="w-4 h-4" /> Новый пост</button>
      </div>
      <div className="space-y-2">
        {items.map(post => (
          <div key={post.id} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#161c2b] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-white truncate">{post.title}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> {formatDate(post.created_at)} · /{post.slug}
              </div>
            </div>
            <Badge color={post.status === 'published' ? 'green' : post.status === 'archived' ? 'slate' : 'amber'}>{post.status}</Badge>
            <button onClick={() => startEdit(post)} className="btn-ghost !p-1.5"><Edit className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      {items.length === 0 && <EmptyState icon={FileText} title="Нет постов" description="Создайте первый пост" />}

      {(editing || creating) && (
        <Modal open onClose={() => { setEditing(null); setCreating(false); }} size="lg" title={editing ? `Редактирование: ${editing.title}` : 'Новый пост'}>
          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Заголовок</label><input className="input" value={editForm.title ?? ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></div>
              <div><label className="label">Slug</label><input className="input" value={editForm.slug ?? ''} onChange={e => setEditForm({ ...editForm, slug: e.target.value })} /></div>
            </div>
            <div><label className="label">Краткое описание</label><input className="input" value={editForm.excerpt ?? ''} onChange={e => setEditForm({ ...editForm, excerpt: e.target.value })} /></div>
            <div><label className="label">URL обложки</label><input className="input" value={editForm.cover_image_url ?? ''} onChange={e => setEditForm({ ...editForm, cover_image_url: e.target.value })} placeholder="https://..." /></div>
            <div><label className="label">Содержание</label><textarea className="input font-mono text-sm" rows={8} value={editForm.content ?? ''} onChange={e => setEditForm({ ...editForm, content: e.target.value })} /></div>
            <div>
              <label className="label">Статус</label>
              <select className="input" value={editForm.status ?? 'draft'} onChange={e => setEditForm({ ...editForm, status: e.target.value as PlatformBlogPost['status'] })}>
                <option value="draft">Черновик</option>
                <option value="published">Опубликован</option>
                <option value="archived">Архив</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#232a3d]">
              <button onClick={() => { setEditing(null); setCreating(false); }} className="btn-secondary"><X className="w-4 h-4" /> Отмена</button>
              <button onClick={editing ? handleSave : handleCreate} disabled={saving} className="btn-primary">{saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} {editing ? 'Сохранить' : 'Создать'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
