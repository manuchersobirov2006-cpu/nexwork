/*
# Add portfolio items + ability to attach them to tender bids

## What
Freelancers can add portfolio projects (title, description, category,
uploaded photos, and/or an external link such as Behance or GitHub).
When bidding on a tender, they can attach one or more portfolio items
so the employer can see relevant past work directly on the bid.

## Tables
- `portfolio_items`: one row per project, owned by a profile.
- `bids.portfolio_item_ids`: uuid[] of portfolio_items attached to
  that bid.

## Storage
Portfolio images reuse the existing public `service-images` bucket
under the path `{user_id}/portfolio/{item_id}/...`, so the existing
"first folder segment = auth.uid()" owner-write policy on that bucket
already covers it — no new bucket or storage policy needed.
*/

CREATE TABLE IF NOT EXISTS portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  image_urls text[] NOT NULL DEFAULT '{}',
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_items_user_id_idx ON portfolio_items(user_id);

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio_items_read" ON portfolio_items;
CREATE POLICY "portfolio_items_read" ON portfolio_items
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "portfolio_items_owner_insert" ON portfolio_items;
CREATE POLICY "portfolio_items_owner_insert" ON portfolio_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "portfolio_items_owner_update" ON portfolio_items;
CREATE POLICY "portfolio_items_owner_update" ON portfolio_items
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "portfolio_items_owner_delete" ON portfolio_items;
CREATE POLICY "portfolio_items_owner_delete" ON portfolio_items
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE bids ADD COLUMN IF NOT EXISTS portfolio_item_ids uuid[] NOT NULL DEFAULT '{}';
