import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('license_key')
      .eq('download_token', token)
      .eq('status', 'paid')
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.status(200).json({ license_key: data.license_key || null });
  } catch (err) {
    console.error('License fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch license' });
  }
}
