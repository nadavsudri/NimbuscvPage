import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Never expose posters' emails to the browser. Select '*' (schema-agnostic)
// and drop the email field in code.
function stripEmail(row) {
  if (!row) return row;
  const { email, ...rest } = row;
  return rest;
}

// See threads.js - verified email + real ownership, or null for guests.
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

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Thread ID required' });
  }

  try {
    if (req.method === 'GET') {
      const { data: thread, error: threadError } = await supabase
        .from('forum_threads')
        .select('*')
        .eq('id', id)
        .single();

      if (threadError) throw threadError;
      if (!thread) return res.status(404).json({ error: 'Thread not found' });

      const { data: comments, error: commentsError } = await supabase
        .from('forum_comments')
        .select('*')
        .eq('thread_id', id)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      return res.status(200).json({ thread: stripEmail(thread), comments: (comments || []).map(stripEmail) });
    }

    if (req.method === 'POST') {
      const { body, name } = req.body || {};

      // Server decides email + owner badge; the client can't spoof either.
      const who = await verifiedIdentity(req);
      const finalEmail = who ? who.email : ((req.body && req.body.email) || 'guest@nimbus.local');
      const owns = who ? who.owns : false;

      if (!body || !name) {
        return res.status(400).json({ error: 'Name and message required' });
      }

      const { data, error } = await supabase
        .from('forum_comments')
        .insert([{
          thread_id: id,
          title: 'Reply',
          body,
          name,
          email: finalEmail,
          owns_nimbus: owns
        }])
        .select('*');

      if (error) throw error;

      // Update thread comment count
      await supabase.rpc('increment_comment_count', { thread_id: id });

      return res.status(201).json(stripEmail(data[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Forum thread error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
