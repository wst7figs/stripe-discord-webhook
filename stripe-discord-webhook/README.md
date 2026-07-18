# Stripe → Discord Payment Notifications

Posts a message to a Discord channel every time a Stripe payment succeeds.

## Setup

1. Push this repo to GitHub, then import it into Vercel.
2. In Vercel → Settings → Environment Variables, add:
   - `STRIPE_SECRET_KEY` — from Stripe Dashboard → Developers → API keys
   - `DISCORD_WEBHOOK_URL` — from Discord channel → Integrations → Webhooks
   - `STRIPE_WEBHOOK_SECRET` — you get this in step 3 below, add it after
3. Deploy. Copy your live URL (e.g. `https://yourproject.vercel.app`).
4. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://yourproject.vercel.app/api/webhook`
   - Events: `checkout.session.completed` and/or `payment_intent.succeeded`
   - Copy the Signing secret it gives you, paste it into Vercel as `STRIPE_WEBHOOK_SECRET`, redeploy.
5. Use Stripe's "Send test webhook" button on the endpoint page to confirm a message lands in Discord.

## Files

- `api/webhook.js` — the actual handler, verifies the Stripe signature and posts to Discord
- `vercel.json` — tells Vercel how to run the function
- `.env.example` — reference for which environment variables you need (don't commit a real `.env`)
