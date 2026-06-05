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
    console.log('Looking up order_id:', order_id);

    const { data, error } = await supabase
      .from('purchases')
      .select('download_token, order_id')
      .eq('order_id', String(order_id))
      .single();

    console.log('Query result:', { data, error: error?.message });

    if (error || !data) {
      return res.status(404).json({ error: 'Purchase not found', order_id });
    }

    res.status(200).json({ download_token: data.download_token });
  } catch (err) {
    console.error('Purchase lookup error:', err.message);
    res.status(500).json({ error: 'Failed to fetch purchase', details: err.message });
  }
}
