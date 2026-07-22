export const CATEGORIES = [
  { key: 'design', label: 'Дизайн', labelEn: 'Design', labelUz: 'Dizayn', icon: 'Palette' },
  { key: 'development', label: 'Разработка', labelEn: 'Development', labelUz: 'Dasturlash', icon: 'Code' },
  { key: 'marketing', label: 'Маркетинг', labelEn: 'Marketing', labelUz: 'Marketing', icon: 'Megaphone' },
  { key: 'writing', label: 'Тексты и переводы', labelEn: 'Writing & Translation', labelUz: 'Matn va tarjima', icon: 'PenLine' },
  { key: 'video', label: 'Видео и анимация', labelEn: 'Video & Animation', labelUz: 'Video va animatsiya', icon: 'Video' },
  { key: 'music', label: 'Музыка и аудио', labelEn: 'Music & Audio', labelUz: 'Musiqa va audio', icon: 'Music' },
  { key: 'business', label: 'Бизнес', labelEn: 'Business', labelUz: 'Biznes', icon: 'Briefcase' },
  { key: 'ai', label: 'ИИ сервисы', labelEn: 'AI Services', labelUz: 'SI xizmatlari', icon: 'Sparkles' },
  { key: 'data', label: 'Данные', labelEn: 'Data', labelUz: 'Maʼlumotlar', icon: 'Database' },
  { key: 'consulting', label: 'Консалтинг', labelEn: 'Consulting', labelUz: 'Konsalting', icon: 'Lightbulb' },
];

export const SKILLS_LIBRARY = [
  'React', 'TypeScript', 'Node.js', 'Python', 'UI/UX Design', 'Figma',
  'Photoshop', 'Illustrator', 'After Effects', 'Premiere Pro', 'WordPress',
  'Shopify', 'SEO', 'SMM', 'Контент-маркетинг', 'Копирайтинг', 'Брендинг',
  'Логотип', '3D-моделирование', 'Blender', 'Мобильная разработка', 'Flutter',
  'Swift', 'Kotlin', 'Go', 'Rust', 'Vue.js', 'Next.js', 'Tailwind CSS',
  'Бухгалтерия', 'Юридические услуги', 'Перевод', 'Транскрибация', 'Озвучка',
  'Монтаж видео', 'Анимация', 'Data Science', 'Machine Learning', 'SQL',
];

export const GIG_CATEGORIES = CATEGORIES;

export const DELIVERY_OPTIONS = [
  { key: '1', label: '1 день', value: 1 },
  { key: '3', label: 'до 3 дней', value: 3 },
  { key: '7', label: 'до 7 дней', value: 7 },
  { key: '14', label: 'до 14 дней', value: 14 },
  { key: '30', label: 'до 30 дней', value: 30 },
];

export const LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: 'RU' },
  { code: 'uz', label: 'O\'zbek', flag: 'UZ' },
  { code: 'en', label: 'English', flag: 'EN' },
];

export const ORDER_STATUS_LABELS: Record<string, { ru: string; color: string }> = {
  pending: { ru: 'Ожидает оплаты', color: 'amber' },
  active: { ru: 'В работе', color: 'blue' },
  delivered: { ru: 'Доставлен', color: 'purple' },
  completed: { ru: 'Завершён', color: 'green' },
  cancelled: { ru: 'Отменён', color: 'red' },
  disputed: { ru: 'Спор', color: 'red' },
};

export const PROJECT_STATUS_LABELS: Record<string, { ru: string; color: string }> = {
  open: { ru: 'Открыт', color: 'green' },
  in_progress: { ru: 'В работе', color: 'blue' },
  completed: { ru: 'Завершён', color: 'gray' },
  cancelled: { ru: 'Отменён', color: 'red' },
};

export const TASK_COLUMNS = [
  { key: 'todo', label: 'К выполнению', labelUz: 'Bajarish kerak', labelEn: 'To Do', color: 'slate' },
  { key: 'in_progress', label: 'В работе', labelUz: 'Jarayonda', labelEn: 'In Progress', color: 'blue' },
  { key: 'review', label: 'На проверке', labelUz: 'Tekshiruvda', labelEn: 'Review', color: 'amber' },
  { key: 'done', label: 'Готово', labelUz: 'Tayyor', labelEn: 'Done', color: 'green' },
];

export const PRIORITY_LABELS: Record<string, { ru: string; uz: string; en: string; color: string }> = {
  low: { ru: 'Низкий', uz: 'Past', en: 'Low', color: 'slate' },
  medium: { ru: 'Средний', uz: 'Oʻrtacha', en: 'Medium', color: 'blue' },
  high: { ru: 'Высокий', uz: 'Yuqori', en: 'High', color: 'amber' },
  urgent: { ru: 'Срочный', uz: 'Shoshilinch', en: 'Urgent', color: 'red' },
};

export const JOB_TYPE_LABELS: Record<string, { ru: string; uz: string; en: string }> = {
  full_time: { ru: 'Полная занятость', uz: 'Toʻliq stavka', en: 'Full-time' },
  part_time: { ru: 'Частичная занятость', uz: 'Yarim stavka', en: 'Part-time' },
  contract: { ru: 'Контракт', uz: 'Shartnoma', en: 'Contract' },
  internship: { ru: 'Стажировка', uz: 'Amaliyot', en: 'Internship' },
  remote: { ru: 'Удалённо', uz: 'Masofaviy', en: 'Remote' },
};

export const COMPANY_SIZES = [
  { key: '1-10', label: '1 — 10 человек', labelUz: '1 — 10 kishi', labelEn: '1 — 10 people' },
  { key: '11-50', label: '11 — 50 человек', labelUz: '11 — 50 kishi', labelEn: '11 — 50 people' },
  { key: '51-200', label: '51 — 200 человек', labelUz: '51 — 200 kishi', labelEn: '51 — 200 people' },
  { key: '201-500', label: '201 — 500 человек', labelUz: '201 — 500 kishi', labelEn: '201 — 500 people' },
  { key: '500+', label: '500+ человек', labelUz: '500+ kishi', labelEn: '500+ people' },
];

export const pexelsImage = (id: number, w = 600, h = 400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

export const AVATAR_FALLBACK = (name: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}&backgroundColor=2563eb,1d4ed8,0d9488,7c3aed,db2777&textColor=ffffff`;

export function getAvatarUrl(profile: { avatar_url?: string | null; display_name?: string | null; full_name?: string | null; email?: string }): string {
  if (profile.avatar_url) return profile.avatar_url;
  const name = profile.display_name || profile.full_name || profile.email || 'User';
  return AVATAR_FALLBACK(name);
}

export const NEXWORK_TG = 'https://t.me/nexwork_uz';
export const NEXWORK_PHONE = '+998200103133';
