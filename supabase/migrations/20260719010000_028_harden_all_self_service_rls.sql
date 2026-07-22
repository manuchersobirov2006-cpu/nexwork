/*
# Harden every remaining "row-owned but not column-restricted" RLS gap

## Background
Migration 027 fixed the two worst cases of a recurring pattern in this
schema: `*_own`/`*_parties` UPDATE policies check *who* can write a row
(auth.uid() = some owner column) but never *which columns*, because
Postgres RLS has no native column-level write restriction. Auditing
every table for the same pattern found several more real, exploitable
gaps:

1. `profiles` (extending 027's trigger) — a user can still inflate
   their own `rating`, `review_count`, `completed_orders`, `balance`,
   `is_premium`, `premium_until`, `response_rate`. These are all meant
   to be written only by SECURITY DEFINER triggers (on_order_completed,
   on_review_insert) or by an admin, never by the row owner directly.

2. `gigs` — the seller can rewrite their own gig's `orders_count`,
   `views`, `rating`, `review_count` to fabricate social proof. No
   client feature ever sets these; they exist purely for display and
   should only move via triggers/admin.

3. `projects` / `jobs` — same issue with `bids_count`/`views` and
   `applicants_count`/`views`.

4. `companies` — the owner can self-set `is_verified = true` on their
   own company, faking a verified badge nothing in the client ever
   sets from the owner side.

5. `bids` — `bids_update_status` (migration 023) lets either the
   freelancer or the project's employer write ANY column. A freelancer
   can self-accept their own bid, or edit `bid_amount`/`message` after
   submission; an employer can rewrite a freelancer's bid terms before
   accepting it. Only the employer-driven pending->accepted/rejected
   transition (with terms untouched) is legitimate.

6. `messages` — `messages_update_participants` has no WITH CHECK at
   all (defaults to the USING clause), and the USING clause lets
   either chat participant rewrite `content`/`sender_id`/`attachments`
   of ANY message in the thread, not just mark `is_read`. That's
   message forgery / chat history tampering.

7. `identity_verifications` — `identity_verif_user_update` lets the
   submitting user set their own row to `status = 'approved'` (with
   any `reviewed_by`/`reviewed_at`), i.e. self-approve their own KYC
   submission. The only legitimate self-service action is resubmitting
   (reset to pending, clear the review fields).

8. `job_applications` — `job_applications_update` lets the applicant
   set their own application straight to `accepted`, and lets the
   employer freely rewrite the applicant's `cover_letter`. Only
   applicant->withdrawn and employer->accepted/rejected (from pending)
   are legitimate.

## Fix
A shared `is_current_user_admin()` helper, plus one BEFORE UPDATE
trigger per table restricting the actual state/column changes to what
the app's own code does. Existing row-ownership RLS policies are left
as-is; these triggers are strictly additive validation on top.
*/

CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$$;

-- ==================== profiles: extend privilege-field lock ====================

CREATE OR REPLACE FUNCTION enforce_profile_privilege_fields()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    NEW.is_admin := OLD.is_admin;
    NEW.is_verified := OLD.is_verified;
    NEW.verification_level := OLD.verification_level;
    NEW.is_suspended := OLD.is_suspended;
    NEW.suspended_reason := OLD.suspended_reason;
    NEW.rating := OLD.rating;
    NEW.review_count := OLD.review_count;
    NEW.completed_orders := OLD.completed_orders;
    NEW.balance := OLD.balance;
    NEW.is_premium := OLD.is_premium;
    NEW.premium_until := OLD.premium_until;
    NEW.response_rate := OLD.response_rate;
  END IF;
  RETURN NEW;
END;
$$;

-- ==================== gigs: lock stat fields ====================

CREATE OR REPLACE FUNCTION enforce_gig_stat_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    NEW.orders_count := OLD.orders_count;
    NEW.views := OLD.views;
    NEW.rating := OLD.rating;
    NEW.review_count := OLD.review_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_gig_stat_fields_trigger ON gigs;
CREATE TRIGGER enforce_gig_stat_fields_trigger
  BEFORE UPDATE ON gigs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_gig_stat_fields();

