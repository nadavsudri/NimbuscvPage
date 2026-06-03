import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { order_id } = req.query;

  if (!order_id) {
    return res.status(400).json({ error: 'Missing order_id' });
  }

  try {
    // Verify order exists with LemonSqueezy API
    const lsResponse = await fetch(
      `https://api.lemonsqueezy.com/v1/orders/${order_id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json',
        },
      }
    );

    if (!lsResponse.ok) {
      return res.status(403).json({ error: 'Order not found' });
    }

    const order = await lsResponse.json();
    if (order.data?.attributes?.status !== 'paid') {
      return res.status(403).json({ error: 'Payment not completed' });
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
