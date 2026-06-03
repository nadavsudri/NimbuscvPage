import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Generate a unique download token
  const token = crypto.randomUUID();

  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: { download_token: token },
            },
            product_options: {
              redirect_url: `${process.env.SITE_URL}/success.html?token=${token}`,
            },
          },
          relationships: {
            store: {
              data: { type: 'stores', id: process.env.LEMONSQUEEZY_STORE_ID },
            },
            variant: {
              data: { type: 'variants', id: process.env.LEMONSQUEEZY_VARIANT_ID },
            },
          },
        },
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      console.error('LemonSqueezy error:', JSON.stringify(json));
      return res.status(500).json({ error: 'Failed to create checkout' });
    }

    res.status(200).json({ url: json.data.attributes.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
