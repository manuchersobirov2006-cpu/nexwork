/*
# Prevent duplicate orders from accepting the same bid twice

## Bug
Clicking "Принять" on a bid more than once (e.g. double-click, or the
same bid message rendered in both Board and Chat) called acceptBid()
each time with no guard, inserting a new orders row every time — the
same tender ended up with several "В работе" order cards.

## Fix
1. A unique constraint on orders.bid_id (NULLs excluded — gig orders
   have no bid_id — so this only dedupes tender-bid orders).
2. Clean up existing duplicates: for each bid_id with more than one
   order, keep the earliest order and its linked task, delete the
   rest.
*/

-- Delete duplicate tasks tied to the orders we're about to delete
DELETE FROM tasks
WHERE related_order_id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY bid_id ORDER BY created_at ASC) AS rn
    FROM orders
    WHERE bid_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

DELETE FROM orders
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY bid_id ORDER BY created_at ASC) AS rn
    FROM orders
    WHERE bid_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

ALTER TABLE orders ADD CONSTRAINT orders_bid_id_unique UNIQUE (bid_id);
