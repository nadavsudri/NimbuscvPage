import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MAX_DOWNLOADS = 5;

// Token-only download.
//
// SECURITY (C2): the previous `?email=` branch was removed. Email is a public
// identifier, so `?email=` let anyone trigger a paid download for any buyer
// (within the 30-min window). The only secret capability is the random
// `download_token`. Logged-in owners re-download via api/account/download.js.
export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const { data: purchase, error: dbError } = await supabase
      .from('purchases')
      .select('*')
      .eq('status', 'paid')
      .eq('download_token', token)
      .limit(1)
      .single();

    if (dbError || !purchase) {
      return res.status(403).json({ error: 'Purchase not found or not yet processed. Try again in a few seconds.' });
    }

    if (purchase.is_active === false) {
      return res.redirect(303, '/expired.html');
    }

    // 30-minute expiry from purchase time.
    const createdAt = new Date(purchase.created_at);
    const diffMinutes = (Date.now() - createdAt.getTime()) / 1000 / 60;
    if (diffMinutes > 30) {
      await supabase.from('purchases').update({ is_active: false }).eq('id', purchase.id);
      return res.redirect(303, '/expired.html');
    }

    // Download-count cap.
    const count = purchase.download_count || 0;
    if (count >= MAX_DOWNLOADS) {
      return res.status(403).json({ error: 'Download limit reached. Contact hello@nimbus.audio for help.' });
    }
    await supabase.from('purchases').update({ download_count: count + 1 }).eq('id', purchase.id);

    // Signed download URL (expires in 30 minutes).
    const { data, error } = await supabase.storage
      .from('releases')
      .createSignedUrl(process.env.PRODUCT_FILE_PATH, 1800);

    if (error) {
      console.error('Signed URL error:', error.message);
      return res.status(500).json({ error: 'Failed to generate download link' });
    }

    res.redirect(303, data.signedUrl);
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: 'Download failed. Please try again.' });
  }
}
