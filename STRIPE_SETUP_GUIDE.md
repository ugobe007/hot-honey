# Stripe Payment Integration Setup Guide

## Overview
Hot Match uses Stripe for subscription billing. This guide walks through the complete setup process.

## 1. Stripe Dashboard Setup

### Create Products & Prices
Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products) and create:

#### Startup Tiers

| Product | Monthly Price | Yearly Price | Price ID Env Var |
|---------|---------------|--------------|-------------------|
| **Flame** | $49/month | $470/year | `STRIPE_PRICE_FLAME_MONTHLY` / `STRIPE_PRICE_FLAME_YEARLY` |
| **Inferno** | $199/month | $1,910/year | `STRIPE_PRICE_INFERNO_MONTHLY` / `STRIPE_PRICE_INFERNO_YEARLY` |

#### Investor Tiers

| Product | Monthly Price | Yearly Price | Price ID Env Var |
|---------|---------------|--------------|-------------------|
| **Scout** | $99/month | $950/year | `STRIPE_PRICE_SCOUT_MONTHLY` / `STRIPE_PRICE_SCOUT_YEARLY` |
| **Dealflow Pro** | $499/month | $4,790/year | `STRIPE_PRICE_DEALFLOW_PRO_MONTHLY` / `STRIPE_PRICE_DEALFLOW_PRO_YEARLY` |

### Get API Keys
1. Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)
2. Copy your:
   - **Publishable Key** (starts with `pk_`)
   - **Secret Key** (starts with `sk_`)

### Configure Webhook
1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set URL to: `https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Webhook Signing Secret** (starts with `whsec_`)

### Configure Customer Portal
1. Go to [Stripe Dashboard → Settings → Billing → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable the portal
3. Configure:
   - Allow customers to update payment methods ✓
   - Allow customers to cancel subscriptions ✓
   - Allow customers to switch plans ✓

---

## 2. Supabase Edge Functions Setup

### Deploy Functions
```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref unkpogyhhjbvxxjvmxlt

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set STRIPE_PRICE_FLAME_MONTHLY=price_xxxxx
supabase secrets set STRIPE_PRICE_FLAME_YEARLY=price_xxxxx
supabase secrets set STRIPE_PRICE_INFERNO_MONTHLY=price_xxxxx
supabase secrets set STRIPE_PRICE_INFERNO_YEARLY=price_xxxxx
supabase secrets set STRIPE_PRICE_SCOUT_MONTHLY=price_xxxxx
supabase secrets set STRIPE_PRICE_SCOUT_YEARLY=price_xxxxx
supabase secrets set STRIPE_PRICE_DEALFLOW_PRO_MONTHLY=price_xxxxx
supabase secrets set STRIPE_PRICE_DEALFLOW_PRO_YEARLY=price_xxxxx

# Deploy functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy create-portal-session
```

---

## 3. Environment Variables

### Frontend (.env)
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_SUPABASE_URL=https://unkpogyhhjbvxxjvmxlt.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Fly.io Secrets
```bash
fly secrets set STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

---

## 4. Database Tables

The migration created these tables:

### `user_subscriptions`
```sql
- id (UUID)
- user_id (UUID, FK to auth.users)
- tier (TEXT: spark, flame, inferno, scout, dealflow_pro)
- status (TEXT: active, canceled, past_due, trialing)
- stripe_customer_id (TEXT)
- stripe_subscription_id (TEXT)
- billing_cycle (TEXT: monthly, yearly)
- next_billing_date (TIMESTAMPTZ)
- trial_ends_at (TIMESTAMPTZ)
- cancel_at_period_end (BOOLEAN)
```

### `payment_history`
```sql
- id (UUID)
- user_id (UUID)
- stripe_payment_intent_id (TEXT)
- amount (INTEGER, in cents)
- status (TEXT)
- receipt_url (TEXT)
```

### `stripe_products`
```sql
- tier (TEXT, UNIQUE)
- stripe_product_id (TEXT)
- stripe_price_id_monthly (TEXT)
- stripe_price_id_yearly (TEXT)
- price_monthly (INTEGER, cents)
- features (JSONB)
```

---

## 5. Testing Flow

### Test Mode
Use Stripe test mode first:
- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any CVC

### Test the Flow
1. Go to `/get-matched` → Select a tier → Click "Get Started"
2. Fill in checkout form → Click "Start Free Trial"
3. Should redirect to Stripe Checkout
4. Complete payment with test card
5. Should redirect to `/get-matched/success`
6. Check Supabase `user_subscriptions` table for new record

### Test Webhook
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local function
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.paid
```

---

## 6. User Flow Summary

```
User visits /get-matched
    ↓
Selects tier (Spark/Flame/Inferno)
    ↓
Clicks "Get Started"
    ↓
Goes to /checkout?tier=flame&type=startup
    ↓
Fills in name/email
    ↓
[Free tier] → Creates account → Redirects to /get-matched/success
[Paid tier] → Redirects to Stripe Checkout
    ↓
Completes payment (7-day trial starts)
    ↓
Stripe webhook → Updates user_subscriptions
    ↓
Redirects to /get-matched/success with confetti 🎉
    ↓
User can access tier-gated services
```

---

## 7. Managing Subscriptions

### Customer Portal
Users can manage their subscription at:
```
/api/create-portal-session → Stripe Customer Portal
```

This allows them to:
- Update payment method
- Cancel subscription
- Download invoices
- Switch plans

### Admin Access
View all subscriptions in:
- Stripe Dashboard → Customers
- Supabase → `user_subscriptions` table

---

## 8. Revenue Reports

### Stripe Dashboard
- [Revenue](https://dashboard.stripe.com/revenue)
- [MRR](https://dashboard.stripe.com/billing/meters)
- [Churn](https://dashboard.stripe.com/billing/subscriptions)

### Custom Queries
```sql
-- Monthly Revenue by Tier
SELECT 
  tier,
  COUNT(*) as subscribers,
  SUM(last_payment_amount) / 100.0 as mrr
FROM user_subscriptions
WHERE status = 'active'
GROUP BY tier;

-- Trial Conversions
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) FILTER (WHERE trial_ends_at IS NOT NULL) as trials,
  COUNT(*) FILTER (WHERE trial_ends_at IS NOT NULL AND status = 'active') as converted
FROM user_subscriptions
GROUP BY 1
ORDER BY 1 DESC;
```

---

## 9. Troubleshooting

### Common Issues

**Webhook not receiving events**
- Check webhook URL is correct
- Verify signing secret matches
- Check Supabase function logs: `supabase functions logs stripe-webhook`

**Checkout not redirecting**
- Check CORS settings in edge function
- Verify price IDs are correct
- Check browser console for errors

**Subscription not updating**
- Check webhook handler logs
- Verify RLS policies allow updates
- Check user_id in metadata

---

## 10. Going Live Checklist

- [ ] Switch to Stripe live mode keys
- [ ] Create live products and prices
- [ ] Update all price ID secrets
- [ ] Update webhook endpoint to production URL
- [ ] Test full flow with real card
- [ ] Enable Stripe Radar for fraud protection
- [ ] Set up Stripe notifications for disputes/refunds
- [ ] Configure tax settings if applicable
