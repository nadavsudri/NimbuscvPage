import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Post-purchase lookup used by success.html. Production checkout is a
// LemonSqueezy hosted buy-link, so the only handle the success page has is the
// order_id (LemonSqueezy appends it on redirect).
//
// SECURITY (C3): order_ids are enumerable, so this endpoint is hardened to
// minimise what enumeration can yield:
//   - It never returns the buyer's email (previously a PII leak).
//   - It only returns the download_token during the legitimate 30-minute
//     post-purchase window; older/inactive orders return "expired", so an
//     enumerator can't harvest tokens for past purchases.
export default async function handler(req, res) {
  const { order_id } = req.query;

  if (!order_id) {
    return res.status(400).json({ error: 'Missing order_id' });
  }

  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('download_token, is_active, created_at')
      .eq('order_id', String(order_id))
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    if (data.is_active === false) {
      return res.status(403).json({ error: 'expired' });
    }

    // Only expose the token within 30 minutes of purchase.
    const createdAt = new Date(data.created_at);
    const diffMinutes = (Date.now() - createdAt.getTime()) / 1000 / 60;
    if (diffMinutes > 30) {
      // Best-effort: flag it so future lookups short-circuit.
      supabase.from('purchases').update({ is_active: false }).eq('order_id', String(order_id)).then(() => {}).catch(() => {});
      return res.status(403).json({ error: 'expired' });
    }

    res.status(200).json({ download_token: data.download_token });
  } catch (err) {
    console.error('Purchase lookup error:', err.message);
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
}
