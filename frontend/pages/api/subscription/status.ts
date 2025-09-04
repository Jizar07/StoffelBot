import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { SubscriptionManager } from '../../../lib/subscription'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const subscription = await SubscriptionManager.getUserSubscription(session.user.id)
    const hasActive = SubscriptionManager.hasActiveSubscription(subscription)

    return res.status(200).json({
      hasActiveSubscription: hasActive,
      subscription: subscription
    })
  } catch (error) {
    console.error('Subscription status error:', error)
    return res.status(500).json({ error: 'Failed to get subscription status' })
  }
}