/*
# Close a small gap in migration 028's bid-transition trigger

`enforce_bid_transition` checked every bid column for immutability
except `portfolio_item_ids` (added later, in migration 010) — the
client only ever sets it at INSERT time, so an UPDATE changing it
should never happen legitimately either. Without this check a
freelancer could rewrite their own already-submitted bid to reference
someone else's public portfolio items, misattributing their work.
*/

CREATE OR REPLACE FUNCTION enforce_bid_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.freelancer_id IS DISTINCT FROM OLD.freelancer_id
     OR NEW.bid_amount IS DISTINCT FROM OLD.bid_amount
     OR NEW.delivery_days IS DISTINCT FROM OLD.delivery_days
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.portfolio_item_ids IS DISTINCT FROM OLD.portfolio_item_ids
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Cannot modify bid terms after submission';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'pending' OR NEW.status NOT IN ('accepted','rejected') THEN
      RAISE EXCEPTION 'Invalid bid status transition from % to %', OLD.status, NEW.status;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM projects WHERE projects.id = OLD.project_id AND projects.employer_id = auth.uid()) THEN
      RAISE EXCEPTION 'Only the project owner may accept or reject a bid';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
