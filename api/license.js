import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Token-only license lookup.
//
// SECURITY (C1): the previous `?email=` lookup branch was removed. Email is a
// public identifier, not a secret, so looking up a license key by email let
// anyone read any buyer's paid license key (and the email path had no expiry).
// The only secret capability here is the random `download_token` minted at
// checkout. Logged-in owners retrieve their license via the auth-gated
// `api/account/purchases.js` instead.
export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('license_key, created_at')
      .eq('download_token', token)
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Enforce the 30-minute expiry window on the token link.
    const createdAt = new Date(data.created_at);
    const diffMinutes = (Date.now() - createdAt.getTime()) / 1000 / 60;
    if (diffMinutes > 30) {
      // Mark as inactive (non-blocking).
      supabase
        .from('purchases')
        .update({ is_active: false })
        .eq('download_token', token)
        .then(() => {})
        .catch(() => {});

      return res.status(403).json({ error: 'License link expired. This link is valid for 30 minutes after purchase. Check your email for a new link, or sign in at /account, or contact hello@nimbus.audio' });
    }

    res.status(200).json({ license_key: data.license_key || null });
  } catch (err) {
    console.error('License fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch license' });
  }
}
