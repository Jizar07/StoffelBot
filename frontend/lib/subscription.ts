import { SubscriptionData } from './paypal'

// This would typically connect to your database
// For now, we'll use localStorage/sessionStorage for demo purposes
export class SubscriptionManager {
  private static STORAGE_KEY = 'stoffel_subscription'

  static async getUserSubscription(userId: string): Promise<SubscriptionData | null> {
    try {
      // In production, this would be a database call
      // For demo purposes, check localStorage
      if (typeof window !== 'undefined') {
        // First check our main storage
        const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`)
        if (stored) {
          const subscription: SubscriptionData = JSON.parse(stored)
          
          // Check if subscription is still active
          if (subscription.status === 'active') {
            const nextBilling = new Date(subscription.nextBillingDate)
            if (nextBilling > new Date()) {
              return subscription
            } else {
              // Subscription expired
              subscription.status = 'expired'
              localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(subscription))
            }
          }
        }
        
        // Also check for PayPal subscription data (fallback)
        const keys = Object.keys(localStorage)
        for (const key of keys) {
          if (key.startsWith('subscription_')) {
            const paypalSub = JSON.parse(localStorage.getItem(key) || '{}')
            if (paypalSub.subscriptionId && paypalSub.status === 'active') {
              console.log('Found PayPal subscription:', paypalSub)
              
              // Convert PayPal format to our format
              const subscription: SubscriptionData = {
                userId: userId,
                subscriptionId: paypalSub.subscriptionId,
                planId: paypalSub.planId,
                status: 'active',
                startDate: paypalSub.startDate,
                nextBillingDate: paypalSub.nextBillingDate
              }
              
              // Store in our main format for future use
              localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(subscription))
              return subscription
            }
          }
        }
      }
      
      // TODO: Replace with actual database call
      // const subscription = await db.subscriptions.findOne({ userId })
      // return subscription
      
      return null
    } catch (error) {
      console.error('Error fetching subscription:', error)
      return null
    }
  }

  static async setUserSubscription(userId: string, subscriptionData: SubscriptionData): Promise<void> {
    try {
      // In production, this would be a database call
      // For demo purposes, use localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(subscriptionData))
      }
      
      // TODO: Replace with actual database call
      // await db.subscriptions.upsert({ userId }, subscriptionData)
    } catch (error) {
      console.error('Error saving subscription:', error)
      throw error
    }
  }

  static async cancelUserSubscription(userId: string): Promise<void> {
    try {
      // In production, this would update the database and call PayPal API
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`)
        if (stored) {
          const subscription: SubscriptionData = JSON.parse(stored)
          subscription.status = 'cancelled'
          localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(subscription))
        }
      }
      
      // TODO: Replace with actual database call and PayPal API call
      // await db.subscriptions.update({ userId }, { status: 'cancelled' })
      // await paypalAPI.cancelSubscription(subscriptionId)
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      throw error
    }
  }

  static hasActiveSubscription(subscription: SubscriptionData | null): boolean {
    if (!subscription) return false
    
    return subscription.status === 'active' && 
           new Date(subscription.nextBillingDate) > new Date()
  }
}