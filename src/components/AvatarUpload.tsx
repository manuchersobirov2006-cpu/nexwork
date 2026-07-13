import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { getAvatarUrl } from '../lib/constants';
import { Spinner } from './ui';
import { t } from '../lib/i18n';
import { Camera, AlertCircle } from 'lucide-react';

export function AvatarUpload({ size = 96, className = '' }: { size?: number; className?: string }) {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('avatar.onlyFormats'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('avatar.maxSize'));
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}/avatar.${ext}`;

      // Delete existing avatar files first (in case extension changed)
      await supabase.storage.from('avatars').remove([`${profile.id}/avatar.jpg`, `${profile.id}/avatar.png`, `${profile.id}/avatar.webp`]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateProfile({ avatar_url: avatarUrl });
      await refreshProfile();
    } catch (err) {
      setError(t('avatar.uploadError'));
      console.error('Avatar upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative inline-block">
      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <img
          src={getAvatarUrl(profile)}
          alt={profile.display_name || profile.full_name || 'User'}
          width={size}
          height={size}
          className={`rounded-2xl border-4 border-white dark:border-slate-900 object-cover shadow-lg ${className}`}
          style={{ width: size, height: size }}
        />
        <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Spinner className="w-6 h-6 text-white" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && (
        <div className="absolute top-full left-0 mt-1 whitespace-nowrap text-xs text-error-600 flex items-center gap-1 z-10">
          <AlertCircle className="w-3 h-3" /> {error}
        </div>
      )}
    </div>
  );
}
