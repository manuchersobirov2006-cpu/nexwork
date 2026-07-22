/*
# Fix: anyone could insert a fake review for any order/reviewee

## Problem
`reviews_insert_reviewer` only checked `auth.uid() = reviewer_id` — it
never verified that the reviewer was actually the buyer on `order_id`,
that the order was `completed`, that `reviewee_id` matched the order's
seller, or that the order hadn't already been reviewed. Confirmed live:
an authenticated user could POST a review row for an arbitrary
existing order_id and any reviewee_id with a 5-star rating and
arbitrary comment text — a fabricated review visible to everyone via
`reviews_public_read` (USING true), and (were it not already blocked
by migration 028's profile field lock) capable of inflating/tanking a
target's aggregate rating through the on_review_insert trigger.

## Fix
Require the review to correspond to a real completed order where the
caller was the buyer and reviewee_id is that order's seller, and add
a uniqueness constraint so an order can only be reviewed once.
*/

DROP POLICY IF EXISTS "reviews_insert_reviewer" ON reviews;
CREATE POLICY "reviews_insert_reviewer" ON reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND o.buyer_id = auth.uid()
        AND o.status = 'completed'
        AND o.seller_id = reviewee_id
    )
  );

ALTER TABLE reviews ADD CONSTRAINT reviews_order_id_unique UNIQUE (order_id);
