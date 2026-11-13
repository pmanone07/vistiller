-- =============================================================================
-- ViStiller – harden column grants for organizers
--
-- Design notes
-- * The init migration grants `authenticated` table-wide SELECT/INSERT/UPDATE/
--   DELETE and relies on RLS to scope rows. RLS limits *which rows* an organizer
--   sees, not *which columns*, so this migration narrows the grants to the
--   columns the app actually reads and writes.
-- * signups: organizers must not read `ip_hash` (salted IP hash, rate limiting
--   only) or `edit_token_hash` (hash of the parent's private edit token).
-- * organizations: organizers may only rename their organization. `plan`
--   (billing) and the timestamps are not theirs to change.
-- * events: on INSERT organizers may not choose `public_token` (always random)
--   or `created_by` (always auth.uid()), nor id/timestamps.
-- * organizations / organization_members are created and managed through
--   SECURITY DEFINER functions only; the direct write grants were already
--   unusable (no RLS policy allows them) and are removed as defence in depth.
-- * Safe to run on a database that already has the init schema and data: it
--   only changes privileges. REVOKE of a table privilege also removes matching
--   column privileges, so each REVOKE + GRANT pair is repeatable.
-- * SECURITY DEFINER functions (create_public_signup, update_public_signup,
--   cancel_public_signup, get_signup_by_token, public_event_json,
--   apply_signup_items, create_organization, regenerate_event_token, …) run as
--   their owner and are not affected. The SECURITY INVOKER function
--   add_manual_contribution only inserts granted columns and returns `id`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- signups: no access to ip_hash / edit_token_hash
-- -----------------------------------------------------------------------------

-- Every column except ip_hash and edit_token_hash. `id` and `event_id` are
-- needed for WHERE clauses (delete/update by id, RLS, embedded joins via the
-- (id, event_id) foreign key) and for `insert ... returning id`.
revoke select on public.signups from authenticated;
grant select (id, event_id, contributor_name, contributor_email, contributor_phone,
              source, created_at, updated_at)
  on public.signups to authenticated;

-- -----------------------------------------------------------------------------
-- organizations: organizers can only rename
-- -----------------------------------------------------------------------------

-- updated_at is set by the organizations_updated_at trigger, which needs no
-- column grant.
revoke insert, update, delete on public.organizations from authenticated;
grant update (name) on public.organizations to authenticated;

-- organization_members: read-only for organizers (managed via functions).
revoke insert, update, delete on public.organization_members from authenticated;

-- -----------------------------------------------------------------------------
-- events: system-managed columns are not settable on insert
-- -----------------------------------------------------------------------------

-- id, public_token, created_by, created_at and updated_at come from their
-- column defaults. The share link is changed only via regenerate_event_token().
revoke insert on public.events from authenticated;
grant insert (organization_id, title, description, location, event_date, status)
  on public.events to authenticated;

-- -----------------------------------------------------------------------------
-- Privileges organizers never need
-- -----------------------------------------------------------------------------

-- Supabase's default privileges give `authenticated` ALL on new tables, which
-- includes TRUNCATE (ignores RLS), REFERENCES and TRIGGER. None of them are
-- reachable through the REST API today, but they have no legitimate use.
revoke truncate, references, trigger on all tables in schema public from authenticated;
