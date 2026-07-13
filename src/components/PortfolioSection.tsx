import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIES } from '../lib/constants';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { Modal, Spinner, EmptyState } from './ui';
import { GigImageUpload } from './GigImageUpload';
import type { PortfolioItem } from '../lib/types';
import { Plus, ExternalLink, Pencil, Trash2, Briefcase, FolderOpen } from 'lucide-react';

export function PortfolioSection({ userId }: { userId: string }) {
  const { language } = useTheme();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setItems(data as PortfolioItem[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (item: PortfolioItem) => {
    if (!window.confirm(t('portfolio.deleteConfirm'))) return;
    await supabase.from('portfolio_items').delete().eq('id', item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const catLabel = (key: string | null) => {
    if (!key) return null;
    const c = CATEGORIES.find(c => c.key === key);
    if (!c) return key;
    return language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label;
  };

  return (
    <div className="card p-6 mt-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 dark:text-white">{t('portfolio.title')}</h3>
        <button onClick={() => { setEditingItem(null); setShowModal(true); }} className="btn-secondary text-sm">
          <Plus className="w-4 h-4" /> {t('portfolio.add')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-brand-600" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={FolderOpen} title={t('portfolio.empty.title')} description={t('portfolio.empty.description')} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="card overflow-hidden group">
              <div className="relative h-32 bg-slate-100 dark:bg-slate-800">
                {item.image_urls[0] ? (
                  <img src={item.image_urls[0]} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingItem(item); setShowModal(true); }} className="w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center">
                    <Pencil className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                  </button>
                  <button onClick={() => handleDelete(item)} className="w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5 text-error-600" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.title}</div>
                {catLabel(item.category) && <div className="text-xs text-slate-500 mt-0.5">{catLabel(item.category)}</div>}
                {item.link_url && (
                  <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700">
                    {t('portfolio.viewLink')} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PortfolioItemModal
          userId={userId}
          item={editingItem}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function PortfolioItemModal({ userId, item, onClose, onSaved }: {
  userId: string;
  item: PortfolioItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { language } = useTheme();
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [category, setCategory] = useState(item?.category || CATEGORIES[0].key);
  const [linkUrl, setLinkUrl] = useState(item?.link_url || '');
  const [imageUrls, setImageUrls] = useState<string[]>(item?.image_urls || []);
  const [saving, setSaving] = useState(false);
  const itemId = item?.id || crypto.randomUUID();

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      category,
      link_url: linkUrl.trim() || null,
      image_urls: imageUrls,
      updated_at: new Date().toISOString(),
    };
    if (item) {
      await supabase.from('portfolio_items').update(payload).eq('id', item.id);
    } else {
      await supabase.from('portfolio_items').insert({ id: itemId, ...payload });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={item ? t('portfolio.edit') : t('portfolio.new')}>
      <div className="p-6 space-y-4">
        <div>
          <label className="label">{t('portfolio.projectTitle')}</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('portfolio.projectTitle.placeholder')} className="input" />
        </div>
        <div>
          <label className="label">{t('portfolio.category')}</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input">
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{language === 'en' ? c.labelEn : language === 'uz' ? c.labelUz : c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('portfolio.description')}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={t('portfolio.description.placeholder')} className="input" />
        </div>
        <div>
          <label className="label">{t('portfolio.link')}</label>
          <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder={t('portfolio.link.placeholder')} className="input" />
          <p className="text-xs text-slate-400 mt-1">{t('portfolio.link.hint')}</p>
        </div>
        <GigImageUpload userId={userId} gigId={`portfolio/${itemId}`} existingImages={imageUrls} onImagesChange={setImageUrls} />
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="btn-secondary">{t('portfolio.cancel')}</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} className="btn-primary">
            {saving && <Spinner className="w-4 h-4" />} {t('portfolio.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
