/*
# Admin-managed ad banners

## What
Small promotional banners shown at the top of the dashboard Overview
screen. Admins create/edit/delete them from the Admin panel; any
authenticated user can read active ones.
*/

CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  link_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_read_authenticated" ON ads;
CREATE POLICY "ads_read_authenticated" ON ads
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "ads_admin_insert" ON ads;
CREATE POLICY "ads_admin_insert" ON ads
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "ads_admin_update" ON ads;
CREATE POLICY "ads_admin_update" ON ads
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "ads_admin_delete" ON ads;
CREATE POLICY "ads_admin_delete" ON ads
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
