import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import Navigation from '../components/Navigation'

interface BotStatus {
  online: boolean
  guilds: number
  users: number
  uptime: string
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation(['dashboard', 'common'])
  const [botStatus, setBotStatus] = useState<BotStatus>({
    online: false,
    guilds: 0,
    users: 0,
    uptime: '0h 0m'
  })

  const [commands, setCommands] = useState<string[]>([])
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)

  useEffect(() => {
    console.log('Session status:', status)
    console.log('Session data:', session)
    
    if (status === 'unauthenticated' && typeof window !== 'undefined') {
      console.log('User not authenticated, redirecting to login')
      router.push('/login')
    }
  }, [status, router, session])

  useEffect(() => {
    const checkSubscription = async () => {
      if (session?.user?.id && typeof window !== 'undefined') {
        // Check localStorage directly on client side
        const stored = localStorage.getItem(`stoffel_subscription_${session.user.id}`)
        
        if (stored) {
          try {
            const subscription = JSON.parse(stored)
            const isActive = subscription.status === 'active' && 
                           new Date(subscription.nextBillingDate) > new Date()
            
            console.log('Found subscription:', subscription, 'Active:', isActive)
            setHasSubscription(isActive)
            
            if (!isActive) {
              router.push('/payment')
              return
            }
          } catch (error) {
            console.error('Error parsing subscription data:', error)
            setHasSubscription(false)
            router.push('/payment')
            return
          }
        } else {
          // Also check for PayPal subscription data (fallback)
          const keys = Object.keys(localStorage)
          let foundSubscription = false
          
          for (const key of keys) {
            if (key.startsWith('subscription_')) {
              try {
                const paypalSub = JSON.parse(localStorage.getItem(key) || '{}')
                if (paypalSub.subscriptionId && paypalSub.status === 'active') {
                  console.log('Found PayPal subscription:', paypalSub)
                  setHasSubscription(true)
                  foundSubscription = true
                  break
                }
              } catch (error) {
                console.error('Error parsing PayPal subscription:', error)
              }
            }
          }
          
          if (!foundSubscription) {
            console.log('No subscription found, redirecting to payment')
            setHasSubscription(false)
            router.push('/payment')
            return
          }
        }
      }
    }

    if (session?.user && status === 'authenticated') {
      checkSubscription()
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchBotData = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
        
        // Fetch bot status
        const statusResponse = await fetch(`${backendUrl}/api/bot/status`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          setBotStatus(statusData)
        }
        
        // Fetch commands
        const commandsResponse = await fetch(`${backendUrl}/api/bot/commands`)
        if (commandsResponse.ok) {
          const commandsData = await commandsResponse.json()
          const formattedCommands = commandsData.commands.map((cmd: any) => 
            `/${cmd.name} - ${cmd.description}`
          )
          setCommands(formattedCommands)
        }
      } catch (error) {
        console.error('Error fetching bot data:', error)
        // Fallback to mock data
        setBotStatus({
          online: false,
          guilds: 0,
          users: 0,
          uptime: 'N/A'
        })
        setCommands([
          '/help - Show help message', 
          '/clear - Clear messages from the channel',
          '/automod - Configure automatic moderation for spam and fake links',
          '/language - Configure bot language for the server',
          '/customize - Customize bot nickname for the server'
        ])
      }
    }

    fetchBotData()
    // Refresh data every 30 seconds
    const interval = setInterval(fetchBotData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (status === 'loading' || hasSubscription === null) {
    return (
      <div className="container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem' }}>
            {status === 'loading' ? t('common:loading') : t('common:checkingSubscription')}
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Navigation currentPage="dashboard" />
      
      <div className="container">
        <header style={{ marginBottom: '3rem', marginTop: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{t('dashboard:title')}</h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
              {t('common:welcome')}, {session.user?.name}! {t('common:tagline')}
            </p>
          </div>
        </header>

      <div className="grid">
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('dashboard:botStatus')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('dashboard:status')}:</span>
              <span style={{ 
                color: botStatus.online ? '#4ade80' : '#f87171',
                fontWeight: 'bold'
              }}>
                {botStatus.online ? t('dashboard:online') : t('dashboard:offline')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('dashboard:servers')}:</span>
              <span>{botStatus.guilds}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('dashboard:users')}:</span>
              <span>{botStatus.users.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('dashboard:uptime')}:</span>
              <span>{botStatus.uptime}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('dashboard:quickActions')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="button">{t('dashboard:restartBot')}</button>
            <button className="button">{t('dashboard:viewLogs')}</button>
            <button className="button">{t('dashboard:updateDocumentation')}</button>
            <button className="button">{t('dashboard:deployChanges')}</button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('dashboard:availableCommands')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {commands.map((cmd, index) => (
              <div key={index} style={{ 
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}>
                {cmd}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('dashboard:recentActivity')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div style={{ opacity: 0.9 }}>
              <span style={{ opacity: 0.7 }}>[14:32]</span> {t('dashboard:activities.commandExecuted')}: /help
            </div>
            <div style={{ opacity: 0.9 }}>
              <span style={{ opacity: 0.7 }}>[14:28]</span> {t('dashboard:activities.userJoined')}
            </div>
            <div style={{ opacity: 0.9 }}>
              <span style={{ opacity: 0.7 }}>[14:15]</span> {t('dashboard:activities.documentationUpdated')}
            </div>
            <div style={{ opacity: 0.9 }}>
              <span style={{ opacity: 0.7 }}>[13:45]</span> {t('dashboard:activities.botRestarted')}
            </div>
          </div>
        </div>
      </div>

      <footer style={{ 
        textAlign: 'center', 
        marginTop: '4rem', 
        padding: '2rem',
        opacity: 0.7
      }}>
        <p>{t('dashboard:footer')}</p>
      </footer>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'dashboard', 'navigation'])),
    },
  }
}