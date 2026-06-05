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
    const { data, error } = await supabase
      .from('purchases')
      .select('download_token')
      .eq('order_id', order_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.status(200).json({ download_token: data.download_token });
  } catch (err) {
    console.error('Purchase lookup error:', err.message);
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
}
