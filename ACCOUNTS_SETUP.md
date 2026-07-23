# Nimbus — User Accounts Setup

This adds login/signup + a purchases dashboard (with license keys & downloads) at
**`/account`**, on top of the existing Supabase `purchases` table. Accounts use
**Supabase Auth (email + password)** and link to purchases **by email**.

## What was added (code)
- `account.html` — the account page (logged-out: login/signup/forgot-password; logged-in: dashboard of purchases, each expandable to show the license key + download).
- `api/public-config.js` — serves the public Supabase URL + anon key to the browser.
- `api/account/purchases.js` — returns the logged-in user's purchases (auth-verified, matched by email).
- `api/account/download.js` — returns a fresh signed download URL for a purchase the user owns (no 30-min expiry, unlike the emailed link).
- `vercel.json` — added `/account` → `/account.html` rewrite.
- Nav links to `/account` on `index.html` and `success.html`.
- `supabase/accounts-setup.sql` — optional Row Level Security hardening.

---

## What YOU need to do (≈5 minutes, all in dashboards)

### 1. Supabase → Authentication
1. **Providers → Email:** make sure **Email** is enabled.
2. **Turn ON "Confirm email".**  ⚠️ **Required.** Purchases are matched by email, so an
   unconfirmed signup with someone else's address could otherwise read their license key.
3. **URL Configuration:**
   - **Site URL:** `https://YOUR-DOMAIN`
   - **Redirect URLs:** add `https://YOUR-DOMAIN/account`
   (so confirmation & password-reset emails link back to the account page).
4. *(Optional but nice)* **Authentication → Email Templates:** brand the confirmation / reset emails.

### 2. Supabase → get the anon key
**Settings → API → Project API keys → `anon` `public`.** Copy it.

### 3. Vercel → add the env var
**Project → Settings → Environment Variables**, add (Production + Preview):
```
SUPABASE_ANON_KEY = <the anon public key from step 2>
```
`SUPABASE_URL` and `SUPABASE_SERVICE_KEY` already exist.

### 4. Supabase → SQL (optional, recommended)
Open **SQL Editor**, paste and run `supabase/accounts-setup.sql`. This enables Row
Level Security on `purchases` as defense-in-depth. It does **not** affect the existing
webhook/download endpoints (they use the service key, which bypasses RLS).

### 5. Redeploy
Redeploy on Vercel (or just push — the env var is picked up on the next build).

---

## How it works / good to know
- A buyer who signs up with the **same email** they purchased with sees **all** their
  purchases automatically — including ones made before they created the account.
- Bought with a different email than they sign up with? They just log in with the
  purchase email. (No cross-email linking by design — that keeps things secure.)
- The dashboard **download** works anytime for the account owner (the 30-minute expiry
  only applies to the one-time email link from the success page).
- The `anon` key in the browser is safe to expose — it's designed to be public and is
  constrained by RLS / Supabase Auth.

## Test checklist (after deploy)
1. `/account` → Sign up with a test email → check inbox → confirm.
2. Log in → dashboard loads.
3. If that email has a purchase in `purchases`, its card shows; expand it → license key + Download.
4. New email with no purchases → friendly "No purchases yet" empty state.
5. "Forgot your password?" → reset email → set new password → land back logged in.
