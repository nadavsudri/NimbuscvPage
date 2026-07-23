import { createClient } from '@supabase/supabase-js';

// Service-key client: bypasses RLS and can read the full purchases table.
// We authenticate the caller ourselves via their Supabase login token below.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Verify the bearer token minted by Supabase Auth and return the logged-in user.
async function getUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user || !user.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Match purchases to the account's VERIFIED email (case-insensitive).
    // This surfaces purchases made before the account existed, too.
    const { data, error } = await supabase
      .from('purchases')
      .select('id, order_id, license_key, amount, currency, status, created_at, download_count')
      .ilike('email', user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('purchases fetch error:', error.message);
      return res.status(500).json({ error: 'Failed to load purchases' });
    }

    res.status(200).json({ email: user.email, purchases: data || [] });
  } catch (err) {
    console.error('purchases handler error:', err.message);
    res.status(500).json({ error: 'Failed to load purchases' });
  }
}
