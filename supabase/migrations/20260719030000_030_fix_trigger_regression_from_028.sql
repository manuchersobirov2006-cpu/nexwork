/*
# Fix: migration 028's profile/gig field locks broke legitimate stat triggers

## Problem (regression introduced by 028, caught by re-testing)
`enforce_profile_privilege_fields` and `enforce_gig_stat_fields` fire on
EVERY update to `profiles`/`gigs`, including the ones made internally
by the existing `handle_order_completed` and `handle_review_insert`
SECURITY DEFINER triggers (migration 020). Those triggers cascade an
UPDATE onto another user's row as a side effect of an order being
completed or a review being inserted — but since `auth.uid()` still
resolves to the acting (non-admin) client inside that nested update,
the field-lock triggers silently reverted the legitimate
`completed_orders` / `orders_count` / `rating` / `review_count`
changes right back to their old values. Confirmed live: completing an
order and submitting a real review no longer updated the seller's
rating or completed_orders at all.

## Fix
Use `pg_trigger_depth()` to tell a direct top-level client UPDATE
(depth 1 for these BEFORE UPDATE triggers) apart from an UPDATE
cascaded from another trigger (depth > 1, e.g. handle_order_completed
or handle_review_insert running first). Only enforce the field lock
at depth 1. This is safe because the cascading callers
(handle_order_completed, handle_review_insert) only ever write
computed counters/ratings themselves — they never touch is_admin,
is_verified, verification_level, is_suspended, balance, is_premium,
premium_until, or response_rate, so the bypass doesn't reopen the
original privilege-escalation hole.
*/

CREATE OR REPLACE FUNCTION enforce_profile_privilege_fields()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_current_user_admin() AND pg_trigger_depth() <= 1 THEN
    NEW.is_admin := OLD.is_admin;
    NEW.is_verified := OLD.is_verified;
    NEW.verification_level := OLD.verification_level;
    NEW.is_suspended := OLD.is_suspended;
    NEW.suspended_reason := OLD.suspended_reason;
    NEW.rating := OLD.rating;
    NEW.review_count := OLD.review_count;
    NEW.completed_orders := OLD.completed_orders;
    NEW.balance := OLD.balance;
    NEW.is_premium := OLD.is_premium;
    NEW.premium_until := OLD.premium_until;
    NEW.response_rate := OLD.response_rate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_gig_stat_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_current_user_admin() AND pg_trigger_depth() <= 1 THEN
    NEW.orders_count := OLD.orders_count;
    NEW.views := OLD.views;
    NEW.rating := OLD.rating;
    NEW.review_count := OLD.review_count;
  END IF;
  RETURN NEW;
END;
$$;
