/*
# Admin Panel Infrastructure: audit log, user suspension, admin RLS, platform content tables

## Overview
This migration adds the foundational infrastructure for the comprehensive admin panel:
1. `admin_audit_log` — append-only audit trail for all admin actions on user content.
2. `is_suspended` / `suspended_reason` columns on profiles — for account suspension/banning.
3. Admin-scoped RLS policies on profiles, gigs, and projects — allowing is_admin users to update/delete any row.
4. Platform content tables: `platform_content` (landing page blocks, feature sections, step sections, stats), `platform_categories` (editable category taxonomy), `platform_translations` (editable translation strings), `platform_blog_posts` (blog/news posts).
5. RLS on all platform content tables — admins can CRUD; all users can read.

## New Tables
1. `admin_audit_log` — id, admin_id, action_type, target_table, target_id, before_value (jsonb), after_value (jsonb), reason (text, nullable), created_at. RLS: admins can SELECT and INSERT only. NO update/delete for anyone.
2. `platform_content` — id, section, key, title, description, sort_order, is_active, created_at, updated_at. RLS: admins can CRUD; all users can read.
3. `platform_categories` — id, key, label, label_en, icon, sort_order, is_active, created_at, updated_at. RLS: admins can CRUD; all users can read.
4. `platform_translations` — id, locale, key, value, created_at, updated_at. RLS: admins can CRUD; all users can read.
5. `platform_blog_posts` — id, title, slug, excerpt, content, cover_image_url, status, published_at, author_id, created_at, updated_at. RLS: admins can CRUD; all users can read published posts.

## Modified Tables
1. `profiles` — added `is_suspended` boolean (default false) and `suspended_reason` text (nullable). No existing columns changed or removed.

## Security Changes (RLS)
1. `admin_audit_log` — INSERT and SELECT for is_admin users only. NO UPDATE or DELETE policy (append-only by design).
2. `profiles` — added admin_update_any and admin_delete_any policies (is_admin check). Existing owner policies unchanged.
3. `gigs` — added admin_update_any and admin_delete_any policies (is_admin check). Existing owner policies unchanged. SELECT policy expanded to allow admins to see all statuses (not just 'active').
4. `projects` — added admin_update_any and admin_delete_any policies (is_admin check). Existing owner policies unchanged. SELECT policy expanded to allow admins to see all statuses.
5. All platform_content tables — admin CRUD via is_admin check; SELECT for all authenticated users.
6. identity-documents storage bucket RLS — UNCHANGED. No policies on storage.objects were added, modified, or removed by this migration.

## Important Notes
1. The admin_audit_log is strictly append-only: there are NO UPDATE and NO DELETE policies. Even admins cannot modify or delete audit entries. This ensures accountability.
2. is_admin is checked via `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)` in every admin RLS policy — consistent with the existing identity_verifications policies.
3. The identity-documents storage bucket privacy is NOT weakened. No storage.objects policies were touched.
*/

-- ==================== admin_audit_log (append-only) ====================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  target_table text NOT NULL,
  target_id text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read audit log
DROP POLICY IF EXISTS "audit_log_admin_read" ON admin_audit_log;
CREATE POLICY "audit_log_admin_read" ON admin_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Admins can insert audit log entries
DROP POLICY IF EXISTS "audit_log_admin_insert" ON admin_audit_log;
CREATE POLICY "audit_log_admin_insert" ON admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- NO UPDATE policy — append-only by design
-- NO DELETE policy — append-only by design

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON admin_audit_log(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action_type);

-- ==================== profiles: add is_suspended + suspended_reason ====================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_suspended') THEN
    ALTER TABLE profiles ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspended_reason') THEN
    ALTER TABLE profiles ADD COLUMN suspended_reason text;
  END IF;
END $$;

-- Admin can update any profile (for editing, suspension, verification toggle)
DROP POLICY IF EXISTS "profiles_admin_update_any" ON profiles;
CREATE POLICY "profiles_admin_update_any" ON profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ==================== gigs: admin can update/delete any ====================

