/*
# Send bid notifications as chat messages with an inline accept action

When a freelancer submits a bid on a tender, a chat message is now
sent to the employer (in addition to the existing notifications row),
so it shows up in Messages. The employer can accept the bid directly
from that message.

Adds `message_type` and `metadata` to `messages` so a message can
carry structured bid info (bid_id, project_id, amounts, etc.) instead
of just plain text.
*/

ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
