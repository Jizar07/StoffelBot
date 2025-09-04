export const PAYPAL_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
  currency: 'USD',
  intent: 'subscription'
}

export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_MONTHLY,
    name: 'Stoffel Bot Monthly',
    price: 6.99,
    description: 'Full access to all Discord bot features',
    billing: 'monthly'
  },
  yearly: {
    id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_YEARLY,
    name: 'Stoffel Bot Yearly',
    price: 49.99,
    description: 'Full access to all Discord bot features (Save $33.89/year)',
    billing: 'yearly'
  }
}

export interface SubscriptionData {
  userId: string
  subscriptionId: string
  planId: string
  status: 'active' | 'cancelled' | 'expired'
  startDate: string
  nextBillingDate: string
}