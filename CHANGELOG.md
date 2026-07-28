# Changelog

All notable changes to the Nimbus landing site.

## 2026-07-23 — Production launch

### Added
- **User accounts** (`/account`) — Supabase Auth (email + password) with login,
  signup, forgot-password, and a purchases dashboard. Purchases link to accounts
  by email; the dashboard lists each purchase (expandable) with its license key
  (masked/reveal, copy, save-as-.txt) and an anytime download (no 30-min expiry).
  - New endpoints: `api/public-config.js`, `api/account/purchases.js`,
    `api/account/download.js`.
  - `/account` rewrite in `vercel.json`; setup steps in `ACCOUNTS_SETUP.md`;
    optional RLS hardening in `supabase/accounts-setup.sql`.
  - New env var: `SUPABASE_ANON_KEY` (public; served to the browser).
- **Purchase ↔ account linking (guest checkout preserved)** — logged-in buyers
  get their email prefilled into LemonSqueezy so the purchase auto-links; guests
  get a soft "Log in to link" nudge and a post-purchase "Create my account" CTA
  (email prefilled). No forced signup before paying.
  - `api/purchase.js` now returns the purchase email; `account.html` honors
    `?signup=1` and `?email=`.

### Changed
- **Price raised $29.90 → $39.99** across the site (homepage pricing card, hero
  pill, mega-menu, CTAs, JSON-LD, and the checkout order summary / total).
- **Checkout points at the production LemonSqueezy product** (buy-link UUID
  `cf020729…`); the demo/test link is kept and reachable via `/checkout?test=1`.
- **Pricing section redesign** — replaced the layered spinning-orb / asymmetric
  card with a clean gradient-bordered card and a full-width "Get Nimbus — $39.99"
  CTA; added a glow behind the right-side visual and fixed its overflow.
- **Account views redesign** — split-panel login/signup (branded aside, animated
  tabs, password show/hide, inline validation, button spinners); dashboard gains
  a greeting, stat chips, skeleton loading, masked/reveal keys, copy toasts, and
  a proper empty state.
- **Nav** — removed "Contact Us"; renamed the account link to **"My Nimbus"**.

### Fixed
- **Checkout 404** — the hosted `/checkout/buy/` link requires the variant's
  buy-link UUID, not the numeric API variant id.
- **Checkout total price** — the split superscript markup (`$29`<small>`.90`</small>)
  had been missed by the earlier find/replace.

### Internal
- Ignore local Claude Code skills tooling (`.claude/`, `skills-lock.json`).
