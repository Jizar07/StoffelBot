import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import LanguageToggle from '../../components/LanguageToggle'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useTranslation(['success', 'common'])

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  useEffect(() => {
    if (!session && typeof window !== 'undefined') {
      router.push('/login')
    }
  }, [session, router])

  if (!session) {
    return null
  }

  return (
    <div className="container" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '2rem', 
        right: '2rem' 
      }}>
        <LanguageToggle />
      </div>

      <div className="card" style={{ 
        maxWidth: '500px', 
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: '#4ade80', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#4ade80' }}>
            {t('success:title')}
          </h1>
          
          <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem' }}>
            {t('success:description')}
          </p>
        </div>

        <div style={{ 
          background: 'rgba(74, 222, 128, 0.1)', 
          border: '1px solid rgba(74, 222, 128, 0.3)',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginBottom: '1rem' }}>{t('success:whatsNext')}</h3>
          <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>✓ {t('success:steps.subscriptionActive')}</li>
            <li style={{ marginBottom: '0.5rem' }}>✓ {t('success:steps.premiumUnlocked')}</li>
            <li style={{ marginBottom: '0.5rem' }}>✓ {t('success:steps.inviteBot')}</li>
            <li style={{ marginBottom: '0.5rem' }}>✓ {t('success:steps.configureSettings')}</li>
          </ul>
        </div>

        <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
          {t('common:redirecting')}
        </p>

        <button 
          onClick={() => router.push('/')}
          className="button"
          style={{ width: '100%' }}
        >
          {t('common:goToDashboardNow')}
        </button>
      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'success'])),
    },
  }
}