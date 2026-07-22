import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Spinner } from './ui';
import { t } from '../lib/i18n';
import { Upload, X, AlertCircle, GripVertical } from 'lucide-react';

type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  error?: string;
  path?: string;
  url?: string;
}

const MAX_IMAGES = 8;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function GigImageUpload({
  userId,
  gigId,
  existingImages = [],
  onImagesChange,
}: {
  userId: string;
  gigId: string;
  existingImages?: string[];
  onImagesChange: (urls: string[]) => void;
}) {
  const [images, setImages] = useState<ImageItem[]>(
    existingImages.map((url, i) => ({
      id: `existing-${i}`,
      file: null as unknown as File,
      previewUrl: url,
      status: 'done' as UploadStatus,
      url,
    }))
  );
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notifyChange = useCallback((items: ImageItem[]) => {
    const urls = items.filter(i => i.status === 'done' && i.url).map(i => i.url!);
    onImagesChange(urls);
  }, [onImagesChange]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    const newItems: ImageItem[] = [];

    for (const file of files) {
      if (images.length + newItems.length >= MAX_IMAGES) break;
      if (!ALLOWED_TYPES.includes(file.type)) {
        newItems.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: '',
          status: 'error',
          error: t('gigImg.onlyFormats'),
        });
        continue;
      }
      if (file.size > MAX_SIZE) {
        newItems.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: '',
          status: 'error',
          error: t('gigImg.maxSize'),
        });
        continue;
      }
      newItems.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
      });
    }

    const updated = [...images, ...newItems].slice(0, MAX_IMAGES);
    setImages(updated);
    await uploadPending(updated);
  };

  const uploadPending = async (items: ImageItem[]) => {
    const pending = items.filter(i => i.status === 'pending');
    if (pending.length === 0) return;
    setUploading(true);

    for (const item of pending) {
      setImages(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));

      const ext = item.file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/${gigId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('service-images')
        .upload(path, item.file, { upsert: false, contentType: item.file.type });

      if (error) {
        setImages(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: t('gigImg.uploadError') } : i));
      } else {
        const { data: urlData } = supabase.storage.from('service-images').getPublicUrl(path);
        const url = urlData.publicUrl;
        setImages(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done', url, path } : i));
      }
    }

    // Notify parent with final URLs
    setImages(prev => {
      const urls = prev.filter(i => i.status === 'done' && i.url).map(i => i.url!);
      onImagesChange(urls);
      return prev;
    });
    setUploading(false);
  };

  const removeImage = (id: string) => {
    const item = images.find(i => i.id === id);
    if (item?.path) {
      supabase.storage.from('service-images').remove([item.path]);
    }
    const updated = images.filter(i => i.id !== id);
    setImages(updated);
    notifyChange(updated);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...images];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setDragIndex(index);
    setImages(updated);
    notifyChange(updated);
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div>
      <label className="label">{t('gigImg.label').replace('{max}', String(MAX_IMAGES))}</label>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-300 dark:border-[#232a3d] hover:border-brand-400'
        }`}
      >
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('gigImg.dropHint')}
        </p>
        <p className="text-xs text-slate-400 mt-1">{t('gigImg.formatsHint')}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={e => { handleFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-xl overflow-hidden border-2 bg-slate-100 dark:bg-[#161c2b] ${
                index === 0 ? 'border-brand-500' : 'border-slate-200 dark:border-[#232a3d]'
              } ${dragIndex === index ? 'opacity-40' : ''} cursor-move`}
              style={{ aspectRatio: '1' }}
            >
              {img.status === 'error' ? (
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <AlertCircle className="w-5 h-5 text-error-500 mb-1" />
                  <span className="text-[10px] text-error-600">{img.error}</span>
                </div>
              ) : img.status === 'uploading' ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner className="w-6 h-6 text-brand-600" />
                </div>
              ) : (
                <>
                  <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                  {index === 0 && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-bold bg-brand-600 text-white rounded">{t('gigImg.cover')}</div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); removeImage(img.id); }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-white drop-shadow" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <p className="text-xs text-brand-600 mt-2 flex items-center gap-1.5">
          <Spinner className="w-3 h-3" /> {t('gigImg.uploading')}
        </p>
      )}

      {images.some(i => i.status === 'error') && (
        <p className="text-xs text-error-600 mt-2 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          {images.filter(i => i.status === 'error').length} {t('gigImg.failedCount')}
        </p>
      )}
    </div>
  );
}
