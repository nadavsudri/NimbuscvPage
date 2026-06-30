# Nimbus — Landing Site

Marketing/landing site **and** purchase backend for **Nimbus**, a hand-tracking music product
(webcam → MediaPipe-style hand tracking → MIDI/CC control; VST3 / AU / Standalone, macOS).

## Stack
- **Front-end:** plain static HTML/CSS/JS — no framework, no build step. Each page is a single
  self-contained `.html` file with an inline `<style>` and inline `<script>`.
- **Hosting:** Vercel (`vercel.json`, `outputDirectory: "."`, no build command).
- **Payments:** LemonSqueezy (checkout + webhook).
- **Data / files / licensing:** Supabase (`purchases` table, `releases` storage bucket).
- Only runtime dependency: `@supabase/supabase-js` (see `package.json`), used by the API functions.

## Pages (canonical, deployed)
Routes come from `vercel.json` rewrites (clean URL → `.html`).

| File | Route | Purpose |
|------|-------|---------|
| `index.html` | `/` | Main landing page. The big one (~100KB). Nav + mega menu, hero (MIDI-pad SVG device + liquid-waveform canvas), hero-split, showcase (laptop + speakers), "the pieces", DAW compat, pricing, FAQ, final CTA, footer. |
| `checkout.html` | `/checkout` | Pre-purchase order summary; "Get Nimbus" → starts LemonSqueezy checkout. |
| `success.html` | `/success` | Post-purchase. Reads `?token=`; shows download + license. **No nav.** |
| `expired.html` | `/expired.html` | Download link expired (links time out after 30 min). |
| `docs.html` | `/docs` | User manual / docs, left sidebar nav. |
| `forum.html` | `/forum` | Community forum index (loads threads from `/api/forum/threads`). |
| `forum-thread.html` | `/forum-thread` | Single thread view (`/api/forum/thread`). |
| `products.html` | `/products` | Product list. |

## API (`api/`, Vercel serverless functions, Node)
- `create-checkout.js` — POST; creates a LemonSqueezy checkout, attaches a UUID `download_token`, redirects to `/success.html?token=...`.
- `webhook.js` — LemonSqueezy webhook; verifies HMAC signature (`bodyParser:false`), upserts the purchase into Supabase `purchases`.
- `download.js` — token/email-gated download from the Supabase `releases` bucket; enforces `MAX_DOWNLOADS = 5`.
- `license.js` — returns license key / order info by `token` or `email`.
- `purchase.js` — purchase status lookup by `order_id`.
- `forum/threads.js`, `forum/thread.js` — forum read endpoints.

## Environment variables (see `.env.example`)
`LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`,
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SITE_URL`, `PRODUCT_FILE_PATH`.

## Assets (`assets/`)
Images (PNG/SVG), custom fonts (Jankora), and the user-manual PDF. Referenced directly by the HTML.

## Theme system (light/dark) — IMPORTANT
All deployed pages support a **light/dark toggle, defaulting to LIGHT** (warm cream, not white).
The system is duplicated per-page (no shared CSS file), but built the same way:

- **CSS variables:** `:root` holds the **light** palette (default); `:root[data-theme="dark"]` overrides
  with the original dark palette. Every theme-dependent value is a semantic var, e.g.
  `--bg --panel --ink(-2/3/4) --rule(-2) --teal(-deep) --nav-glass --grid-line --surface-1/2`
  `--glass-border/-bg/-outline --img-border --mega-divider --dot --chevron --teal-hover --on-teal --title-glow`.
  On `index.html` only, the hero MIDI-pad SVG recolors per theme via **CSS attribute selectors**
  (`[fill="#0a1520"]{fill:var(--dev-body)}` etc.) using `--dev-body/-pad/-stroke/-glow/-cast` — no inline SVG edits.
- **No-flash init:** an inline `<script>` in `<head>` sets `document.documentElement.dataset.theme` from
  `localStorage('nimbus-theme')` (default `'light'`) before first paint.
- **Toggle:** `#themeToggle` button in `.nav-buttons` (sun/moon icons). Handler persists the choice,
  updates `<meta id="metaThemeColor">`, and (index.html only) calls `window.__applyWaveTheme()` to re-tint
  the liquid-waveform canvas. `success.html` has no nav, so no button — it just inherits the saved theme.

## Layout
**Full-width / edge-to-edge.** The old centered `max-width:1200/1400px` column caps were removed
(`max-width:none`) on wrappers (`.wrap`, `.wrap-wide`, nav, showcase, spec-ribbon, quote, etc.), with a
responsive gutter `padding:0 clamp(24px,3vw,64px)`.

## Working / scratch files — NOT canonical, do not deploy or treat as source of truth
- `index2.html` — old alternate layout.
- `index_tmp.html` — scratch/experiment copy (kept in sync with `index.html` on request). Past experiments
  here (e.g. a fixed-crossfade "slideshow" scroll) were discarded.

## Conventions / gotchas
- Each page is fully self-contained — to change shared UI (e.g. the nav) you must edit **every** page.
- When converting a hardcoded color to a theme, route it through a semantic CSS var defined in **both**
  `:root` and `:root[data-theme="dark"]`; whites used over dark media (e.g. `.play-btn`, piece-card titles
  over images) are intentionally kept white in both themes.
- No test suite. Verify visually (the local forum/checkout API calls fail locally — that's expected, not a bug).
- Deploys from `main` via Vercel.
