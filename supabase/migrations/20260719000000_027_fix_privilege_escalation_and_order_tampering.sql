/*
# Fix privilege escalation via profile self-update + order price/status tampering

## Problem 1: Privilege escalation
`profiles_update_own` (migration 001) only checks row ownership
(`auth.uid() = id`), not which columns change. Any authenticated user
can PATCH their own row directly via the REST API and set
is_admin/is_verified/verification_level/is_suspended themselves,
fully compromising the admin panel and verification system.

## Problem 2: Order price/status tampering
`orders_update_parties` (migration 001) likewise only checks that the
caller is the buyer or seller, not which columns/transition is valid.
Either party can silently rewrite price or jump straight to
'completed', which feeds directly into the on_order_completed trigger
(migration 020) and the revenue/rating numbers shown in Analytics and
the admin dashboard.

## Fix
Two BEFORE UPDATE triggers that validate the actual change against
what the app is allowed to do, on top of the existing row-ownership
RLS policies (which stay as-is):

1. `enforce_profile_privilege_fields` — reverts is_admin, is_verified,
   verification_level, is_suspended and suspended_reason back to
   their previous value unless the caller already is_admin. Does not
   touch `role`, which is an intentionally user-switchable label (not
   used anywhere as an authorization check — only is_admin is).

2. `enforce_order_transition` — only allows the exact state
   transitions the UI performs (buyer editing price/deadline while
   pending, seller accept/deliver, buyer revision-request/complete,
   either party cancel from a non-terminal state), each requiring the
   correct actor and no unrelated column changes. Everything else
   raises an exception.
*/

-- ==================== profiles: block self-escalation of privilege fields ====================

CREATE OR REPLACE FUNCTION enforce_profile_privilege_fields()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  SELECT is_admin INTO caller_is_admin FROM profiles WHERE id = auth.uid();
  IF NOT COALESCE(caller_is_admin, false) THEN
    NEW.is_admin := OLD.is_admin;
    NEW.is_verified := OLD.is_verified;
    NEW.verification_level := OLD.verification_level;
    NEW.is_suspended := OLD.is_suspended;
    NEW.suspended_reason := OLD.suspended_reason;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_privilege_fields_trigger ON profiles;
CREATE TRIGGER enforce_profile_privilege_fields_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_privilege_fields();

-- ==================== orders: only allow the real state machine ====================

CREATE OR REPLACE FUNCTION enforce_order_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Identity / financial-origin fields can never change after creation
  IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.gig_id IS DISTINCT FROM OLD.gig_id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.bid_id IS DISTINCT FROM OLD.bid_id
     OR NEW.requirements IS DISTINCT FROM OLD.requirements
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Cannot modify order identity fields';
  END IF;

  -- Buyer edits price/deadline while still pending (updateOrderTerms)
  IF OLD.status = 'pending' AND NEW.status = 'pending'
     AND auth.uid() = OLD.buyer_id
     AND NEW.delivered_at IS NOT DISTINCT FROM OLD.delivered_at
     AND NEW.delivery_note IS NOT DISTINCT FROM OLD.delivery_note
     AND NEW.delivery_link IS NOT DISTINCT FROM OLD.delivery_link
     AND NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at
  THEN
    RETURN NEW;
  END IF;

  -- Seller accepts: pending -> active
  IF OLD.status = 'pending' AND NEW.status = 'active'
     AND auth.uid() = OLD.seller_id
     AND NEW.price = OLD.price
     AND NEW.delivery_deadline IS NOT DISTINCT FROM OLD.delivery_deadline
     AND NEW.delivery_note IS NOT DISTINCT FROM OLD.delivery_note
     AND NEW.delivery_link IS NOT DISTINCT FROM OLD.delivery_link
     AND NEW.delivered_at IS NULL AND NEW.completed_at IS NULL
  THEN
    RETURN NEW;
  END IF;

  -- Seller delivers: active -> delivered
  IF OLD.status = 'active' AND NEW.status = 'delivered'
     AND auth.uid() = OLD.seller_id
     AND NEW.price = OLD.price
     AND NEW.delivery_deadline IS NOT DISTINCT FROM OLD.delivery_deadline
     AND NEW.delivered_at IS NOT NULL
     AND NEW.completed_at IS NULL
  THEN
    RETURN NEW;
  END IF;

  -- Buyer requests revision: delivered -> active
  IF OLD.status = 'delivered' AND NEW.status = 'active'
     AND auth.uid() = OLD.buyer_id
     AND NEW.price = OLD.price
     AND NEW.delivery_note IS NOT DISTINCT FROM OLD.delivery_note
     AND NEW.delivery_link IS NOT DISTINCT FROM OLD.delivery_link
     AND NEW.delivered_at IS NULL
     AND NEW.completed_at IS NULL
  THEN
    RETURN NEW;
  END IF;

  -- Buyer completes: delivered -> completed
  IF OLD.status = 'delivered' AND NEW.status = 'completed'
     AND auth.uid() = OLD.buyer_id
     AND NEW.price = OLD.price
     AND NEW.delivery_deadline IS NOT DISTINCT FROM OLD.delivery_deadline
     AND NEW.delivered_at IS NOT DISTINCT FROM OLD.delivered_at
     AND NEW.delivery_note IS NOT DISTINCT FROM OLD.delivery_note
     AND NEW.delivery_link IS NOT DISTINCT FROM OLD.delivery_link
     AND NEW.completed_at IS NOT NULL
  THEN
    RETURN NEW;
  END IF;

  -- Either party cancels from a non-terminal state
  IF OLD.status IN ('pending','active','delivered') AND NEW.status = 'cancelled'
     AND (auth.uid() = OLD.buyer_id OR auth.uid() = OLD.seller_id)
     AND NEW.price = OLD.price
     AND NEW.delivery_deadline IS NOT DISTINCT FROM OLD.delivery_deadline
     AND NEW.delivered_at IS NOT DISTINCT FROM OLD.delivered_at
     AND NEW.delivery_note IS NOT DISTINCT FROM OLD.delivery_note
     AND NEW.delivery_link IS NOT DISTINCT FROM OLD.delivery_link
     AND NEW.completed_at IS NULL
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid order transition from % to % (price_changed=%)', OLD.status, NEW.status, (NEW.price IS DISTINCT FROM OLD.price);
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_transition_trigger ON orders;
CREATE TRIGGER enforce_order_transition_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION enforce_order_transition();
