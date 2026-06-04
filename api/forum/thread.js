import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Thread ID required' });
  }

  try {
    if (req.method === 'GET') {
      // Get thread with comments
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

      return res.status(200).json({ thread, comments });
    }

    if (req.method === 'POST') {
      // Add comment to thread
      const { body, name, email, owns_nimbus } = req.body;

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
          email: email || 'user@nimbus.local',
          owns_nimbus: owns_nimbus || false
        }])
        .select();

      if (error) throw error;

      // Update thread comment count
      await supabase.rpc('increment_comment_count', { thread_id: id });

      return res.status(201).json(data[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Forum thread error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
