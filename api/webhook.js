import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = {
  api: { bodyParser: false },
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function verifySignature(rawBody, signatureHeader, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signatureHeader)
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await readBody(req);
  const signature = req.headers['x-signature'];

  if (!signature || !verifySignature(body, signature, process.env.LEMONSQUEEZY_WEBHOOK_SECRET)) {
    console.error('Webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(body.toString());
  const eventName = event.meta?.event_name;

  if (eventName === 'order_created') {
    const attrs = event.data?.attributes;

    const customData = event.meta?.custom_data || {};

    const { error } = await supabase.from('purchases').insert({
      email: attrs?.user_email,
      name: attrs?.user_name,
      order_id: String(event.data?.id),
      download_token: customData.download_token || null,
      amount: attrs?.total,
      currency: attrs?.currency,
      status: attrs?.status,
    });

    if (error) {
      console.error('Supabase insert error:', error.message);
    }
  }

  if (eventName === 'license_key_created') {
    const attrs = event.data?.attributes;
    const key = attrs?.key;
    const orderId = String(attrs?.order_id);

    if (key && orderId) {
      const { error } = await supabase
        .from('purchases')
        .update({ license_key: key })
        .eq('order_id', orderId);

      if (error) {
        console.error('License key update error:', error.message);
      }
    }
  }

  res.status(200).json({ received: true });
}
