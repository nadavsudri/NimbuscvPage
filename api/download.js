import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MAX_DOWNLOADS = 5;

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const { data: purchase, error: dbError } = await supabase
      .from('purchases')
      .select('*')
      .eq('download_token', token)
      .eq('status', 'paid')
      .limit(1)
      .single();

    if (dbError || !purchase) {
      return res.status(403).json({ error: 'Purchase not found or not yet processed. Try again in a few seconds.' });
    }

    // Check if token has expired (30 minutes)
    const createdAt = new Date(purchase.created_at);
    const now = new Date();
    const diffMinutes = (now - createdAt) / 1000 / 60;
    if (diffMinutes > 30) {
      // Mark as inactive
      await supabase
        .from('purchases')
        .update({ is_active: false })
        .eq('download_token', token)
        .catch(err => console.error('Failed to mark inactive:', err.message));

      return res.redirect(303, '/expired');
    }

    // Check download count
    const count = purchase.download_count || 0;
    if (count >= MAX_DOWNLOADS) {
      return res.status(403).json({ error: 'Download limit reached. Contact hello@nimbus.audio for help.' });
    }

    // Increment download count
    await supabase
      .from('purchases')
      .update({ download_count: count + 1 })
      .eq('download_token', token);

    // Generate a signed download URL (expires in 30 minutes)
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
    res.status(500).json({ error: 'Download failed' });
  }
}