-- ==================== projects: lock stat fields ====================

CREATE OR REPLACE FUNCTION enforce_project_stat_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    NEW.bids_count := OLD.bids_count;
    NEW.views := OLD.views;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_project_stat_fields_trigger ON projects;
CREATE TRIGGER enforce_project_stat_fields_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION enforce_project_stat_fields();

-- ==================== jobs: lock stat fields ====================

CREATE OR REPLACE FUNCTION enforce_job_stat_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    NEW.applicants_count := OLD.applicants_count;
    NEW.views := OLD.views;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_job_stat_fields_trigger ON jobs;
CREATE TRIGGER enforce_job_stat_fields_trigger
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_job_stat_fields();

-- ==================== companies: lock is_verified ====================

CREATE OR REPLACE FUNCTION enforce_company_verified_field()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    NEW.is_verified := OLD.is_verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_company_verified_field_trigger ON companies;
CREATE TRIGGER enforce_company_verified_field_trigger
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION enforce_company_verified_field();

-- ==================== bids: only the real accept/reject transition ====================

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

DROP TRIGGER IF EXISTS enforce_bid_transition_trigger ON bids;
CREATE TRIGGER enforce_bid_transition_trigger
  BEFORE UPDATE ON bids
  FOR EACH ROW
  EXECUTE FUNCTION enforce_bid_transition();

-- ==================== messages: only is_read may ever change ====================

DROP POLICY IF EXISTS "messages_update_participants" ON messages;
CREATE POLICY "messages_update_participants" ON messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND (chats.participant_1 = auth.uid() OR chats.participant_2 = auth.uid())));

CREATE OR REPLACE FUNCTION enforce_message_update_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.chat_id IS DISTINCT FROM OLD.chat_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.attachments IS DISTINCT FROM OLD.attachments
     OR NEW.message_type IS DISTINCT FROM OLD.message_type
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only is_read may be updated on a message';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_message_update_fields_trigger ON messages;
CREATE TRIGGER enforce_message_update_fields_trigger
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_message_update_fields();

-- ==================== identity_verifications: block self-approval ====================

CREATE OR REPLACE FUNCTION enforce_identity_verification_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admin (the submitting user) may only resubmit: reset to
  -- pending and clear the review fields, exactly what
  -- IdentityVerificationModal does. Never self-approve/reject.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.status IS DISTINCT FROM 'pending'
     OR NEW.reviewed_by IS NOT NULL
     OR NEW.reviewed_at IS NOT NULL
     OR NEW.rejection_reason IS NOT NULL
  THEN
    RAISE EXCEPTION 'Only an admin may approve or reject identity verification';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_identity_verification_update_trigger ON identity_verifications;
CREATE TRIGGER enforce_identity_verification_update_trigger
  BEFORE UPDATE ON identity_verifications
  FOR EACH ROW
  EXECUTE FUNCTION enforce_identity_verification_update();

-- ==================== job_applications: only the real transitions ====================

CREATE OR REPLACE FUNCTION enforce_job_application_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.job_id IS DISTINCT FROM OLD.job_id
     OR NEW.applicant_id IS DISTINCT FROM OLD.applicant_id
     OR NEW.cover_letter IS DISTINCT FROM OLD.cover_letter
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Cannot modify application identity fields';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() = OLD.applicant_id THEN
      IF NEW.status <> 'withdrawn' THEN
        RAISE EXCEPTION 'Applicant may only withdraw their application';
      END IF;
    ELSIF EXISTS (SELECT 1 FROM jobs WHERE jobs.id = OLD.job_id AND jobs.employer_id = auth.uid()) THEN
      IF OLD.status <> 'pending' OR NEW.status NOT IN ('accepted','rejected') THEN
        RAISE EXCEPTION 'Invalid application status transition from % to %', OLD.status, NEW.status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Not authorized to change application status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_job_application_transition_trigger ON job_applications;
CREATE TRIGGER enforce_job_application_transition_trigger
  BEFORE UPDATE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION enforce_job_application_transition();
