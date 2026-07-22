/*
# Favorites for specialists (not just gigs)

The `favorites` table only supported gig_id (NOT NULL). Now that browsing
is profile-centric (Specialists screen), clients need to save a specialist
profile directly, without there being a gig involved at all.
*/

ALTER TABLE favorites ALTER COLUMN gig_id DROP NOT NULL;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS specialist_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_one_target;
ALTER TABLE favorites ADD CONSTRAINT favorites_one_target CHECK (
  (gig_id IS NOT NULL AND specialist_id IS NULL) OR (gig_id IS NULL AND specialist_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_specialist_unique
  ON favorites(user_id, specialist_id) WHERE specialist_id IS NOT NULL;
