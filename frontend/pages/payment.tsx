import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { SUBSCRIPTION_PLANS, PAYPAL_CONFIG } from '../lib/paypal'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import LanguageToggle from '../components/LanguageToggle'
import PayPalSubscriptionButton from '../components/PayPalSubscriptionButton'

export default function PaymentPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { t } = useTranslation(['payment', 'common'])
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePaymentSuccess = () => {
    console.log('Payment successful, redirecting to success page')
    
    // Small delay to ensure subscription data is saved
    setTimeout(() => {
      router.push('/payment/success')
    }, 1000)
  }

  const handlePaymentError = (errorMessage: string) => {
    console.error('Payment error:', errorMessage)
    setError(errorMessage)
  }

  const handlePaymentCancel = () => {
    console.log('Payment cancelled by user')
    setError('Payment was cancelled')
  }

  // Debug: Log plan IDs on component mount
  useEffect(() => {
    console.log('SUBSCRIPTION_PLANS:', SUBSCRIPTION_PLANS)
    console.log('Monthly Plan ID:', SUBSCRIPTION_PLANS.monthly.id)
    console.log('Yearly Plan ID:', SUBSCRIPTION_PLANS.yearly.id)
    console.log('PayPal Client ID:', PAYPAL_CONFIG.clientId)
  }, [])

  // Admin function to simulate active subscription (for testing)
  const simulateActiveSubscription = async () => {
    if (session?.user?.id) {
      try {
        // Use the backend sandbox endpoint
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
        const response = await fetch(`${backendUrl}/api/sandbox/activate-subscription/${session.user.id}`, {
          method: 'POST'
        })
        
        if (response.ok) {
          console.log('✅ Activated sandbox subscription via backend')
          // Also save to localStorage for compatibility
          const fakeSubscription = {
            userId: session.user.id,
            subscriptionId: 'SANDBOX_SUB_' + Date.now(),
            planId: 'sandbox-plan',
            status: 'active',
            startDate: new Date().toISOString(),
            nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }
          localStorage.setItem(`stoffel_subscription_${session.user.id}`, JSON.stringify(fakeSubscription))
          
          // Redirect to servers page
          setTimeout(() => {
            router.push('/servers')
          }, 1000)
        } else {
          console.error('Failed to activate sandbox subscription')
          setError('Failed to activate sandbox subscription. Make sure SANDBOX_MODE=true in backend/.env')
        }
      } catch (error) {
        console.error('Error activating sandbox subscription:', error)
        setError('Backend connection failed. Make sure the backend is running.')
      }
    }
  }

  // Admin function to clear all subscriptions (for testing)
  const clearAllSubscriptions = () => {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('subscription_') || key.startsWith('stoffel_subscription_')) {
          localStorage.removeItem(key)
        }
      })
      console.log('🗑️ Cleared all subscription data for testing')
      setError(null)
      window.location.reload()
    }
  }

  // Handle client-side redirects
  useEffect(() => {
    if (!session && typeof window !== 'undefined') {
      router.push('/login')
    }
  }, [session, router])

  // Don't render anything during SSR or if no session
  if (!session) {
    return null
  }

  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '2rem' }}>
      <div style={{ 
        position: 'absolute', 
        top: '2rem', 
        right: '2rem' 
      }}>
        <LanguageToggle />
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
            {t('payment:chooseYourPlan')}
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            {t('payment:subscribeDescription')}
          </p>
        </header>

        {error && (
          <div style={{ 
            background: '#f87171', 
            color: 'white', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          <div 
            className="card" 
            style={{ 
              border: selectedPlan === 'monthly' ? '2px solid #4ade80' : '2px solid transparent',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedPlan('monthly')}
          >
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                {t('payment:monthlyPlan')}
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                ${SUBSCRIPTION_PLANS.monthly.price}
                <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/{t('common:month')}</span>
              </div>
              <p style={{ opacity: 0.9, marginBottom: '1.5rem' }}>
                {t('payment:monthlyDescription')}
              </p>
              <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}>✓ {t('payment:features.fullBotAccess')}</li>
                <li style={{ marginBottom: '0.5rem' }}>✓ {t('payment:features.allCommands')}</li>
                <li style={{ marginBottom: '0.5rem' }}>✓ {t('payment:features.uptime')}</li>
                <li style={{ marginBottom: '0.5rem' }}>✓ {t('payment:features.prioritySupport')}</li>
              </ul>
            </div>
          </div>

          <div 
            className="card" 
            style={{ 
              border: selectedPlan === 'yearly' ? '2px solid #4ade80' : '2px solid transparent',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={() => setSelectedPlan('yearly')}
          >
            <div style={{ 
              position: 'absolute', 
              top: '-10px', 
              right: '10px', 
              background: '#f59e0b', 
              color: 'white', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '12px', 
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}>
              {t('common:save')} 40%
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                {t('payment:yearlyPlan')}
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                ${SUBSCRIPTION_PLANS.yearly.price}
                <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/{t('common:year')}</span>
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1rem' }}>
                {t('payment:onlyPerMonth')}
              </div>
              <p style={{ opacity: 0.9, marginBottom: '1.5rem' }}>
                {t('payment:yearlyDescription')}
              </p>
              <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}>✓ {t('payment:features.fullBotAccess')}</li>
                <li style={{ marginBottom: '0.5rem' }}>✓ {t('payment:features.allCommands')}</li>
                <li style={{ marginBottom: '0.5rem' }}>✓ {t('payment:features.uptime')}</li>
                <li style={{ marginBottom: '0.5rem' }}>✓ {t('payment:features.prioritySupport')}</li>
                <li style={{ marginBottom: '0.5rem' }}>✓ <strong>{t('payment:features.savePerYear')}</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Development Testing Button */}
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto 2rem', background: 'rgba(255, 165, 0, 0.1)', border: '2px solid rgba(255, 165, 0, 0.3)' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '1rem', color: '#ffa500' }}>
            🧪 Development Testing
          </h4>
          <p style={{ textAlign: 'center', fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.8 }}>
            Skip PayPal payment for testing purposes
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={simulateActiveSubscription}
              className="button"
              style={{
                flex: 1,
                background: '#ffa500',
                border: '2px solid #ff8c00',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              ⚡ Simulate Subscription
            </button>
            <button 
              onClick={clearAllSubscriptions}
              className="button"
              style={{
                flex: 1,
                background: '#dc2626',
                border: '2px solid #b91c1c',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              🗑️ Clear All Data
            </button>
          </div>
        </div>

        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            {t('payment:completeSubscription')}
          </h3>
          
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <p>{t('payment:selectedPlan')}: <strong>{t(`payment:${selectedPlan}Plan`)}</strong></p>
            <p>{t('payment:price')}: <strong>${SUBSCRIPTION_PLANS[selectedPlan].price}/{selectedPlan === 'yearly' ? t('common:year') : t('common:month')}</strong></p>
            {selectedPlan === 'yearly' && (
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {t('payment:onlyPerMonthBilled')}
              </p>
            )}
          </div>

          <PayPalSubscriptionButton
            selectedPlan={selectedPlan}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />

          <p style={{ textAlign: 'center', fontSize: '0.9rem', opacity: 0.7, marginTop: '1rem' }}>
            {t('common:securePayment')}
          </p>
        </div>
      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'payment'])),
    },
  }
}