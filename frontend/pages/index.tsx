import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation(['dashboard', 'common'])

  useEffect(() => {
    // Redirect to enhanced dashboard
    if (status === 'authenticated' && session) {
      router.push('/admin/dashboard')
    } else if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, session, router])

  // Loading state while redirecting
  if (status === 'loading') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '2rem',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ 
            fontSize: '2rem', 
            marginBottom: '1rem',
            animation: 'spin 2s linear infinite'
          }}>
            ⚙️
          </div>
          <p style={{ fontSize: '1.2rem', color: 'white', margin: 0 }}>
            {t('common:loading')}
          </p>
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return null
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'dashboard', 'navigation'])),
    },
  }
}