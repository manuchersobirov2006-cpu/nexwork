/*
# Full order lifecycle (Kwork-style)

## What
Orders already had a status lifecycle (pending -> active -> delivered
-> completed / cancelled / disputed) but no UI ever used it beyond
creating gig orders, and tender bids had no order record at all once
accepted. This adds:

- `orders.project_id` / `orders.bid_id`: link an order to the tender
  (project) and winning bid it came from, so accepting a bid on the
  Board creates a trackable order exactly like ordering a gig does.
- `orders.delivery_note` / `orders.delivery_link`: what the freelancer
  submits when marking an order as delivered.
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bid_id uuid REFERENCES bids(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_note text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_link text;

CREATE INDEX IF NOT EXISTS orders_project_id_idx ON orders(project_id);
