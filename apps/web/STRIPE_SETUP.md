# Stripe Integration Setup Guide

This guide will walk you through setting up Stripe for your Vision Maps application. The implementation follows best practices from the "How I Stay Sane Implementing Stripe" guide.

## Overview

This app uses:
- **Stripe** for payment processing
- **Redis** (Vercel KV) for caching subscription data
- **Convex** for storing plan mappings and metadata
- **Clerk** for authentication (user identification only, NOT for payment management)

## Plan Tiers

- **Free**: Default tier, no payment required
- **Pro**: Individual subscription plan
- **Team**: Organization plan with seat-based billing (requires organization ownership)

---

## Prerequisites

Before you begin, make sure you have:
- [ ] Stripe account (https://stripe.com)
- [ ] Redis instance (Vercel KV recommended, or any Redis provider)
- [ ] Stripe CLI installed (https://stripe.com/docs/stripe-cli)

---

## Part 1: Stripe Dashboard Setup

### Step 1: Create Your Stripe Products

1. Go to https://dashboard.stripe.com/test/products
2. Click **"+ Add product"**

#### Create Pro Plan Product
- **Name**: "Pro Plan"
- **Description**: "Individual subscription with unlimited features"
- **Pricing**:
  - **Recurring**: Monthly
  - **Price**: $XX.XX (set your price)
  - Click **"Save product"**
- Copy the **Price ID** (starts with `price_`) - you'll need this for `STRIPE_PRO_PRICE_ID`

#### Create Team Plan Product
- **Name**: "Team Plan"
- **Description**: "Organization plan with seat-based billing"
- **Pricing**:
  - **Recurring**: Monthly
  - **Price**: $XX.XX per seat (set your price)
  - **Billing**: Set pricing model to **"Per unit"**
  - Click **"Save product"**
- Copy the **Price ID** (starts with `price_`) - you'll need this for `STRIPE_TEAM_PRICE_ID`

### Step 2: Configure Stripe Settings

#### Disable Cash App Pay (Recommended)
1. Go to https://dashboard.stripe.com/settings/payment_methods
2. Find **"Cash App Pay"**
3. Click **"Turn off"**

> **Why?** Cash App Pay has higher fraud rates. Over 90% of cancelled transactions use Cash App Pay.

#### Enable "Limit customers to one subscription"
1. Go to https://dashboard.stripe.com/settings/billing/automatic
2. Scroll to **"Subscriptions"**
3. Enable **"Limit customers to one subscription"**
4. Click **"Save"**

> **Why?** This prevents race conditions where users could create multiple subscriptions.

### Step 3: Get Your API Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Copy your **Secret key** (starts with `sk_test_`) → `STRIPE_SECRET_KEY`

> **Important**: These are TEST keys. You'll need to get LIVE keys when you go to production.

---

## Part 2: Redis Setup (Vercel KV)

### Step 1: Create Redis Database on Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Navigate to **Storage** tab
3. Click **"Create Database"**
4. Select **"KV"** (Redis)
5. Configure:
   - **Name**: "vision-maps-stripe" (or your preference)
   - **Region**: Choose closest to your users
6. Click **"Create"**

### Step 2: Get Redis Connection String

1. Click on your newly created KV database
2. Navigate to the **".env.local"** tab
3. Copy the **REDIS_URL** value:
   ```
   REDIS_URL=redis://default:xxxxx@xxxxx.vercel-storage.com:6379
   ```
4. Add it to your `.env.local` file

> **Alternative**: If using a different Redis provider (AWS ElastiCache, Railway, etc.), get your Redis connection URL in the format: `redis://username:password@host:port`

---

## Part 3: Environment Variables

### Step 1: Copy Example File

```bash
cp .env.example .env.local
```

### Step 2: Fill in Stripe Variables

```env
# Stripe Keys (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Stripe Price IDs (from Product setup)
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_TEAM_PRICE_ID=price_xxxxx

# Redis (from Vercel KV or your Redis provider)
REDIS_URL=redis://default:xxxxx@xxxxx.vercel-storage.com:6379

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to your production URL when deploying
```

---

## Part 4: Webhook Setup (Development)

### Step 1: Install Stripe CLI

If you haven't already:
- **macOS**: `brew install stripe/stripe-cli/stripe`
- **Linux**: Download from https://github.com/stripe/stripe-cli/releases
- **Windows**: Download from https://github.com/stripe/stripe-cli/releases

### Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open a browser window to authenticate.

### Step 3: Start Webhook Listener

You have **two options** for webhook handling:

#### Option A: Next.js API Route (Recommended for Development)

In a **separate terminal window**, run:

```bash
pnpm stripe:listen
```

Or:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

#### Option B: Convex HTTP Endpoint (Recommended for Production)

First, get your Convex deployment URL:

```bash
npx convex env get CONVEX_SITE_URL
```

Then run:

```bash
stripe listen --forward-to https://your-deployment.convex.site/stripe/webhook
```

Or use the helper command:

```bash
pnpm stripe:listen:convex
```

This will show you the command to run with your Convex URL automatically filled in.

> **Why use Convex for webhooks?** Convex HTTP endpoints are more reliable in production since they don't depend on your Next.js server being up. The webhook goes directly to Convex, which then updates your database.

### Step 4: Copy Webhook Secret

The CLI will output something like:

```
> Ready! Your webhook signing secret is whsec_xxxxx (^C to quit)
```

Copy the `whsec_xxxxx` value and add it to your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

> **Important**: Keep this terminal running while developing! Webhooks won't work without it.

---

## Part 5: Production Webhook Setup

### When You're Ready to Deploy

You have **two options** for production webhooks:

#### Option A: Next.js API Route

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Configure:
   - **Endpoint URL**: `https://your-production-domain.com/api/stripe/webhook`
   - **Description**: "Vision Maps Production Webhook (Next.js)"
   - **Events to send**: Select these events:

#### Option B: Convex HTTP Endpoint (Recommended)

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Configure:
   - **Endpoint URL**: `https://your-deployment.convex.site/stripe/webhook`
   - **Description**: "Vision Maps Production Webhook (Convex)"
   - **Events to send**: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.paused`
     - `customer.subscription.resumed`
     - `customer.subscription.pending_update_applied`
     - `customer.subscription.pending_update_expired`
     - `customer.subscription.trial_will_end`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `invoice.payment_action_required`
     - `invoice.upcoming`
     - `invoice.marked_uncollectible`
     - `invoice.payment_succeeded`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
4. Click **"Add endpoint"**
5. Click on the endpoint you just created
6. Copy the **Signing secret** (starts with `whsec_`) → Update `STRIPE_WEBHOOK_SECRET` in production

---

## Part 6: Testing Your Setup

### Test User Subscription (Pro Plan)

1. Start your development server: `pnpm dev`
2. Start the Stripe webhook listener: `pnpm stripe:listen` (in another terminal)
3. Navigate to your pricing page
4. Click "Subscribe to Pro"
5. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code
6. Complete checkout
7. You should be redirected back to your app
8. Check that:
   - Subscription appears in your Upstash Redis database
   - User plan is updated in Convex `user_plans` table
   - `useSubscription()` hook returns correct plan data

### Test Organization Subscription (Team Plan)

1. Create an organization in your app
2. Make sure you're the owner
3. Navigate to organization billing settings
4. Click "Subscribe to Team Plan"
5. Enter number of seats (should match your org member count)
6. Use test card `4242 4242 4242 4242`
7. Complete checkout
8. Check that:
   - Org subscription appears in Redis
   - Org plan is updated in Convex `org_plans` table
   - Seat count matches your organization members

### Test Webhooks

1. In Stripe Dashboard, go to **Workbench** → **Events**
2. You should see events being created
3. Check your terminal running `stripe:listen` - you should see events being forwarded
4. Check your Next.js logs - you should see webhook processing logs

---

## Part 7: Going to Production

### Step 1: Switch to Live Mode

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode** (top right)
2. Repeat **Part 1** (create products) in Live mode
3. Get new **Live API keys** from https://dashboard.stripe.com/apikeys
4. Update your production environment variables with **Live keys**

### Step 2: Create Production Webhook

Follow **Part 5** above to create a production webhook endpoint.

### Step 3: Update Production Environment

Make sure all these are set in your production environment:

```env
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # From production webhook
STRIPE_PRO_PRICE_ID=price_xxxxx    # From live products
STRIPE_TEAM_PRICE_ID=price_xxxxx   # From live products
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

### Step 4: Deploy

Deploy your application with the updated environment variables.

---

## Troubleshooting

### Webhooks not working?

- Make sure `stripe:listen` is running (development)
- Check that `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify webhook endpoint is accessible (production)
- Check webhook logs in Stripe Dashboard

### Subscription not updating?

- Check Redis/Vercel KV to see if data is being cached
- Check Convex tables (`user_plans` or `org_plans`) for updates
- Look for errors in webhook logs
- Verify the Stripe customer ID is being stored correctly

### User can't checkout?

- Verify Stripe publishable key is correct
- Check that price IDs are valid
- Make sure user is authenticated (for user plans)
- Make sure user is org owner (for team plans)

### Seats not updating for organizations?

- Check that the `quantity` field is being passed to Stripe checkout
- Verify the webhook is processing subscription updates
- Call `api.orgPlans.updateOrgSeats` when members are added/removed

---

## Architecture Notes

### Data Flow

1. **Checkout**: User clicks subscribe → API creates Stripe customer → Stores mapping in Redis & Convex → Creates checkout session
2. **Payment**: User completes payment → Stripe sends webhook → We sync data to Redis → Update Convex
3. **Access Check**: Frontend uses `useSubscription()` hook → Queries Convex for plan data → Checks features

### Why Redis + Convex?

- **Redis** (Vercel KV): Fast cache for Stripe subscription data (prevents rate limits, reduces latency)
- **Convex**: Source of truth for user/org → Stripe customer mappings, enables realtime queries

### Single Source of Truth

The `syncStripeDataToKV()` function is called in:
1. `/api/stripe/success` - After successful checkout
2. `/api/stripe/webhook` - On all subscription events

This ensures subscription state is always in sync, avoiding split-brain issues.

---

## Support

If you run into issues:
1. Check the Stripe Dashboard logs
2. Check your application logs
3. Verify all environment variables are set
4. Test with Stripe test cards first

## Additional Resources

- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv)
- [Redis Node.js Client](https://github.com/redis/node-redis)
- [Original Guide: "How I Stay Sane Implementing Stripe"](https://github.com/t3dotgg/stripe-guide)
