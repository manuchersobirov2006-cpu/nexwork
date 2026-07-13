/*
# Seed demo marketplace data

Creates demo profiles, gigs, projects, companies, and jobs
so the marketplace isn't empty for new users.
*/

DO $$
DECLARE
  demo_freelancer1 uuid;
  demo_freelancer2 uuid;
  demo_freelancer3 uuid;
  demo_employer1 uuid;
BEGIN
  demo_freelancer1 := 'a0000000-0000-4000-8000-000000000001';
  demo_freelancer2 := 'a0000000-0000-4000-8000-000000000002';
  demo_freelancer3 := 'a0000000-0000-4000-8000-000000000003';
  demo_employer1 := 'a0000000-0000-4000-8000-000000000004';

  -- Create demo auth users
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES
    (demo_freelancer1, 'demo.designer@skillbridge.test', crypt('demo123456', gen_salt('bf')), now(), now(), now(), '{"full_name":"Анна Ким"}'),
    (demo_freelancer2, 'demo.dev@skillbridge.test', crypt('demo123456', gen_salt('bf')), now(), now(), now(), '{"full_name":"Дмитрий Волков"}'),
    (demo_freelancer3, 'demo.marketing@skillbridge.test', crypt('demo123456', gen_salt('bf')), now(), now(), now(), '{"full_name":"Сабина Юсупова"}'),
    (demo_employer1, 'demo.employer@skillbridge.test', crypt('demo123456', gen_salt('bf')), now(), now(), now(), '{"full_name":"Тимур Ахмедов"}')
  ON CONFLICT (id) DO NOTHING;

  -- Create profiles
  INSERT INTO profiles (id, email, full_name, display_name, role, bio, location, skills, categories, languages, is_verified, verification_level, rating, review_count, completed_orders, is_premium, response_rate, response_time)
  VALUES
    (demo_freelancer1, 'demo.designer@skillbridge.test', 'Анна Ким', 'Анна Ким', 'freelancer',
     'UI/UX дизайнер с 6-летним опытом. Создаю современные интерфейсы, логотипы и брендбуки.',
     'Ташкент, Узбекистан', ARRAY['Figma','UI/UX Design','Photoshop','Иллюстрация','Брендинг'], ARRAY['design'], ARRAY['Русский','English','한국어'],
     true, 'full', 4.9, 127, 156, true, 98, '~ 1 час'),
    (demo_freelancer2, 'demo.dev@skillbridge.test', 'Дмитрий Волков', 'Дмитрий Волков', 'freelancer',
     'Full-stack разработчик. React, Node.js, TypeScript. Создаю веб-приложения и API.',
     'Алматы, Казахстан', ARRAY['React','TypeScript','Node.js','Next.js','SQL','Python'], ARRAY['development'], ARRAY['Русский','English'],
     true, 'full', 4.8, 89, 102, false, 95, '~ 2 часа'),
    (demo_freelancer3, 'demo.marketing@skillbridge.test', 'Сабина Юсупова', 'Сабина Юсупова', 'freelancer',
     'Маркетолог и SMM-специалист. Запускаю рекламные кампании, веду соцсети, пишу контент.',
     'Бишкек, Кыргызстан', ARRAY['SEO','SMM','Контент-маркетинг','Копирайтинг','Google Ads'], ARRAY['marketing','writing'], ARRAY['Русский','Кыргызча','English'],
     true, 'identity', 4.7, 64, 78, false, 92, '~ 3 часа'),
    (demo_employer1, 'demo.employer@skillbridge.test', 'Тимур Ахмедов', 'Тимур Ахмедов', 'employer',
     'Основатель IT-стартапа. Ищу исполнителей для проектов компании.',
     'Ташкент, Узбекистан', ARRAY[]::text[], ARRAY[]::text[], ARRAY['Русский','English'],
     false, 'phone', 0, 0, 0, false, 100, NULL)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    skills = EXCLUDED.skills,
    categories = EXCLUDED.categories,
    languages = EXCLUDED.languages,
    is_verified = EXCLUDED.is_verified,
    verification_level = EXCLUDED.verification_level,
    rating = EXCLUDED.rating,
    review_count = EXCLUDED.review_count,
    completed_orders = EXCLUDED.completed_orders,
    is_premium = EXCLUDED.is_premium;

  -- Create demo gigs
  INSERT INTO gigs (seller_id, title, description, category, tags, price, delivery_days, revisions, status, orders_count, views, rating, review_count)
  VALUES
    (demo_freelancer1, 'Создам современный логотип для вашего бренда', 'Разработаю уникальный логотип в современном стиле. Включает: 3 концепции, неограниченные правки, все форматы (AI, PNG, SVG, PDF).', 'design', ARRAY['логотип','брендинг','графика'], 45, 2, 3, 'active', 234, 1820, 4.9, 89),
    (demo_freelancer1, 'Дизайн лендинга в Figma', 'Создам современный дизайн лендинга в Figma. Адаптивный, с анимациями. До 5 экранов.', 'design', ARRAY['figma','лендинг','ui'], 120, 5, 2, 'active', 87, 940, 4.8, 34),
    (demo_freelancer1, 'Разработаю брендбук компании', 'Полный брендбук: логотип, цвета, шрифты, паттерны, визитки, бланки. 30+ страниц.', 'design', ARRAY['брендбук','брендинг','логотип'], 350, 10, 3, 'active', 45, 620, 5.0, 22),
    (demo_freelancer2, 'Разработаю веб-приложение на React + TypeScript', 'Full-stack разработка на React, TypeScript, Node.js. Чистый код, тесты, документация.', 'development', ARRAY['react','typescript','nodejs','веб'], 500, 14, 3, 'active', 56, 1100, 4.9, 28),
    (demo_freelancer2, 'Создам Telegram бота на Node.js', 'Разработка Telegram бота любой сложности. Интеграции с API, платёжные системы.', 'development', ARRAY['telegram','bot','nodejs'], 150, 5, 2, 'active', 134, 2100, 4.8, 67),
    (demo_freelancer2, 'Настрою сервер и деплой на VPS', 'Настройка Linux сервера, Docker, Nginx, SSL. Деплой вашего приложения.', 'development', ARRAY['devops','docker','linux'], 80, 2, 1, 'active', 78, 870, 4.7, 41),
    (demo_freelancer3, 'Веду Instagram и TikTok для бизнеса', 'Контент-план, создание постов, сторис, рилс. Аналитика и отчётность.', 'marketing', ARRAY['smm','instagram','tiktok'], 200, 7, 4, 'active', 92, 1450, 4.8, 52),
    (demo_freelancer3, 'SEO-оптимизация сайта', 'Технический аудит, семантическое ядро, оптимизация контента. Рост позиций в Google.', 'marketing', ARRAY['seo','google','оптимизация'], 300, 14, 2, 'active', 34, 780, 4.7, 18),
    (demo_freelancer3, 'Напишу SEO-статью для блога', 'Продающие и информационные статьи на любую тему. Уникальность 95%+, SEO-оптимизация.', 'writing', ARRAY['копирайтинг','seo','статьи'], 35, 3, 2, 'active', 167, 980, 4.9, 95),
    (demo_freelancer2, 'Создам мобильное приложение на Flutter', 'Кроссплатформенное приложение на Flutter. iOS + Android. Чистый код.', 'development', ARRAY['flutter','mobile','dart'], 800, 21, 3, 'active', 23, 540, 5.0, 12),
    (demo_freelancer1, 'Монтаж и анимация видео', 'Профессиональный монтаж видео, цветокоррекция, анимация текста и переходов.', 'video', ARRAY['видео','монтаж','анимация'], 90, 4, 2, 'active', 67, 720, 4.8, 33),
    (demo_freelancer3, 'Настрою Google Ads кампанию', 'Создание и настройка рекламной кампании в Google Ads. Анализ конверсий.', 'marketing', ARRAY['google-ads','реклама','ppc'], 250, 7, 2, 'active', 41, 610, 4.6, 19)
  ON CONFLICT DO NOTHING;

  -- Create demo projects (tenders)
  INSERT INTO projects (employer_id, title, description, category, budget_min, budget_max, deadline, duration_days, skills_required, status, bids_count, views)
  VALUES
    (demo_employer1, 'Нужен интернет-магазин на React', 'Ищу разработчика для создания интернет-магазина одежды. Каталог, корзина, оплата, личный кабинет. Дизайн готов в Figma.', 'development', 1500, 3000, now() + interval '30 days', 30, ARRAY['React','Node.js','TypeScript'], 'open', 7, 234),
    (demo_employer1, 'Редизайн логотипа и фирменного стиля', 'Требуется дизайнер для обновления логотипа и создания брендбука. Стиль — минимализм, IT-сфера.', 'design', 400, 800, now() + interval '14 days', 14, ARRAY['Figma','Брендинг','Логотип'], 'open', 5, 178),
    (demo_employer1, 'SMM-менеджер для Instagram', 'Ищу SMM-специалиста для ведения Instagram аккаунта IT-компании. 12 постов в месяц + сторис.', 'marketing', 200, 500, now() + interval '60 days', 60, ARRAY['SMM','Instagram','Контент'], 'open', 4, 156),
    (demo_employer1, 'Разработка Telegram-бота для записи', 'Нужен бот для записи на услуги. Интеграция с Google Calendar, напоминания, админ-паналь.', 'development', 100, 300, now() + interval '10 days', 10, ARRAY['Node.js','Telegram','Bot'], 'open', 12, 320),
    (demo_employer1, 'SEO-продвижение лендинга', 'Требуется SEO-специалист для продвижения лендинга в Google. Ниша — юридические услуги.', 'marketing', 300, 700, now() + interval '45 days', 45, ARRAY['SEO','Google','Аналитика'], 'open', 3, 98)
  ON CONFLICT DO NOTHING;

  -- Create demo companies
  INSERT INTO companies (owner_id, name, description, industry, size, website, location, is_verified, employees_count)
  VALUES
    (demo_employer1, 'TechVision LLC', 'IT-компания, разрабатываем веб и мобильные приложения для бизнеса.', 'IT & Software', '11-50', 'techvision.example', 'Ташкент, Узбекистан', true, 25),
    (demo_employer1, 'Creative Studio', 'Дизайн-студия полного цикла. Брендинг, веб-дизайн, видеопродакшн.', 'Design', '1-10', 'creative.example', 'Алматы, Казахстан', false, 8)
  ON CONFLICT DO NOTHING;

  -- Create demo jobs
  INSERT INTO jobs (employer_id, title, description, category, salary_min, salary_max, job_type, experience_level, location, is_remote, skills_required, status, views)
  VALUES
    (demo_employer1, 'Senior Frontend Developer', 'Ищем опытного Frontend разработчика. React, TypeScript, Tailwind CSS. Работа в команде над SaaS-продуктом.', 'development', 2500, 4000, 'full_time', 'senior', 'Ташкент', true, ARRAY['React','TypeScript','Tailwind CSS'], 'active', 234),
    (demo_employer1, 'UI/UX Designer', 'Дизайнер интерфейсов в продуктовую команду. Figma, прототипирование, дизайн-системы.', 'design', 1500, 2500, 'full_time', 'mid', 'Ташкент', false, ARRAY['Figma','UI/UX','Прототипирование'], 'active', 187),
    (demo_employer1, 'Project Manager (IT)', 'Менеджер проектов в IT-компанию. Agile/Scrum, управление командой разработки.', 'business', 2000, 3500, 'full_time', 'mid', 'Алматы', true, ARRAY['Agile','Scrum','Jira'], 'active', 145)
  ON CONFLICT DO NOTHING;
END;
$$;
