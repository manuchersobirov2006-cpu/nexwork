/*
# Auto-update seller stats on order completion / review

## Why
The buyer's browser session marks an order completed and submits the
review, but profiles_update_own only lets a user update their own
row — the buyer has no RLS permission to bump the seller's
completed_orders / rating / review_count directly. These need to
happen as SECURITY DEFINER triggers instead, which also avoids race
conditions if two orders complete around the same time.
*/

CREATE OR REPLACE FUNCTION handle_order_completed()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE profiles SET completed_orders = completed_orders + 1 WHERE id = NEW.seller_id;
    IF NEW.gig_id IS NOT NULL THEN
      UPDATE gigs SET orders_count = orders_count + 1 WHERE id = NEW.gig_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_completed ON orders;
CREATE TRIGGER on_order_completed
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_completed();

CREATE OR REPLACE FUNCTION handle_review_insert()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles
  SET
    rating = ROUND((((rating * review_count) + NEW.rating) / (review_count + 1))::numeric, 1),
    review_count = review_count + 1
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_insert ON reviews;
CREATE TRIGGER on_review_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION handle_review_insert();
