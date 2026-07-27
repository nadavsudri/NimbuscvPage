import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Public columns only — never expose posters' emails to the browser.
const PUBLIC_COLS = 'id, title, body, name, owns_nimbus, topic, comment_count, created_at';

// If the request carries a valid Supabase login token, return the caller's
// VERIFIED email and whether they actually own Nimbus (a paid purchase on that
// email). Returns null for guests. This is what lets us trust the "Nimbus
// owner" badge instead of taking the client's word for it.
async function verifiedIdentity(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.email) return null;
  const email = data.user.email;
  const { data: rows } = await supabase
    .from('purchases')
    .select('id')
    .ilike('email', email)
    .eq('status', 'paid')
    .limit(1);
  return { email, owns: !!(rows && rows.length) };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('forum_threads')
        .select(PUBLIC_COLS)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { title, body, name, email, topic } = req.body || {};

      // Server decides email + owner badge; the client can't spoof either.
      const who = await verifiedIdentity(req);
      const finalEmail = who ? who.email : email;
      const owns = who ? who.owns : false;

      if (!title || !body || !name || !finalEmail) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data, error } = await supabase
        .from('forum_threads')
        .insert([{ title, body, name, email: finalEmail, owns_nimbus: owns, topic: topic || 'general' }])
        .select(PUBLIC_COLS);

      if (error) throw error;
      return res.status(201).json(data[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Forum threads error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
