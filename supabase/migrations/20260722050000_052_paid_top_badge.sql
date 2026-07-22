/*
# Paid "Top Specialist" badge

Replaces the free auto-computed rating-tier badges with a single paid
badge. Since real payment gateways (Payme/Click) aren't integrated yet,
purchase goes through a manual request the freelancer submits, which an
admin approves after confirming payment was received out-of-band. On
approval, profiles.is_premium/premium_until are set — the same fields the
rest of the app already uses to mean "has an active paid badge".
*/

CREATE TABLE IF NOT EXISTS badge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  amount numeric(12,2) NOT NULL,
  months integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  admin_note text
);

ALTER TABLE badge_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badge_requests_own_read" ON badge_requests;
CREATE POLICY "badge_requests_own_read" ON badge_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "badge_requests_own_insert" ON badge_requests;
CREATE POLICY "badge_requests_own_insert" ON badge_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "badge_requests_admin_update" ON badge_requests;
CREATE POLICY "badge_requests_admin_update" ON badge_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Note: is_premium/premium_until are already guarded against self-escalation
-- by enforce_profile_privilege_fields (added in migration 030) — verified,
-- no change needed here.
