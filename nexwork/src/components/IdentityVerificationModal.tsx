import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Modal, Spinner } from './ui';
import type { IdentityVerification } from '../lib/types';
import {
  Upload, User, FileText, AlertCircle,
  Hourglass, XCircle
} from 'lucide-react';

export function IdentityVerificationModal({ open, onClose, onSubmitted, existingVerif }: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  existingVerif: IdentityVerification | null;
}) {
  const { profile, refreshProfile } = useAuth();
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'face' | 'passport') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Только JPG, PNG или WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Максимальный размер — 5 МБ');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (type === 'face') {
      setFaceFile(file);
      setFacePreview(previewUrl);
    } else {
      setPassportFile(file);
      setPassportPreview(previewUrl);
    }
  };

  const handleSubmit = async () => {
    if (!profile || !faceFile || !passportFile) return;
    setError(null);
    setUploading(true);

    try {
      const faceExt = faceFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const passportExt = passportFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const facePath = `${profile.id}/face.${faceExt}`;
      const passportPath = `${profile.id}/passport.${passportExt}`;

      // Delete old files if resubmitting
      if (existingVerif) {
        await supabase.storage.from('identity-documents').remove([existingVerif.face_photo_path, existingVerif.passport_photo_path]);
      }

      const { error: faceErr } = await supabase.storage.from('identity-documents').upload(facePath, faceFile, { upsert: true, contentType: faceFile.type });
      if (faceErr) throw new Error('Ошибка загрузки фото лица');

      const { error: passportErr } = await supabase.storage.from('identity-documents').upload(passportPath, passportFile, { upsert: true, contentType: passportFile.type });
      if (passportErr) throw new Error('Ошибка загрузки фото документа');

      // Create/update verification record
      if (existingVerif) {
        await supabase.from('identity_verifications').update({
          face_photo_path: facePath,
          passport_photo_path: passportPath,
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        }).eq('id', existingVerif.id);
      } else {
        await supabase.from('identity_verifications').insert({
          user_id: profile.id,
          face_photo_path: facePath,
          passport_photo_path: passportPath,
          status: 'pending',
        });
      }

      // Send notification to all admins
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
      if (admins && admins.length > 0) {
        await supabase.from('notifications').insert(
          admins.map(a => ({
            user_id: a.id,
            type: 'verification',
            title: 'Новая заявка на верификацию',
            body: `${profile.display_name || profile.full_name} подал(а) заявку на верификацию личности`,
            link: 'admin',
          }))
        );
      }

      await refreshProfile();
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки заявки');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFaceFile(null);
    setPassportFile(null);
    setFacePreview(null);
    setPassportPreview(null);
    setError(null);
    onClose();
  };

  const isPending = existingVerif?.status === 'pending';
  const isRejected = existingVerif?.status === 'rejected';

  return (
    <Modal open={open} onClose={handleClose} size="lg" title="Верификация личности">
      <div className="p-6 space-y-5">
        {isPending && (
          <div className="flex items-center gap-3 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-xl">
            <Hourglass className="w-5 h-5 text-warning-600 shrink-0" />
            <p className="text-sm text-slate-700 dark:text-slate-300">Ваша заявка на рассмотрении. Это может занять до 48 часов.</p>
          </div>
        )}

        {isRejected && existingVerif?.rejection_reason && (
          <div className="flex items-start gap-3 p-3 bg-error-50 dark:bg-error-900/20 rounded-xl">
            <XCircle className="w-5 h-5 text-error-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-error-700">Заявка отклонена</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{existingVerif.rejection_reason}</p>
            </div>
          </div>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-400">
          Для верификации личности загрузите два фото. После проверки администратором ваш профиль получит статус «Проверен».
        </p>

        {/* Face photo */}
        <div>
          <label className="label">Фото лица (селфи)</label>
          <div
            onClick={() => faceInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 transition-colors"
          >
            {facePreview ? (
              <div className="relative inline-block">
                <img src={facePreview} alt="Face preview" className="max-h-40 rounded-xl" />
                <p className="text-xs text-slate-500 mt-2">Нажмите, чтобы изменить</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <User className="w-10 h-10 text-slate-400" />
                <span className="text-sm text-slate-500">Нажмите, чтобы загрузить</span>
              </div>
            )}
            <input ref={faceInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleFileSelect(e, 'face')} />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Хорошее освещение, лицо видно чётко, без фильтров. JPG/PNG/WebP, до 5 МБ.</p>
        </div>

        {/* Passport photo */}
        <div>
          <label className="label">Фото паспорта / ID</label>
          <div
            onClick={() => passportInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 transition-colors"
          >
            {passportPreview ? (
              <div className="relative inline-block">
                <img src={passportPreview} alt="Passport preview" className="max-h-40 rounded-xl" />
                <p className="text-xs text-slate-500 mt-2">Нажмите, чтобы изменить</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-10 h-10 text-slate-400" />
                <span className="text-sm text-slate-500">Нажмите, чтобы загрузить</span>
              </div>
            )}
            <input ref={passportInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleFileSelect(e, 'passport')} />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Все четыре угла видны, текст читаем, без бликов. JPG/PNG/WebP, до 5 МБ.</p>
        </div>

        <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            Загруженные документы видны только администраторам для проверки. Вы не сможете просмотреть их после отправки.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 bg-error-50 dark:bg-error-900/20 text-error-700 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <button onClick={handleClose} className="btn-secondary">Отмена</button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !faceFile || !passportFile}
            className="btn-primary"
          >
            {uploading ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            {isRejected ? 'Отправить заново' : 'Отправить на проверку'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
