export type Language = 'ru' | 'uz' | 'kz' | 'en';

export const translations: Record<Language, Record<string, string>> = {
  ru: {
    // Navigation
    'nav.gigs': 'Услуги',
    'nav.board': 'Тендеры',
    'nav.chat': 'Сообщения',
    'nav.kanban': 'Доска задач',
    'nav.passport': 'Паспорт',
    'nav.analytics': 'Аналитика',
    'nav.companies': 'Компании',
    'nav.premium': 'Premium',
    'nav.settings': 'Настройки',
    'nav.dashboard': 'Кабинет',
    'nav.logout': 'Выйти',
    // Landing
    'landing.hero.title': 'Найдите эксперта или станьте им',
    'landing.hero.subtitle': 'Маркетплейс фриланс-услуг для Центральной Азии',
    'landing.hero.cta': 'Начать бесплатно',
    'landing.hero.search': 'Что вам нужно сделать?',
    // Common
    'common.search': 'Поиск',
    'common.price': 'Цена',
    'common.from': 'от',
    'common.delivery': 'Срок',
    'common.days': 'дн',
    'common.order': 'Заказать',
    'common.view': 'Смотреть',
    'common.edit': 'Редактировать',
    'common.delete': 'Удалить',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.create': 'Создать',
    'common.loading': 'Загрузка...',
    'common.noData': 'Нет данных',
    'common.error': 'Ошибка',
    'common.all': 'Все',
    'common.category': 'Категория',
    'common.budget': 'Бюджет',
    'common.status': 'Статус',
    'common.actions': 'Действия',
  },
  uz: {
    'nav.gigs': 'Xizmatlar',
    'nav.board': 'Tenderlar',
    'nav.chat': 'Xabarlar',
    'nav.kanban': 'Vazifalar taxtasi',
    'nav.passport': 'Pasport',
    'nav.analytics': 'Analitika',
    'nav.companies': 'Kompaniyalar',
    'nav.premium': 'Premium',
    'nav.settings': 'Sozlamalar',
    'nav.dashboard': 'Kabinet',
    'nav.logout': 'Chiqish',
  },
  kz: {
    'nav.gigs': 'Қызметтер',
    'nav.board': 'Тендерлер',
    'nav.chat': 'Хабарламалар',
    'nav.kanban': 'Тапсырмалар тақтасы',
    'nav.passport': 'Паспорт',
    'nav.analytics': 'Аналитика',
    'nav.companies': 'Компаниялар',
    'nav.premium': 'Premium',
    'nav.settings': 'Параметрлер',
    'nav.dashboard': 'Кабинет',
    'nav.logout': 'Шығу',
  },
  en: {
    'nav.gigs': 'Services',
    'nav.board': 'Tenders',
    'nav.chat': 'Messages',
    'nav.kanban': 'Task Board',
    'nav.passport': 'Passport',
    'nav.analytics': 'Analytics',
    'nav.companies': 'Companies',
    'nav.premium': 'Premium',
    'nav.settings': 'Settings',
    'nav.dashboard': 'Dashboard',
    'nav.logout': 'Log out',
  },
};

let currentLanguage: Language = 'ru';

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: string): string {
  return translations[currentLanguage]?.[key] ?? translations.ru[key] ?? key;
}
