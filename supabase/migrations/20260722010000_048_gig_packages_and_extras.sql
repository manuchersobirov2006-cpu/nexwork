/*
# Gig packages (tiers) and paid extras

Gigs used to have exactly one price/delivery/revisions. Adds Fiverr-style
Basic/Standard/Premium tiers per gig, plus optional paid add-ons (extras)
a buyer can stack on top of a chosen tier. Orders record which package and
which extras (snapshotted, since gig_extras can change/be deleted later)
were purchased.
*/

CREATE TABLE IF NOT EXISTS gig_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('basic', 'standard', 'premium')),
  title text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL CHECK (price > 0),
  delivery_days integer NOT NULL CHECK (delivery_days > 0),
  revisions integer NOT NULL DEFAULT 1 CHECK (revisions >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (gig_id, tier)
);

ALTER TABLE gig_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gig_packages_read" ON gig_packages;
CREATE POLICY "gig_packages_read" ON gig_packages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gigs g WHERE g.id = gig_packages.gig_id
      AND (g.status = 'active' OR g.seller_id = auth.uid()
           OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
    )
  );

DROP POLICY IF EXISTS "gig_packages_owner_insert" ON gig_packages;
CREATE POLICY "gig_packages_owner_insert" ON gig_packages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM gigs g WHERE g.id = gig_packages.gig_id AND g.seller_id = auth.uid()));

DROP POLICY IF EXISTS "gig_packages_owner_update" ON gig_packages;
CREATE POLICY "gig_packages_owner_update" ON gig_packages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM gigs g WHERE g.id = gig_packages.gig_id AND g.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM gigs g WHERE g.id = gig_packages.gig_id AND g.seller_id = auth.uid()));

DROP POLICY IF EXISTS "gig_packages_owner_delete" ON gig_packages;
CREATE POLICY "gig_packages_owner_delete" ON gig_packages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM gigs g WHERE g.id = gig_packages.gig_id AND g.seller_id = auth.uid()));

CREATE TABLE IF NOT EXISTS gig_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  title text NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price > 0),
  delivery_days_delta integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gig_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gig_extras_read" ON gig_extras;
CREATE POLICY "gig_extras_read" ON gig_extras FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gigs g WHERE g.id = gig_extras.gig_id
      AND (g.status = 'active' OR g.seller_id = auth.uid()
           OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
    )
  );

DROP POLICY IF EXISTS "gig_extras_owner_insert" ON gig_extras;
CREATE POLICY "gig_extras_owner_insert" ON gig_extras FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM gigs g WHERE g.id = gig_extras.gig_id AND g.seller_id = auth.uid()));

DROP POLICY IF EXISTS "gig_extras_owner_update" ON gig_extras;
CREATE POLICY "gig_extras_owner_update" ON gig_extras FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM gigs g WHERE g.id = gig_extras.gig_id AND g.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM gigs g WHERE g.id = gig_extras.gig_id AND g.seller_id = auth.uid()));

DROP POLICY IF EXISTS "gig_extras_owner_delete" ON gig_extras;
CREATE POLICY "gig_extras_owner_delete" ON gig_extras FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM gigs g WHERE g.id = gig_extras.gig_id AND g.seller_id = auth.uid()));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS gig_package_id uuid REFERENCES gig_packages(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS selected_extras jsonb NOT NULL DEFAULT '[]'::jsonb;
