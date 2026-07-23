/*
# Allow the seller to review the buyer too, not just buyer -> seller

## Problem
`reviews_insert_reviewer` (migration 029) only allowed the order's buyer to
review the order's seller, and `reviews_order_id_unique` capped each order
to a single review total — so even after loosening the policy, a seller's
review of the buyer would collide with the buyer's own review on the same
order.

## Fix
Allow either party on a completed order to review the other (reviewee_id
must be the counterparty), and change the uniqueness constraint to
(order_id, reviewer_id) so each side can leave exactly one review each.
*/

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_order_id_unique;
ALTER TABLE reviews ADD CONSTRAINT reviews_order_id_reviewer_id_unique UNIQUE (order_id, reviewer_id);

DROP POLICY IF EXISTS "reviews_insert_reviewer" ON reviews;
CREATE POLICY "reviews_insert_reviewer" ON reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND o.status = 'completed'
        AND (
          (o.buyer_id = auth.uid() AND o.seller_id = reviewee_id)
          OR (o.seller_id = auth.uid() AND o.buyer_id = reviewee_id)
        )
    )
  );
