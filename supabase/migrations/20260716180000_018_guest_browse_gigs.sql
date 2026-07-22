/*
# Guest browsing of gigs

## What
Visitors who aren't signed in can search/browse active gigs from the
landing page (search bar + category tiles) in a read-only view.
Taking any action (contact seller, order, favorite) still requires
signing up. This just allows the anon role to read active gigs.
*/

DROP POLICY IF EXISTS "gigs_public_read_anon" ON gigs;
CREATE POLICY "gigs_public_read_anon" ON gigs
  FOR SELECT TO anon
  USING (status = 'active');
