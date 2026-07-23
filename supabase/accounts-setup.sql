-- ============================================================================
-- Nimbus — user accounts: Supabase setup (run once in the SQL Editor)
-- ============================================================================
-- The account API endpoints (api/account/*.js) use the SERVICE key, which
-- bypasses Row Level Security, and enforce ownership in code (matching the
-- purchase's email to the logged-in user's VERIFIED email). So RLS below is
-- DEFENSE IN DEPTH — it hardens the table so that even the public anon key
-- can only ever read a user's own rows, and never write.
--
-- Enabling RLS does NOT break existing webhook/download/license endpoints:
-- the service role ignores RLS.
-- ============================================================================

-- 1) Turn on Row Level Security for the purchases table.
alter table public.purchases enable row level security;

-- 2) Let a logged-in user read ONLY the purchases whose email matches their
--    account email (case-insensitive). No insert/update/delete policies are
--    defined, so the anon/user role cannot modify anything.
drop policy if exists "users read own purchases" on public.purchases;
create policy "users read own purchases"
  on public.purchases
  for select
  to authenticated
  using ( lower(email) = lower(auth.jwt() ->> 'email') );

-- ============================================================================
-- Notes
-- ----------------------------------------------------------------------------
-- * No schema changes are required — accounts link to purchases purely by the
--   email stored on each purchase (from LemonSqueezy). A buyer who signs up
--   with the same email sees every past purchase automatically.
--
-- * Email confirmation MUST be enabled (Authentication → Providers → Email →
--   "Confirm email" = ON). Purchases are matched by email, so an UNVERIFIED
--   signup with someone else's email could otherwise read their license key.
--
-- * Set the Auth "Site URL" and "Redirect URLs" (Authentication → URL
--   Configuration) to your production domain so confirmation / password-reset
--   links point back to https://<your-domain>/account.
-- ============================================================================