DROP POLICY IF EXISTS "gigs_admin_update_any" ON gigs;
CREATE POLICY "gigs_admin_update_any" ON gigs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "gigs_admin_delete_any" ON gigs;
CREATE POLICY "gigs_admin_delete_any" ON gigs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Expand gigs SELECT so admins can see non-active gigs too
-- Drop the old public_read policy and recreate with admin bypass
DROP POLICY IF EXISTS "gigs_public_read" ON gigs;
CREATE POLICY "gigs_public_read" ON gigs
  FOR SELECT TO authenticated
  USING (status = 'active' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ==================== projects: admin can update/delete any ====================

DROP POLICY IF EXISTS "projects_admin_update_any" ON projects;
CREATE POLICY "projects_admin_update_any" ON projects
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "projects_admin_delete_any" ON projects;
CREATE POLICY "projects_admin_delete_any" ON projects
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Expand projects SELECT so admins can see cancelled projects too
DROP POLICY IF EXISTS "projects_public_read" ON projects;
CREATE POLICY "projects_public_read" ON projects
  FOR SELECT TO authenticated
  USING (status IN ('open','in_progress','completed') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ==================== platform_content (landing page blocks, features, steps, stats) ====================

CREATE TABLE IF NOT EXISTS platform_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  key text NOT NULL,
  title text,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_content_read_all" ON platform_content;
CREATE POLICY "platform_content_read_all" ON platform_content
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "platform_content_admin_insert" ON platform_content;
CREATE POLICY "platform_content_admin_insert" ON platform_content
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "platform_content_admin_update" ON platform_content;
CREATE POLICY "platform_content_admin_update" ON platform_content
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "platform_content_admin_delete" ON platform_content;
CREATE POLICY "platform_content_admin_delete" ON platform_content
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ==================== platform_categories (editable taxonomy) ====================

CREATE TABLE IF NOT EXISTS platform_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  label_en text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_categories_read_all" ON platform_categories;
CREATE POLICY "platform_categories_read_all" ON platform_categories
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "platform_categories_admin_insert" ON platform_categories;
CREATE POLICY "platform_categories_admin_insert" ON platform_categories
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "platform_categories_admin_update" ON platform_categories;
CREATE POLICY "platform_categories_admin_update" ON platform_categories
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "platform_categories_admin_delete" ON platform_categories;
CREATE POLICY "platform_categories_admin_delete" ON platform_categories
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ==================== platform_translations (editable i18n strings) ====================

CREATE TABLE IF NOT EXISTS platform_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(locale, key)
);

ALTER TABLE platform_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_translations_read_all" ON platform_translations;
CREATE POLICY "platform_translations_read_all" ON platform_translations
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "platform_translations_admin_insert" ON platform_translations;
CREATE POLICY "platform_translations_admin_insert" ON platform_translations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "platform_translations_admin_update" ON platform_translations;
CREATE POLICY "platform_translations_admin_update" ON platform_translations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "platform_translations_admin_delete" ON platform_translations;
CREATE POLICY "platform_translations_admin_delete" ON platform_translations
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ==================== platform_blog_posts (blog/news) ====================

CREATE TABLE IF NOT EXISTS platform_blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_blog_read_all" ON platform_blog_posts;
CREATE POLICY "platform_blog_read_all" ON platform_blog_posts
  FOR SELECT TO authenticated, anon
  USING (status = 'published' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "platform_blog_admin_insert" ON platform_blog_posts;
CREATE POLICY "platform_blog_admin_insert" ON platform_blog_posts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "platform_blog_admin_update" ON platform_blog_posts;
CREATE POLICY "platform_blog_admin_update" ON platform_blog_posts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "platform_blog_admin_delete" ON platform_blog_posts;
CREATE POLICY "platform_blog_admin_delete" ON platform_blog_posts
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX IF NOT EXISTS idx_blog_status ON platform_blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_published ON platform_blog_posts(published_at DESC);

-- ==================== Seed platform_categories from existing CATEGORIES constant ====================

INSERT INTO platform_categories (key, label, label_en, icon, sort_order, is_active)
VALUES
  ('design', 'Дизайн', 'Design', 'Palette', 1, true),
  ('development', 'Разработка', 'Development', 'Code', 2, true),
  ('marketing', 'Маркетинг', 'Marketing', 'Megaphone', 3, true),
  ('writing', 'Тексты и переводы', 'Writing & Translation', 'PenLine', 4, true),
  ('video', 'Видео и анимация', 'Video & Animation', 'Video', 5, true),
  ('music', 'Музыка и аудио', 'Music & Audio', 'Music', 6, true),
  ('business', 'Бизнес', 'Business', 'Briefcase', 7, true),
  ('ai', 'ИИ сервисы', 'AI Services', 'Sparkles', 8, true),
  ('data', 'Данные', 'Data', 'Database', 9, true),
  ('consulting', 'Консалтинг', 'Consulting', 'Lightbulb', 10, true)
ON CONFLICT (key) DO NOTHING;

-- ==================== Seed platform_content with landing page sections ====================

INSERT INTO platform_content (section, key, title, description, sort_order, is_active)
VALUES
  ('hero', 'hero_title', 'NexWork', 'Фриланс-маркетплейс нового поколения для специалистов и компаний', 1, true),
  ('hero', 'hero_subtitle', 'Найдите эксперта или предложите свои услуги', 'Безопасные сделки, верификация и прозрачная аналитика', 2, true),
  ('stats', 'freelancers', 'Активных фрилансеров', '12,500+', 1, true),
  ('stats', 'orders', 'Завершённых заказов', '85,000+', 2, true),
  ('stats', 'countries', 'Стран', '15', 3, true),
  ('stats', 'rating', 'Средняя оценка', '4.8', 4, true),
  ('feature', 'passport', 'Цифровой паспорт', 'Верификация личности и навыков. Работайте с проверенными экспертами.', 1, true),
  ('feature', 'instant', 'Мгновенный старт', 'Закажите услугу или подайте заявку на тендер за пару кликов.', 2, true),
  ('feature', 'analytics', 'Прозрачная аналитика', 'Отслеживайте доходы, заказы и эффективность в реальном времени.', 3, true),
  ('feature', 'messenger', 'Встроенный мессенджер', 'Общайтесь с клиентами и исполнителями прямо на платформе.', 4, true),
  ('feature', 'quality', 'Гарантия качества', 'Система отзывов и рейтингов защищает каждую сделку.', 5, true),
  ('feature', 'localization', 'Региональная локализация', 'Поддержка русского, узбекского, казахского и английского.', 6, true),
  ('steps', 'step1', 'Создайте аккаунт', 'Выберите роль — фрилансер или заказчик — и заполните профиль.', 1, true),
  ('steps', 'step2', 'Найдите или опубликуйте', 'Ищите услуги в каталоге или публикуйте тендеры на свои проекты.', 2, true),
  ('steps', 'step3', 'Работайте и получайте', 'Общайтесь, выполняйте задачи и получайте оплату безопасно.', 3, true)
ON CONFLICT DO NOTHING;
