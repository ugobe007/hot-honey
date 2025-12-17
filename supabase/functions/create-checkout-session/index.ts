// Supabase Edge Function: Create Stripe Checkout Session
// Deploy with: supabase functions deploy create-checkout-session

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const PRICE_IDS: Record<string, { monthly: string; yearly: string }> = {
  flame: {
    monthly: Deno.env.get('STRIPE_PRICE_FLAME_MONTHLY') || '',
    yearly: Deno.env.get('STRIPE_PRICE_FLAME_YEARLY') || '',
  },
  inferno: {
    monthly: Deno.env.get('STRIPE_PRICE_INFERNO_MONTHLY') || '',
    yearly: Deno.env.get('STRIPE_PRICE_INFERNO_YEARLY') || '',
  },
  scout: {
    monthly: Deno.env.get('STRIPE_PRICE_SCOUT_MONTHLY') || '',
    yearly: Deno.env.get('STRIPE_PRICE_SCOUT_YEARLY') || '',
  },
  dealflow_pro: {
    monthly: Deno.env.get('STRIPE_PRICE_DEALFLOW_PRO_MONTHLY') || '',
    yearly: Deno.env.get('STRIPE_PRICE_DEALFLOW_PRO_YEARLY') || '',
  },
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { tier, billingCycle, userId, email, successUrl, cancelUrl } = await req.json()

    // Validate tier
    if (!PRICE_IDS[tier]) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription tier' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const priceId = PRICE_IDS[tier][billingCycle as 'monthly' | 'yearly']
    
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Price not configured for this tier/cycle' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        user_id: userId,
        tier: tier,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          tier: tier,
        },
        trial_period_days: 7, // 7-day free trial
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    })

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
