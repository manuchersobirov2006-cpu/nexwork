/*
# Allow public (unauthenticated) viewing of portfolios

## What
Freelancers get a shareable public link (e.g. nexwork.uz/#/p/PUBLIC_ID)
that anyone can open without an account to see their portfolio. This
requires anonymous visitors to be able to read the relevant profile
and their portfolio_items.
*/

DROP POLICY IF EXISTS "profiles_public_read_anon" ON profiles;
CREATE POLICY "profiles_public_read_anon" ON profiles
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "portfolio_items_read_anon" ON portfolio_items;
CREATE POLICY "portfolio_items_read_anon" ON portfolio_items
  FOR SELECT TO anon
  USING (true);
