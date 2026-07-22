/*
# Public platform stats RPC

## Why
The landing page shows live counts of freelancers, open vacancies,
completed orders, and average rating to unauthenticated visitors.
Freelancer profiles and active jobs are already anon-readable
(migrations 012/017), but `orders` holds buyer/seller ids and prices
that shouldn't be broadly exposed via RLS just to compute a count.
A SECURITY DEFINER function returns only the aggregate numbers.
*/

CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS TABLE (
  freelancers_count bigint,
  vacancies_count bigint,
  completed_orders_count bigint,
  avg_rating numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT count(*) FROM profiles WHERE role = 'freelancer'),
    (SELECT count(*) FROM jobs WHERE status = 'active'),
    (SELECT count(*) FROM orders WHERE status = 'completed'),
    (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) FROM profiles WHERE review_count > 0);
$$;

GRANT EXECUTE ON FUNCTION get_public_stats() TO anon, authenticated;
