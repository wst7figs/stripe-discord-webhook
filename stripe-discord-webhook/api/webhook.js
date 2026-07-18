// api/webhook.js
// Receives Stripe webhook events, verifies them, and posts a message to Discord when a payment succeeds.

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

// Vercel needs the raw body (not JSON-parsed) to verify the Stripe signature.
export const config = {
  api: {
    bodyParser: false,
  },
};

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

async function sendDiscordMessage(content) {
  const res = await fetch(discordWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord webhook failed: ${res.status} ${text}`);
  }
}

function formatAmount(amountInCents, currency) {
  const amount = (amountInCents / 100).toFixed(2);
  return `${amount} ${currency.toUpperCase()}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  let event;

  try {
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const amount = formatAmount(session.amount_total, session.currency);
        const customerEmail = session.customer_details?.email || 'Unknown customer';
        const message =
          `**New payment received**\n` +
          `Amount: ${amount}\n` +
          `Customer: ${customerEmail}`;
        await sendDiscordMessage(message);
        break;
      }

      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const amount = formatAmount(intent.amount, intent.currency);
        const message =
          `**New payment received**\n` +
          `Amount: ${amount}\n` +
          `Payment ID: ${intent.id}`;
        await sendDiscordMessage(message);
        break;
      }

      default:
        // Ignore other event types, nothing to do
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err.message);
    // Still return 200 to Stripe so it doesn't keep retrying on a Discord-side failure,
    // but log it so you can see it happened.
    return res.status(200).json({ received: true, warning: err.message });
  }
}
