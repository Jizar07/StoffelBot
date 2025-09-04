import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import axios from 'axios'

async function getPayPalAccessToken() {
  const client_id = process.env.PAYPAL_CLIENT_ID!
  const client_secret = process.env.PAYPAL_CLIENT_SECRET!
  const base_url = process.env.NODE_ENV === 'production' 
    ? 'https://api.paypal.com' 
    : 'https://api.sandbox.paypal.com'

  try {
    const response = await axios.post(`${base_url}/v1/oauth2/token`, 
      'grant_type=client_credentials',
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en_US',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username: client_id,
          password: client_secret
        }
      }
    )
    
    return response.data.access_token
  } catch (error) {
    console.error('PayPal token error:', error)
    throw new Error('Failed to get PayPal access token')
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { planId } = req.body
    
    const accessToken = await getPayPalAccessToken()
    const base_url = process.env.NODE_ENV === 'production' 
      ? 'https://api.paypal.com' 
      : 'https://api.sandbox.paypal.com'

    const subscriptionData = {
      plan_id: planId,
      subscriber: {
        name: {
          given_name: session.user.name?.split(' ')[0] || 'User',
          surname: session.user.name?.split(' ').slice(1).join(' ') || 'Name'
        },
        email_address: session.user.email
      },
      application_context: {
        brand_name: 'Stoffel Bot',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: `${process.env.NEXTAUTH_URL}/payment/success`,
        cancel_url: `${process.env.NEXTAUTH_URL}/payment/cancel`
      }
    }

    const response = await axios.post(
      `${base_url}/v1/billing/subscriptions`,
      subscriptionData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    )

    return res.status(200).json(response.data)
  } catch (error: any) {
    console.error('Subscription creation error:', error.response?.data || error.message)
    return res.status(500).json({ error: 'Failed to create subscription' })
  }
}