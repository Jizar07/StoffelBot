import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import AdminLayout from '../../components/AdminLayout'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

interface SystemHealth {
  bot: {
    status: 'online' | 'offline' | 'connecting'
    uptime: {
      seconds: number
      formatted: string
    }
    ping: number
    guilds: number
    users: number
    commands: {
      total: number
      successful: number
      failed: number
      successRate: number
    }
    lastRestart: string
  }
  system: {
    memory: {
      used: number
      total: number
      external: number
      percentage: number
    }
    cpu: number
    platform: string
    nodeVersion: string
    diskUsage: {
      used: number
      total: number
      percentage: number
    }
  }
  database: {
    status: 'connected' | 'disconnected' | 'error'
    responseTime: number
    activeConnections: number
    totalQueries: number
    errorRate: number
  }
  api: {
    responseTime: number
    requestsPerMinute: number
    errorRate: number
    endpoints: Array<{
      path: string
      method: string
      responseTime: number
      successRate: number
      requests: number
    }>
  }
}

interface Alert {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  resolved?: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export default function BotMonitoring() {
  const { t } = useTranslation(['common', 'admin'])
  const router = useRouter()
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<string>('overview')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds

  useEffect(() => {
    fetchHealthData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const fetchHealthData = async () => {
    try {
      // Mock data - in production this would fetch from /api/admin/health
      const mockHealth: SystemHealth = {
        bot: {
          status: Math.random() > 0.1 ? 'online' : 'offline',
          uptime: {
            seconds: Math.floor(Math.random() * 604800) + 3600, // 1 hour to 7 days
            formatted: '2d 14h 32m'
          },
          ping: Math.floor(Math.random() * 100) + 20,
          guilds: Math.floor(Math.random() * 50) + 10,
          users: Math.floor(Math.random() * 10000) + 1000,
          commands: {
            total: Math.floor(Math.random() * 1000) + 500,
            successful: Math.floor(Math.random() * 950) + 450,
            failed: Math.floor(Math.random() * 50),
            successRate: 0.95
          },
          lastRestart: new Date(Date.now() - 86400000).toISOString()
        },
        system: {
          memory: {
            used: Math.floor(Math.random() * 512) + 128,
            total: 1024,
            external: Math.floor(Math.random() * 64) + 16,
            percentage: Math.floor(Math.random() * 80) + 20
          },
          cpu: Math.floor(Math.random() * 60) + 10,
          platform: 'linux',
          nodeVersion: 'v18.17.0',
          diskUsage: {
            used: Math.floor(Math.random() * 5000) + 1000,
            total: 10240,
            percentage: Math.floor(Math.random() * 50) + 20
          }
        },
        database: {
          status: Math.random() > 0.05 ? 'connected' : 'error',
          responseTime: Math.floor(Math.random() * 20) + 1,
          activeConnections: Math.floor(Math.random() * 10) + 5,
          totalQueries: Math.floor(Math.random() * 10000) + 5000,
          errorRate: Math.random() * 0.02
        },
        api: {
          responseTime: Math.floor(Math.random() * 200) + 50,
          requestsPerMinute: Math.floor(Math.random() * 100) + 50,
          errorRate: Math.random() * 0.05,
          endpoints: [
            { path: '/api/admin/music', method: 'GET', responseTime: 45, successRate: 0.99, requests: 123 },
            { path: '/api/admin/moderation', method: 'POST', responseTime: 78, successRate: 0.97, requests: 89 },
            { path: '/api/admin/analytics', method: 'GET', responseTime: 156, successRate: 0.95, requests: 234 },
            { path: '/api/bot/status', method: 'GET', responseTime: 23, successRate: 1.0, requests: 456 }
          ]
        }
      }

      // Calculate success rate
      mockHealth.bot.commands.successRate = mockHealth.bot.commands.successful / mockHealth.bot.commands.total

      setHealth(mockHealth)

      // Generate mock alerts based on health data
      const newAlerts: Alert[] = []
      
      if (mockHealth.system.memory.percentage > 85) {
        newAlerts.push({
          id: `alert_memory_${Date.now()}`,
          type: 'warning',
          title: 'High Memory Usage',
          message: `Memory usage is at ${mockHealth.system.memory.percentage}% (${mockHealth.system.memory.used}MB/${mockHealth.system.memory.total}MB)`,
          timestamp: new Date().toISOString(),
          severity: 'medium'
        })
      }

      if (mockHealth.bot.ping > 150) {
        newAlerts.push({
          id: `alert_ping_${Date.now()}`,
          type: 'warning',
          title: 'High Latency',
          message: `Discord API latency is ${mockHealth.bot.ping}ms`,
          timestamp: new Date().toISOString(),
          severity: 'medium'
        })
      }

      if (mockHealth.bot.commands.successRate < 0.90) {
        newAlerts.push({
          id: `alert_commands_${Date.now()}`,
          type: 'error',
          title: 'Command Failure Rate High',
          message: `Command success rate has dropped to ${(mockHealth.bot.commands.successRate * 100).toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          severity: 'high'
        })
      }

      if (mockHealth.database.status === 'error') {
        newAlerts.push({
          id: `alert_db_${Date.now()}`,
          type: 'error',
          title: 'Database Connection Error',
          message: 'Unable to connect to the database',
          timestamp: new Date().toISOString(),
          severity: 'critical'
        })
      }

      // Only add new alerts if they don't exist
      setAlerts(prevAlerts => {
        const existingTypes = new Set(prevAlerts.map(a => a.title))
        const filteredNewAlerts = newAlerts.filter(alert => !existingTypes.has(alert.title))
        return [...prevAlerts, ...filteredNewAlerts].slice(-10) // Keep last 10 alerts
      })

    } catch (error) {
      console.error('Failed to fetch health data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected': return '#10B981'
      case 'offline':
      case 'disconnected':
      case 'error': return '#EF4444'
      case 'connecting': return '#F59E0B'
      default: return '#6B7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected': return '🟢'
      case 'offline':
      case 'disconnected':
      case 'error': return '🔴'
      case 'connecting': return '🟡'
      default: return '⚪'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📄'
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626'
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${mins}m`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB'
    const mb = bytes
    if (mb < 1024) return `${mb.toFixed(0)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(1)} GB`
  }

  const getHealthScore = () => {
    if (!health) return 0
    
    let score = 100
    
    // Bot status
    if (health.bot.status !== 'online') score -= 30
    if (health.bot.ping > 150) score -= 10
    if (health.bot.commands.successRate < 0.95) score -= 15
    
    // System health
    if (health.system.memory.percentage > 85) score -= 15
    if (health.system.cpu > 80) score -= 10
    
    // Database health
    if (health.database.status !== 'connected') score -= 20
    if (health.database.responseTime > 50) score -= 5
    
    return Math.max(0, score)
  }

  if (loading || !health) {
    return (
      <AdminLayout 
        currentPage="monitoring"
        title="Bot Health Monitoring"
        description="Monitor system health, performance, and alerts"
      >
        <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', padding: '2rem' }}>
          Loading health data...
        </div>
      </AdminLayout>
    )
  }

  const healthScore = getHealthScore()

  return (
    <AdminLayout 
      currentPage="monitoring"
      title="Bot Health Monitoring"
      description="Monitor system health, performance, and alerts"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Health Score Overview */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: healthScore >= 90 ? '#10B981' : healthScore >= 70 ? '#F59E0B' : '#EF4444',
            marginBottom: '0.5rem'
          }}>
            {healthScore}%
          </div>
          <div style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            Overall Health Score
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
            {healthScore >= 90 ? '✅ All systems operational' : 
             healthScore >= 70 ? '⚠️ Some issues detected' : 
             '🚨 Critical issues require attention'}
          </div>
        </div>

        {/* Auto-refresh Controls */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1rem',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            )}
          </div>
          
          <button
            onClick={fetchHealthData}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Now
          </button>
        </div>

        {/* Key Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {/* Bot Status */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{getStatusIcon(health.bot.status)}</span>
              <h3 style={{ color: 'white', margin: 0 }}>Bot Status</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Status:</span>
                <span style={{ color: getStatusColor(health.bot.status), textTransform: 'capitalize' }}>
                  {health.bot.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Uptime:</span>
                <span style={{ color: 'white' }}>{health.bot.uptime.formatted}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Ping:</span>
                <span style={{ 
                  color: health.bot.ping < 100 ? '#10B981' : health.bot.ping < 200 ? '#F59E0B' : '#EF4444'
                }}>
                  {health.bot.ping}ms
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Servers:</span>
                <span style={{ color: 'white' }}>{health.bot.guilds}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Users:</span>
                <span style={{ color: 'white' }}>{health.bot.users.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* System Resources */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>💻</span>
              <h3 style={{ color: 'white', margin: 0 }}>System Resources</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Memory Usage */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Memory:</span>
                  <span style={{ color: 'white', fontSize: '0.9rem' }}>
                    {formatBytes(health.system.memory.used)} / {formatBytes(health.system.memory.total)}
                  </span>
                </div>
                <div style={{
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${health.system.memory.percentage}%`,
                    height: '100%',
                    background: health.system.memory.percentage > 85 ? '#EF4444' : 
                               health.system.memory.percentage > 70 ? '#F59E0B' : '#10B981',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* CPU Usage */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>CPU:</span>
                  <span style={{ color: 'white', fontSize: '0.9rem' }}>{health.system.cpu}%</span>
                </div>
                <div style={{
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${health.system.cpu}%`,
                    height: '100%',
                    background: health.system.cpu > 80 ? '#EF4444' : 
                               health.system.cpu > 60 ? '#F59E0B' : '#10B981',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Platform:</span>
                <span style={{ color: 'white', textTransform: 'capitalize' }}>{health.system.platform}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Node.js:</span>
                <span style={{ color: 'white' }}>{health.system.nodeVersion}</span>
              </div>
            </div>
          </div>

          {/* Database Health */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{getStatusIcon(health.database.status)}</span>
              <h3 style={{ color: 'white', margin: 0 }}>Database</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Status:</span>
                <span style={{ 
                  color: getStatusColor(health.database.status),
                  textTransform: 'capitalize'
                }}>
                  {health.database.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Response Time:</span>
                <span style={{ 
                  color: health.database.responseTime < 10 ? '#10B981' : 
                         health.database.responseTime < 50 ? '#F59E0B' : '#EF4444'
                }}>
                  {health.database.responseTime}ms
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Connections:</span>
                <span style={{ color: 'white' }}>{health.database.activeConnections}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Queries:</span>
                <span style={{ color: 'white' }}>{health.database.totalQueries.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Error Rate:</span>
                <span style={{ 
                  color: health.database.errorRate < 0.01 ? '#10B981' : 
                         health.database.errorRate < 0.05 ? '#F59E0B' : '#EF4444'
                }}>
                  {(health.database.errorRate * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Commands Statistics */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
              <h3 style={{ color: 'white', margin: 0 }}>Commands</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total:</span>
                <span style={{ color: 'white' }}>{health.bot.commands.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Successful:</span>
                <span style={{ color: '#10B981' }}>{health.bot.commands.successful}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Failed:</span>
                <span style={{ color: '#EF4444' }}>{health.bot.commands.failed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Success Rate:</span>
                <span style={{ 
                  color: health.bot.commands.successRate > 0.95 ? '#10B981' : 
                         health.bot.commands.successRate > 0.90 ? '#F59E0B' : '#EF4444'
                }}>
                  {(health.bot.commands.successRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Active Alerts ({alerts.length})</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getAlertColor(alert.severity)}`
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{getAlertIcon(alert.type)}</span>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '0.25rem'
                    }}>
                      <span style={{ color: 'white', fontWeight: 'bold' }}>{alert.title}</span>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        background: `${getAlertColor(alert.severity)}20`,
                        color: getAlertColor(alert.severity),
                        textTransform: 'capitalize'
                      }}>
                        {alert.severity}
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                      {alert.message}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '0.5rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Endpoints Performance */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: 'white', marginBottom: '1rem' }}>API Performance</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {health.api.endpoints.map((endpoint, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '1rem'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{endpoint.method}</span>
                  <span style={{ 
                    color: endpoint.responseTime < 100 ? '#10B981' : 
                           endpoint.responseTime < 200 ? '#F59E0B' : '#EF4444',
                    fontSize: '0.85rem'
                  }}>
                    {endpoint.responseTime}ms
                  </span>
                </div>
                
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  {endpoint.path}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Success Rate:</span>
                  <span style={{ 
                    color: endpoint.successRate > 0.95 ? '#10B981' : '#F59E0B'
                  }}>
                    {(endpoint.successRate * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Requests:</span>
                  <span style={{ color: 'white' }}>{endpoint.requests}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export const getStaticProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'admin', 'navigation']))
  }
})