import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { useSession, signOut } from 'next-auth/react'
import LanguageToggle from './LanguageToggle'

interface NavigationProps {
  currentPage?: string
}

export default function Navigation({ currentPage }: NavigationProps) {
  const router = useRouter()
  const { t } = useTranslation(['common', 'navigation'])
  const { data: session } = useSession()

  const menuItems = [
    {
      key: 'dashboard',
      label: t('navigation:dashboard'),
      path: '/',
      icon: '🏠'
    },
    {
      key: 'servers',
      label: t('navigation:servers'),
      path: '/servers',
      icon: '🏢'
    },
    {
      key: 'automod',
      label: t('navigation:automod'),
      path: '/automod',
      icon: '🛡️'
    },
    {
      key: 'registration',
      label: t('navigation:registration'),
      path: '/registration',
      icon: '📝'
    },
    {
      key: 'settings',
      label: t('navigation:settings'),
      path: '/settings',
      icon: '⚙️'
    }
  ]

  return (
    <nav style={{
      background: 'rgba(0, 0, 0, 0.3)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      {/* Logo/Brand */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        cursor: 'pointer'
      }} onClick={() => router.push('/')}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Stoffel Bot
        </div>
      </div>

      {/* Navigation Menu */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            style={{
              padding: '0.75rem 1.5rem',
              background: currentPage === item.key || router.pathname === item.path 
                ? 'rgba(59, 130, 246, 0.2)' 
                : 'transparent',
              border: currentPage === item.key || router.pathname === item.path
                ? '1px solid rgba(59, 130, 246, 0.4)'
                : '1px solid transparent',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              fontSize: '0.95rem',
              fontWeight: currentPage === item.key || router.pathname === item.path ? 'bold' : 'normal'
            }}
            onMouseEnter={(e) => {
              if (currentPage !== item.key && router.pathname !== item.path) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== item.key && router.pathname !== item.path) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
              }
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* User Menu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <LanguageToggle />
        
        {session?.user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px'
            }}>
              {session.user.image && (
                <img 
                  src={session.user.image} 
                  alt="Avatar" 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }} 
                />
              )}
              <span style={{ fontSize: '0.9rem' }}>
                {session.user.name}
              </span>
            </div>
            
            <button 
              onClick={() => signOut()}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(220, 38, 38, 0.2)',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.3)'
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.6)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)'
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.4)'
              }}
            >
              {t('common:signOut')}
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}