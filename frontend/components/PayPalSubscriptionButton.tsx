import { useEffect, useRef, useState } from 'react'
import { PAYPAL_CONFIG, SUBSCRIPTION_PLANS } from '../lib/paypal'

interface PayPalSubscriptionButtonProps {
  selectedPlan: 'monthly' | 'yearly'
  onSuccess: () => void
  onError: (error: string) => void
  onCancel: () => void
}

declare global {
  interface Window {
    paypal: any
  }
}

export default function PayPalSubscriptionButton({ 
  selectedPlan, 
  onSuccess, 
  onError, 
  onCancel 
}: PayPalSubscriptionButtonProps) {
  const paypalRef = useRef<HTMLDivElement>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [isButtonRendered, setIsButtonRendered] = useState(false)

  // Load PayPal script
  useEffect(() => {
    if (window.paypal || isScriptLoaded) {
      setIsScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.clientId}&vault=true&intent=subscription&currency=USD`
    script.addEventListener('load', () => {
      setIsScriptLoaded(true)
    })
    script.addEventListener('error', () => {
      onError('Failed to load PayPal script')
    })
    document.body.appendChild(script)

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [onError])

  // Render PayPal button when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !window.paypal || !paypalRef.current || isButtonRendered) {
      return
    }

    const planId = SUBSCRIPTION_PLANS[selectedPlan].id
    if (!planId) {
      onError(`Plan ID not configured for ${selectedPlan}`)
      return
    }

    console.log('Rendering PayPal button for plan:', selectedPlan, 'Plan ID:', planId)

    // Clear any existing buttons
    paypalRef.current.innerHTML = ''

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'subscribe'
        },
        createSubscription: function(data: any, actions: any) {
          console.log('Creating subscription with plan ID:', planId)
          return actions.subscription.create({
            plan_id: planId
          })
        },
        onApprove: function(data: any, actions: any) {
          console.log('Subscription approved:', data)
          console.log('Subscription ID:', data.subscriptionID)
          
          // Store subscription info in localStorage for demo purposes
          if (data.subscriptionID) {
            const subscriptionData = {
              subscriptionId: data.subscriptionID,
              planId: planId,
              status: 'active',
              startDate: new Date().toISOString(),
              nextBillingDate: new Date(Date.now() + (selectedPlan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
            }
            
            // Store in localStorage (in production, this would be sent to your backend)
            localStorage.setItem(`subscription_${data.orderID || 'temp'}`, JSON.stringify(subscriptionData))
            console.log('Stored subscription data:', subscriptionData)
          }
          
          onSuccess()
        },
        onError: function(err: any) {
          console.error('PayPal button error:', err)
          onError('Payment failed. Please try again.')
        },
        onCancel: function(data: any) {
          console.log('Payment cancelled:', data)
          onCancel()
        }
      }).render(paypalRef.current)
      
      setIsButtonRendered(true)
    } catch (error) {
      console.error('Error rendering PayPal button:', error)
      onError('Failed to initialize payment system')
    }
  }, [isScriptLoaded, selectedPlan, onSuccess, onError, onCancel, isButtonRendered])

  // Re-render button when plan changes
  useEffect(() => {
    if (isButtonRendered) {
      setIsButtonRendered(false)
    }
  }, [selectedPlan])

  return (
    <div>
      <div ref={paypalRef} id={`paypal-button-${selectedPlan}`}></div>
      {!isScriptLoaded && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Loading payment system...
        </div>
      )}
    </div>
  )
}