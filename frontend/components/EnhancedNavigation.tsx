import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import LanguageToggle from './LanguageToggle'

interface NavigationProps {
  currentPage?: string
}

interface MenuItem {
  key: string
  label: string
  path: string
  icon: string
  description: string
  category: 'main' | 'management' | 'monitoring'
}

export default function EnhancedNavigation({ currentPage }: NavigationProps) {
  const router = useRouter()
  const { t } = useTranslation(['common', 'navigation'])
  const { data: session } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const menuItems: MenuItem[] = [
    // Main Dashboard
    {
      key: 'dashboard',
      label: t('navigation:dashboard'),
      path: '/',
      icon: '🏠',
      description: 'Server overview and quick controls',
      category: 'main'
    },
    {
      key: 'servers',
      label: t('navigation:servers'),
      path: '/servers',
      icon: '🏢',
      description: 'Manage connected servers',
      category: 'main'
    },

    // Bot Management
    {
      key: 'music',
      label: 'Music Control',
      path: '/admin/music',
      icon: '🎵',
      description: 'Music system configuration',
      category: 'management'
    },
    {
      key: 'moderation',
      label: 'Moderation',
      path: '/admin/moderation',
      icon: '🛡️',
      description: 'AutoMod, warnings & punishments',
      category: 'management'
    },
    {
      key: 'roles',
      label: 'Roles & Users',
      path: '/admin/roles',
      icon: '👥',
      description: 'Role management and permissions',
      category: 'management'
    },
    {
      key: 'channels',
      label: 'Channel Settings',
      path: '/admin/channels',
      icon: '📺',
      description: 'Channel permissions and settings',
      category: 'management'
    },
    {
      key: 'commands',
      label: 'Custom Commands',
      path: '/admin/commands',
      icon: '⚡',
      description: 'Create and manage custom commands',
      category: 'management'
    },

    // Monitoring & Analytics
    {
      key: 'analytics',
      label: 'Analytics',
      path: '/admin/analytics',
      icon: '📊',
      description: 'Server statistics and insights',
      category: 'monitoring'
    },
    {
      key: 'logs',
      label: 'Activity Logs',
      path: '/admin/logs',
      icon: '📋',
      description: 'View bot and moderation logs',
      category: 'monitoring'
    },
    {
      key: 'monitoring',
      label: 'Bot Health',
      path: '/admin/monitoring',
      icon: '💓',
      description: 'Bot performance and diagnostics',
      category: 'monitoring'
    },

    // Legacy items for backward compatibility
    {
      key: 'automod',
      label: t('navigation:automod'),
      path: '/automod',
      icon: '🛡️',
      description: 'Legacy automod settings',
      category: 'management'
    },
    {
      key: 'registration',
      label: t('navigation:registration'),
      path: '/registration',
      icon: '📝',
      description: 'Server registration system',
      category: 'management'
    },
    {
      key: 'settings',
      label: t('navigation:settings'),
      path: '/settings',
      icon: '⚙️',
      description: 'Advanced bot configuration',
      category: 'management'
    }
  ]

  const getCategoryItems = (category: string) => 
    menuItems.filter(item => item.category === category)

  const CategorySection = ({ category, title, items }: { 
    category: string, 
    title: string, 
    items: MenuItem[] 
  }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        fontSize: '0.8rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: '0.5rem',
        paddingLeft: '1rem'
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              router.push(item.path)
              setIsMenuOpen(false)
            }}
            style={{
              padding: '0.75rem 1rem',
              background: currentPage === item.key || router.pathname === item.path 
                ? 'rgba(59, 130, 246, 0.15)' 
                : 'transparent',
              border: 'none',
              borderLeft: currentPage === item.key || router.pathname === item.path
                ? '3px solid #3B82F6'
                : '3px solid transparent',
              borderRadius: '0 8px 8px 0',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.2s ease',
              fontSize: '0.9rem',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              if (currentPage !== item.key && router.pathname !== item.path) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== item.key && router.pathname !== item.path) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: currentPage === item.key || router.pathname === item.path ? 'bold' : 'normal',
                marginBottom: '0.1rem'
              }}>
                {item.label}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                opacity: 0.7,
                display: 'none'
              }}>
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 2000,
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          color: 'white',
          padding: '0.5rem',
          cursor: 'pointer',
          fontSize: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}
        className="mobile-menu-button"
      >
        {isMenuOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar Navigation */}
      <nav style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1500,
        backdropFilter: 'blur(10px)',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '1.5rem 1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            fontSize: '1.3rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.5rem'
          }}>
            Stoffel Bot
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.6)'
          }}>
            Admin Dashboard
          </div>
        </div>

        {/* User Info */}
        {session?.user && (
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px'
            }}>
              {session.user.image && (
                <img 
                  src={session.user.image} 
                  alt="Avatar" 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }} 
                />
              )}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ 
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {session.user.name}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  Server Administrator
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <div style={{
          flex: 1,
          padding: '1rem 0',
          overflowY: 'auto'
        }}>
          <CategorySection 
            category="main"
            title="Dashboard"
            items={getCategoryItems('main')}
          />
          <CategorySection 
            category="management"
            title="Bot Management"
            items={getCategoryItems('management')}
          />
          <CategorySection 
            category="monitoring"
            title="Monitoring"
            items={getCategoryItems('monitoring')}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <LanguageToggle />
          
          {session?.user && (
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
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: 'center'
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
              <span>🚪</span>
              {t('common:signOut')}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1400,
            display: 'none'
          }}
          className="mobile-overlay"
        />
      )}

      <style jsx global>{`
        @media (max-width: 48rem) {
          .mobile-menu-button {
            display: block !important;
          }
          .mobile-overlay {
            display: block !important;
          }
          nav {
            position: fixed !important;
            left: ${isMenuOpen ? '0' : '-100vw'} !important;
            top: 0 !important;
            width: 80vw !important;
            max-width: 20rem !important;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3) !important;
            transition: left 0.3s ease !important;
          }
        }
        
        /* Custom scrollbar for navigation */
        nav::-webkit-scrollbar {
          width: 4px;
        }
        nav::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }
        nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }
        nav::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </>
  )
}