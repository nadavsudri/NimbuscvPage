import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Account-holder download. Unlike the one-time email link (api/download.js),
// this does NOT expire 30 min after purchase - a logged-in owner can re-download
// their product anytime. Ownership is enforced by matching the purchase's email
// to the authenticated account's verified email.
export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user || !user.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing purchase id' });

  try {
    const { data: purchase, error } = await supabase
      .from('purchases')
      .select('id, email, status')
      .eq('id', id)
      .single();

    if (error || !purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Ownership check (case-insensitive email match).
    if ((purchase.email || '').toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({ error: 'This purchase is not on your account' });
    }

    if (purchase.status && purchase.status !== 'paid') {
      return res.status(403).json({ error: 'Purchase is not completed' });
    }

    const { data, error: signErr } = await supabase.storage
      .from('releases')
      .createSignedUrl(process.env.PRODUCT_FILE_PATH, 1800); // 30-min signed URL

    if (signErr) {
      console.error('Signed URL error:', signErr.message);
      return res.status(500).json({ error: 'Failed to generate download link' });
    }

    // Return the URL as JSON (the client fetches this with an auth header, then
    // navigates to the signed URL) rather than 303-redirecting the fetch itself.
    res.status(200).json({ url: data.signedUrl });
  } catch (err) {
    console.error('account download error:', err.message);
    res.status(500).json({ error: 'Download failed' });
  }
}
