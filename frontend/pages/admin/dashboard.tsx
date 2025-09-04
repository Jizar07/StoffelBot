import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import AdminLayout from '../../components/AdminLayout'
import ServerSelector from '../../components/ServerSelector'
import axios from 'axios'

interface BotStatus {
  online: boolean
  guilds: number
  users: number
  uptime: string
  ping?: number
  version?: string
  memoryUsage?: number
  cpuUsage?: number
}

interface ServerInfo {
  id: string
  name: string
  icon?: string
  memberCount?: number
  isOnline?: boolean
  features?: string[]
  permissions?: string[]
  botJoinedAt?: string
}

interface QuickStats {
  commandsToday: number
  moderationActions: number
  musicSessionsActive: number
  warningsIssued: number
}

export default function EnhancedDashboard() {
  const { data: session } = useSession()
  const { t } = useTranslation(['common', 'admin', 'dashboard'])
  
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null)
  const [botStatus, setBotStatus] = useState<BotStatus>({
    online: false,
    guilds: 0,
    users: 0,
    uptime: '0s'
  })
  const [quickStats, setQuickStats] = useState<QuickStats>({
    commandsToday: 0,
    moderationActions: 0,
    musicSessionsActive: 0,
    warningsIssued: 0
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchBotStatus()
      fetchQuickStats()
      fetchRecentActivity()
      
      // Set up polling for real-time updates
      const interval = setInterval(() => {
        fetchBotStatus()
        fetchQuickStats()
        fetchRecentActivity()
      }, 30000) // Update every 30 seconds

      return () => clearInterval(interval)
    }
  }, [session])

  useEffect(() => {
    if (selectedServerId && selectedServer) {
      fetchServerSpecificData()
    }
  }, [selectedServerId, selectedServer])

  const fetchBotStatus = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/bot/status`)
      setBotStatus(response.data)
    } catch (error) {
      console.error('Error fetching bot status:', error)
    }
  }

  const fetchQuickStats = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/bot/stats`)
      if (response.data) {
        setQuickStats(response.data)
      }
    } catch (error) {
      console.error('Error fetching quick stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/bot/recent-activity`)
      if (response.data?.activities) {
        setRecentActivity(response.data.activities.slice(0, 5))
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const fetchServerSpecificData = async () => {
    if (!selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/server/${selectedServerId}/stats`)
      // Handle server-specific stats here
    } catch (error) {
      console.error('Error fetching server data:', error)
    }
  }

  const handleServerSelect = (serverId: string, server: ServerInfo) => {
    setSelectedServerId(serverId)
    setSelectedServer(server)
  }

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    trend, 
    trendValue, 
    color = '#3B82F6',
    onClick 
  }: {
    title: string
    value: string | number
    icon: string
    trend?: 'up' | 'down' | 'stable'
    trendValue?: string
    color?: string
    onClick?: () => void
  }) => (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}20 0%, ${color}40 100%)`,
        transform: 'translate(20px, -20px)'
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '0.5rem'
          }}>
            {value}
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            {title}
          </div>
          {trend && trendValue && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginTop: '0.5rem',
              fontSize: '0.8rem',
              color: trend === 'up' ? '#22C55E' : trend === 'down' ? '#EF4444' : 'rgba(255, 255, 255, 0.6)'
            }}>
              <span>
                {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
              </span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div style={{
          fontSize: '2rem',
          opacity: 0.6,
          zIndex: 1
        }}>
          {icon}
        </div>
      </div>
    </div>
  )

  const ActivityItem = ({ activity }: { activity: any }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: activity.type === 'moderation' ? '#EF4444' : 
                   activity.type === 'music' ? '#8B5CF6' :
                   activity.type === 'command' ? '#3B82F6' : '#22C55E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem'
      }}>
        {activity.type === 'moderation' ? '🛡️' : 
         activity.type === 'music' ? '🎵' :
         activity.type === 'command' ? '⚡' : '📋'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ 
          color: 'white', 
          fontSize: '0.9rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          {activity.description || 'System activity'}
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          fontSize: '0.8rem'
        }}>
          {activity.server || 'Global'} • {activity.time || new Date().toLocaleTimeString()}
        </div>
      </div>
      {activity.severity && (
        <div style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          background: activity.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' :
                     activity.severity === 'medium' ? 'rgba(245, 158, 11, 0.2)' :
                     'rgba(34, 197, 94, 0.2)',
          color: activity.severity === 'high' ? '#FCA5A5' :
                activity.severity === 'medium' ? '#FCD34D' :
                '#86EFAC'
        }}>
          {activity.severity.toUpperCase()}
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <AdminLayout 
        currentPage="dashboard"
        title="Dashboard"
        description="Overview of your bot's performance and server management"
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1.1rem' }}>
              Loading dashboard...
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout 
      currentPage="dashboard"
      title="Bot Dashboard"
      description="Overview of your bot's performance and server management"
      showServerSelector
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Server Selector */}
        <div>
          <h2 style={{ 
            color: 'white', 
            marginBottom: '1rem', 
            fontSize: '1.3rem',
            fontWeight: 'bold'
          }}>
            🏢 Select Server
          </h2>
          <div style={{ maxWidth: '500px' }}>
            <ServerSelector
              selectedServerId={selectedServerId}
              onServerSelect={handleServerSelect}
              showDetails={true}
            />
          </div>
        </div>

        {/* Bot Status Overview */}
        <div>
          <h2 style={{ 
            color: 'white', 
            marginBottom: '1rem', 
            fontSize: '1.3rem',
            fontWeight: 'bold'
          }}>
            🤖 Bot Status
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            <StatCard
              title="Bot Status"
              value={botStatus.online ? "Online" : "Offline"}
              icon="🟢"
              color={botStatus.online ? "#22C55E" : "#EF4444"}
            />
            <StatCard
              title="Total Servers"
              value={botStatus.guilds.toLocaleString()}
              icon="🏢"
              trend="up"
              trendValue="+2 this week"
            />
            <StatCard
              title="Total Users"
              value={botStatus.users.toLocaleString()}
              icon="👥"
              trend="up"
              trendValue="+48 this week"
            />
            <StatCard
              title="Uptime"
              value={botStatus.uptime}
              icon="⏰"
              color="#8B5CF6"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 style={{ 
            color: 'white', 
            marginBottom: '1rem', 
            fontSize: '1.3rem',
            fontWeight: 'bold'
          }}>
            ⚡ Quick Actions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {[
              { label: 'Music Controls', icon: '🎵', path: '/admin/music', color: '#8B5CF6' },
              { label: 'Moderation', icon: '🛡️', path: '/admin/moderation', color: '#EF4444' },
              { label: 'Server Analytics', icon: '📊', path: '/admin/analytics', color: '#3B82F6' },
              { label: 'Bot Logs', icon: '📋', path: '/admin/logs', color: '#22C55E' }
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => window.location.href = action.path}
                style={{
                  padding: '1rem',
                  background: `linear-gradient(135deg, ${action.color}20 0%, ${action.color}40 100%)`,
                  border: `1px solid ${action.color}60`,
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = `0 8px 20px ${action.color}40`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Grid */}
        {selectedServerId && (
          <div>
            <h2 style={{ 
              color: 'white', 
              marginBottom: '1rem', 
              fontSize: '1.3rem',
              fontWeight: 'bold'
            }}>
              📊 Server Statistics
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              <StatCard
                title="Commands Today"
                value={quickStats.commandsToday}
                icon="⚡"
                trend="up"
                trendValue="+12%"
                color="#3B82F6"
              />
              <StatCard
                title="Moderation Actions"
                value={quickStats.moderationActions}
                icon="🛡️"
                trend="down"
                trendValue="-5%"
                color="#EF4444"
              />
              <StatCard
                title="Active Music Sessions"
                value={quickStats.musicSessionsActive}
                icon="🎵"
                trend="stable"
                trendValue="No change"
                color="#8B5CF6"
              />
              <StatCard
                title="Warnings Issued"
                value={quickStats.warningsIssued}
                icon="⚠️"
                trend="up"
                trendValue="+3"
                color="#F59E0B"
              />
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <h2 style={{ 
            color: 'white', 
            marginBottom: '1rem', 
            fontSize: '1.3rem',
            fontWeight: 'bold'
          }}>
            📋 Recent Activity
          </h2>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden'
          }}>
            {recentActivity.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {recentActivity.map((activity, index) => (
                  <ActivityItem key={index} activity={activity} />
                ))}
              </div>
            ) : (
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  No recent activity
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  Activity will appear here as your bot is used
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'dashboard', 'navigation'])),
    },
  }
}