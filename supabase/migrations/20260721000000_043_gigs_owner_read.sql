/*
# Freelancers can read their own non-active gigs

The "My gigs" section (in Portfolio) lets a freelancer pause/unpause and
edit their own gig listings, but `gigs_public_read` only allows SELECT on
`status = 'active'` rows (or admins). That means a freelancer could not see
their own paused/draft gigs after creating them — pausing a gig would make
it disappear entirely from their own list. Add an owner-scoped SELECT
policy so freelancers can always see their own gigs regardless of status.
*/

DROP POLICY IF EXISTS "gigs_owner_read" ON gigs;
CREATE POLICY "gigs_owner_read" ON gigs
  FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);
