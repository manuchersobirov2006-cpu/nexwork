/*
# Social links on profiles

## What
`profiles.social_links` — jsonb object with optional keys
(telegram, instagram, facebook, whatsapp, linkedin, youtube), each a
full URL the user pastes in themselves. Shown as clickable buttons on
UserProfileModal / PassportScreen; editable only by the profile owner
(existing `profiles_update_own` policy already covers it — no new
column-level protection needed, this is plain user-editable content
like bio/skills).
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;
