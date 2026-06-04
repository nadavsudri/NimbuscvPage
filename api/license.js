import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { token, email } = req.query;

  if (!token && !email) {
    return res.status(400).json({ error: 'Missing token or email' });
  }

  try {
    let query = supabase.from('purchases').select('license_key, download_token, order_id, email, created_at');

    if (token) {
      query = query.eq('download_token', token);
      console.log('License query by token:', token);
    } else {
      query = query.eq('email', email).order('created_at', { ascending: false }).limit(1);
      console.log('License query by email:', email);
    }

    const { data, error } = await query.limit(1).single();

    if (error || !data) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Check if token has expired (30 minutes) - only for token-based lookups
    if (token) {
      const createdAt = new Date(data.created_at);
      const now = new Date();
      const diffMinutes = (now - createdAt) / 1000 / 60;
      if (diffMinutes > 30) {
        // Mark as inactive (non-blocking)
        supabase
          .from('purchases')
          .update({ is_active: false })
          .eq('download_token', token)
          .then(() => console.log('Marked inactive:', token))
          .catch(err => console.error('Failed to mark inactive:', err.message));

        return res.status(403).json({ error: 'License link expired. This link is valid for 30 minutes after purchase. Check your email for a new link or contact hello@nimbus.audio' });
      }
    }

    res.status(200).json({ license_key: data.license_key || null });
  } catch (err) {
    console.error('License fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch license' });
  }
}
