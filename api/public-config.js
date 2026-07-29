// Returns PUBLIC Supabase config for the browser (anon key is safe to expose -
// it only grants what Row Level Security allows). Keeps values in Vercel env
// so nothing is hardcoded in the static HTML (no build step to inject them).
export default function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return res.status(500).json({ error: 'Auth is not configured' });
  }

  // Cache at the edge - this never changes per deploy.
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).json({ url, anonKey });
}
