import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { order_id, email } = req.query;

  if (!order_id && !email) {
    return res.status(400).json({ error: 'Missing order_id or email' });
  }

  try {
    // Check purchase exists in our database (written by webhook)
    let query = supabase.from('purchases').select('*');
    if (order_id) {
      query = query.eq('order_id', order_id);
    } else {
      query = query.eq('email', email);
    }
    const { data: purchase, error: dbError } = await query.eq('status', 'paid').limit(1).single();

    if (dbError || !purchase) {
      return res.status(403).json({ error: 'Purchase not found or not yet processed. Try again in a few seconds.' });
    }

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
