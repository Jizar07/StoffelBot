import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import LanguageToggle from '../../components/LanguageToggle'

export default function PaymentCancelPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useTranslation(['cancel', 'common'])

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
            background: '#f87171', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            {t('cancel:title')}
          </h1>
          
          <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem' }}>
            {t('cancel:description')}
          </p>
        </div>

        <div style={{ 
          background: 'rgba(248, 113, 113, 0.1)', 
          border: '1px solid rgba(248, 113, 113, 0.3)',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <p style={{ marginBottom: '1rem' }}>
            {t('cancel:explanation')}
          </p>
          <p>
            {t('cancel:supportNote')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => router.push('/payment')}
            className="button"
            style={{ 
              background: '#4ade80',
              border: 'none'
            }}
          >
            {t('common:tryAgain')}
          </button>
          
          <button 
            onClick={() => router.push('/')}
            className="button"
            style={{ 
              background: 'transparent',
              border: '2px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            {t('common:backToDashboard')}
          </button>
        </div>
      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'cancel'])),
    },
  }
}