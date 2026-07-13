/*
# SkillBridge — Freelance Marketplace Schema

## Overview
Creates the full data model for a Fiverr/Kwork-style freelance marketplace connecting
freelancers and employers in Central Asia. Default language is Russian.

## New Tables
1. `profiles` — extends auth.users with marketplace-specific fields (role, display name, bio, avatar, verification status, skills, rating, balance, premium status, admin flag).
2. `gigs` — services offered by freelancers (title, description, price, category, delivery days, images, stats).
3. `orders` — orders placed on gigs (status, price, requirements, delivery).
4. `projects` — tender/bidding board projects posted by employers (title, description, budget, deadline, category, status).
5. `bids` — proposals submitted by freelancers on projects (bid amount, delivery days, message, status).
6. `chats` — 1:1 conversation threads between two users.
7. `messages` — individual messages within a chat.
8. `notifications` — user notifications (type, read status, payload).
9. `reviews` — reviews left by buyers on completed orders.
10. `companies` — company profiles (name, description, industry, size, website, logo).
11. `jobs` — job listings posted by companies/employers (title, description, salary, type, location).
12. `tasks` — kanban tasks tied to an order or project (title, description, status column, position).
13. `favorites` — gigs saved/favorited by a user.

## Security
- RLS enabled on ALL tables.
- Profiles are publicly readable; self-managed by owner.
- Marketplace content (gigs, projects, companies, jobs) is publicly readable; managed by owner.
- Chats/messages scoped to participants.
- Notifications, reviews, bids, tasks, favorites scoped to owner or relevant parties.
- All policies use auth.uid() for ownership.
- Owner columns default to auth.uid() so inserts work from the client.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  display_name text,
  role text NOT NULL DEFAULT 'freelancer' CHECK (role IN ('freelancer','employer','admin')),
  bio text,
  avatar_url text,
  phone text,
  location text,
  skills text[] DEFAULT '{}',
  categories text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  is_verified boolean NOT NULL DEFAULT false,
  verification_level text DEFAULT 'none' CHECK (verification_level IN ('none','phone','identity','full')),
  rating numeric(3,2) DEFAULT 0,
  review_count int DEFAULT 0,
  completed_orders int DEFAULT 0,
  balance numeric(12,2) DEFAULT 0,
  is_premium boolean NOT NULL DEFAULT false,
  premium_until timestamptz,
  is_admin boolean NOT NULL DEFAULT false,
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  response_rate int DEFAULT 100,
  response_time text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- GIGS
CREATE TABLE IF NOT EXISTS gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  price numeric(12,2) NOT NULL DEFAULT 0,
  delivery_days int DEFAULT 3,
  revisions int DEFAULT 1,
  image_urls text[] DEFAULT '{}',
  gallery text[] DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active','paused','draft','deleted')),
  orders_count int DEFAULT 0,
  views int DEFAULT 0,
  rating numeric(3,2) DEFAULT 0,
  review_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gigs_public_read" ON gigs;
CREATE POLICY "gigs_public_read" ON gigs FOR SELECT TO authenticated USING (status = 'active');

DROP POLICY IF EXISTS "gigs_insert_own" ON gigs;
CREATE POLICY "gigs_insert_own" ON gigs FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "gigs_update_own" ON gigs;
CREATE POLICY "gigs_update_own" ON gigs FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "gigs_delete_own" ON gigs;
CREATE POLICY "gigs_delete_own" ON gigs FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid REFERENCES gigs(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','delivered','completed','cancelled','disputed')),
  price numeric(12,2) NOT NULL DEFAULT 0,
  requirements text,
  delivery_deadline timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_parties_read" ON orders;
CREATE POLICY "orders_parties_read" ON orders FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "orders_insert_buyer" ON orders;
CREATE POLICY "orders_insert_buyer" ON orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "orders_update_parties" ON orders;
CREATE POLICY "orders_update_parties" ON orders FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- PROJECTS (tender board)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  budget_fixed numeric(12,2),
  deadline timestamptz,
  duration_days int,
  attachments text[] DEFAULT '{}',
  skills_required text[] DEFAULT '{}',
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  bids_count int DEFAULT 0,
  views int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_public_read" ON projects;
CREATE POLICY "projects_public_read" ON projects FOR SELECT TO authenticated USING (status IN ('open','in_progress','completed'));

DROP POLICY IF EXISTS "projects_insert_own" ON projects;
CREATE POLICY "projects_insert_own" ON projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "projects_update_own" ON projects;
CREATE POLICY "projects_update_own" ON projects FOR UPDATE TO authenticated USING (auth.uid() = employer_id) WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "projects_delete_own" ON projects;
CREATE POLICY "projects_delete_own" ON projects FOR DELETE TO authenticated USING (auth.uid() = employer_id);

-- BIDS
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  freelancer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  bid_amount numeric(12,2) NOT NULL,
  delivery_days int NOT NULL DEFAULT 7,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bids_read" ON bids;
CREATE POLICY "bids_read" ON bids FOR SELECT TO authenticated
  USING (auth.uid() = freelancer_id OR EXISTS (SELECT 1 FROM projects WHERE projects.id = bids.project_id AND projects.employer_id = auth.uid()));

DROP POLICY IF EXISTS "bids_insert_own" ON bids;
CREATE POLICY "bids_insert_own" ON bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "bids_update_own" ON bids;
CREATE POLICY "bids_update_own" ON bids FOR UPDATE TO authenticated USING (auth.uid() = freelancer_id) WITH CHECK (auth.uid() = freelancer_id);

-- CHATS
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  related_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  related_gig_id uuid REFERENCES gigs(id) ON DELETE SET NULL,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chats_participants_read" ON chats;
CREATE POLICY "chats_participants_read" ON chats FOR SELECT TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

DROP POLICY IF EXISTS "chats_insert_participants" ON chats;
CREATE POLICY "chats_insert_participants" ON chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

DROP POLICY IF EXISTS "chats_update_participants" ON chats;
CREATE POLICY "chats_update_participants" ON chats FOR UPDATE TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2)
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  attachments text[] DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_participants_read" ON messages;
CREATE POLICY "messages_participants_read" ON messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())));

DROP POLICY IF EXISTS "messages_insert_sender" ON messages;
CREATE POLICY "messages_insert_sender" ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())));

DROP POLICY IF EXISTS "messages_update_participants" ON messages;
CREATE POLICY "messages_update_participants" ON messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())));

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('order','message','bid','review','system','payment','verification','premium')),
  title text NOT NULL,
  body text,
  link text,
  is_read boolean DEFAULT false,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own_read" ON notifications;
CREATE POLICY "notifications_own_read" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_own_insert" ON notifications;
CREATE POLICY "notifications_own_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_own_update" ON notifications;
CREATE POLICY "notifications_own_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_own_delete" ON notifications;
CREATE POLICY "notifications_own_delete" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gig_id uuid REFERENCES gigs(id) ON DELETE SET NULL,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_reviewer" ON reviews;
CREATE POLICY "reviews_insert_reviewer" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- COMPANIES
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  industry text,
  size text CHECK (size IN ('1-10','11-50','51-200','201-500','500+')),
  website text,
  logo_url text,
  location text,
  is_verified boolean DEFAULT false,
  employees_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_public_read" ON companies;
CREATE POLICY "companies_public_read" ON companies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "companies_insert_own" ON companies;
CREATE POLICY "companies_insert_own" ON companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "companies_update_own" ON companies;
CREATE POLICY "companies_update_own" ON companies FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "companies_delete_own" ON companies;
CREATE POLICY "companies_delete_own" ON companies FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- JOBS
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  employer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  currency text DEFAULT 'USD',
  job_type text DEFAULT 'full_time' CHECK (job_type IN ('full_time','part_time','contract','internship','remote')),
  experience_level text DEFAULT 'mid' CHECK (experience_level IN ('entry','mid','senior','lead')),
  location text,
  is_remote boolean DEFAULT false,
  skills_required text[] DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active','closed','draft')),
  applicants_count int DEFAULT 0,
  views int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_public_read" ON jobs;
CREATE POLICY "jobs_public_read" ON jobs FOR SELECT TO authenticated USING (status = 'active');

DROP POLICY IF EXISTS "jobs_insert_own" ON jobs;
CREATE POLICY "jobs_insert_own" ON jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "jobs_update_own" ON jobs;
CREATE POLICY "jobs_update_own" ON jobs FOR UPDATE TO authenticated USING (auth.uid() = employer_id) WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "jobs_delete_own" ON jobs;
CREATE POLICY "jobs_delete_own" ON jobs FOR DELETE TO authenticated USING (auth.uid() = employer_id);

-- TASKS (Kanban)
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  related_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  related_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  position int DEFAULT 0,
  due_date timestamptz,
  labels text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_own_read" ON tasks;
CREATE POLICY "tasks_own_read" ON tasks FOR SELECT TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "tasks_own_insert" ON tasks;
CREATE POLICY "tasks_own_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "tasks_own_update" ON tasks;
CREATE POLICY "tasks_own_update" ON tasks FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "tasks_own_delete" ON tasks;
CREATE POLICY "tasks_own_delete" ON tasks FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- FAVORITES
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, gig_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_own_read" ON favorites;
CREATE POLICY "favorites_own_read" ON favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_own_insert" ON favorites;
CREATE POLICY "favorites_own_insert" ON favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_own_delete" ON favorites;
CREATE POLICY "favorites_own_delete" ON favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_gigs_seller ON gigs(seller_id);
CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category);
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_projects_employer ON projects(employer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_bids_project ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_freelancer ON bids(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Handle new user signup: automatically create a profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
