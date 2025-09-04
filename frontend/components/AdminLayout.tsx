import { ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import EnhancedNavigation from './EnhancedNavigation'

interface AdminLayoutProps {
  children: ReactNode
  currentPage?: string
  title?: string
  description?: string
  showServerSelector?: boolean
}

interface BreadcrumbItem {
  label: string
  path?: string
  icon?: string
}

export default function AdminLayout({ 
  children, 
  currentPage, 
  title, 
  description,
  showServerSelector = false
}: AdminLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      setIsLoading(false)
    }
  }, [status, router])

  useEffect(() => {
    // Generate breadcrumbs based on current path
    const pathSegments = router.pathname.split('/').filter(Boolean)
    const crumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', path: '/', icon: '🏠' }
    ]

    if (pathSegments.length > 0) {
      let currentPath = ''
      pathSegments.forEach((segment, index) => {
        currentPath += '/' + segment
        if (segment === 'admin') {
          crumbs.push({ label: 'Admin', path: currentPath, icon: '⚙️' })
        } else {
          const formattedLabel = segment.charAt(0).toUpperCase() + segment.slice(1)
          crumbs.push({ 
            label: formattedLabel, 
            path: index === pathSegments.length - 1 ? undefined : currentPath,
            icon: getSegmentIcon(segment)
          })
        }
      })
    }

    setBreadcrumbs(crumbs)
  }, [router.pathname])

  const getSegmentIcon = (segment: string): string => {
    const iconMap: { [key: string]: string } = {
      'music': '🎵',
      'moderation': '🛡️',
      'roles': '👥',
      'channels': '📺',
      'commands': '⚡',
      'analytics': '📊',
      'logs': '📋',
      'monitoring': '💓',
      'automod': '🛡️',
      'registration': '📝',
      'settings': '⚙️'
    }
    return iconMap[segment] || '📄'
  }

  if (status === 'loading' || isLoading) {
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
          <p style={{ fontSize: '1.2rem', color: 'white', margin: 0 }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="admin-layout-grid" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'grid',
      gridTemplateColumns: 'min(20vw, 20rem) 1fr',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <EnhancedNavigation currentPage={currentPage} />
      
      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflow: 'hidden'
      }} className="main-content">
        
        {/* Top Bar */}
        <header style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {index > 0 && (
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    /
                  </span>
                )}
                {crumb.path ? (
                  <button
                    onClick={() => router.push(crumb.path!)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.8)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.9rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none'
                    }}
                  >
                    {crumb.icon && <span>{crumb.icon}</span>}
                    <span>{crumb.label}</span>
                  </button>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}>
                    {crumb.icon && <span>{crumb.icon}</span>}
                    <span>{crumb.label}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Server Selector (if enabled) */}
          {showServerSelector && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                Server:
              </span>
              <select style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'white',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.9rem'
              }}>
                <option>Select Server...</option>
              </select>
            </div>
          )}
        </header>

        {/* Page Header */}
        {(title || description) && (
          <div style={{
            padding: '2rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {title && (
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: 'white',
                margin: '0 0 0.5rem 0',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
              }}>
                {title}
              </h1>
            )}
            {description && (
              <p style={{
                fontSize: '1.1rem',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
              }}>
                {description}
              </p>
            )}
          </div>
        )}

        {/* Main Content */}
        <main style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto'
        }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{
          padding: '1rem 2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '0.85rem'
        }}>
          <div>
            Stoffel Bot Admin Dashboard v0.05 | 
            <span style={{ marginLeft: '0.5rem' }}>
              Made with ❤️ for Discord communities
            </span>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile Responsiveness */
        @media (max-width: 48rem) {
          .admin-layout-grid {
            grid-template-columns: 1fr !important;
          }
          
          .main-content {
            grid-column: 1;
          }
          
          /* Mobile-specific grid layouts */
          .admin-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          
          /* Mobile-friendly cards */
          .admin-card {
            margin: 0.5rem !important;
            padding: 1rem !important;
          }
          
          /* Mobile navigation adjustments */
          .mobile-nav-adjustment {
            padding: 0.5rem !important;
            font-size: 0.85rem !important;
          }
          
          /* Mobile form elements */
          .mobile-form-element {
            width: 100% !important;
            margin-bottom: 0.75rem !important;
          }
          
          /* Mobile button adjustments */
          .mobile-button {
            padding: 0.75rem 1rem !important;
            font-size: 0.9rem !important;
            width: 100% !important;
          }
          
          /* Mobile tab navigation */
          .tab-navigation {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding-bottom: 0.5rem !important;
          }
          
          /* Mobile server selector */
          .server-selector-mobile {
            width: 100% !important;
          }
          
          /* Hide some elements on mobile */
          .desktop-only {
            display: none !important;
          }
        }
        
        @media (max-width: 480px) {
          /* Extra small mobile devices */
          .admin-card {
            padding: 0.75rem !important;
            margin: 0.25rem !important;
          }
          
          .mobile-text-small {
            font-size: 0.8rem !important;
          }
          
          /* Compact mode for very small screens */
          .mobile-compact {
            padding: 0.5rem !important;
            margin: 0.25rem 0 !important;
          }
        }
        
        @media (min-width: 769px) {
          /* Desktop-only styles */
          .mobile-only {
            display: none !important;
          }
        }
        
        @media (min-width: 48.1rem) and (max-width: 64rem) {
          /* Tablet adjustments */
          .admin-layout-grid {
            grid-template-columns: min(18vw, 18rem) 1fr;
          }
          
          .tablet-adjust {
            grid-template-columns: repeat(auto-fit, minmax(17.5rem, 1fr)) !important;
          }
        }

        /* Custom scrollbar for main content */
        main::-webkit-scrollbar {
          width: 6px;
        }
        main::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }
        main::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        main::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        /* Touch-friendly interactions */
        @media (hover: none) {
          button:hover {
            transform: none !important;
            box-shadow: none !important;
          }
          
          button:active {
            transform: scale(0.98) !important;
            opacity: 0.8 !important;
          }
        }
        
        /* Improved accessibility for mobile */
        @media (max-width: 768px) {
          button, input, select {
            min-height: 44px !important;
            min-width: 44px !important;
          }
          
          /* Larger tap targets */
          .tap-target {
            padding: 0.75rem !important;
          }
        }
        
        /* Loading animations optimized for mobile */
        @media (prefers-reduced-motion: reduce) {
          *, ::before, ::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}