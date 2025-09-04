import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import AdminLayout from '../../components/AdminLayout'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

interface LogEntry {
  id: string
  timestamp: string
  type: 'moderation' | 'music' | 'command' | 'error' | 'system' | 'user' | 'security'
  action: string
  user?: {
    id: string
    username: string
    avatar?: string
    discriminator?: string
  }
  target?: {
    id: string
    name: string
    type: 'user' | 'channel' | 'role' | 'message'
  }
  details: string
  metadata?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  channel?: {
    id: string
    name: string
  }
}

export default function ActivityLogs() {
  const { t } = useTranslation(['common', 'admin'])
  const router = useRouter()
  const [selectedServer, setSelectedServer] = useState<string>('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    type: 'all',
    severity: 'all',
    dateRange: '24h',
    search: ''
  })
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (selectedServer) {
      fetchLogs()
    }
  }, [selectedServer, filters])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      // Mock data for now - in production this would fetch from the backend
      const mockLogs: LogEntry[] = [
        {
          id: 'log_1',
          timestamp: new Date().toISOString(),
          type: 'moderation',
          action: 'User Warned',
          user: {
            id: '123456789',
            username: 'ModeratorUser',
            avatar: '/api/placeholder/32/32',
            discriminator: '0001'
          },
          target: {
            id: '987654321',
            name: 'ViolatingUser',
            type: 'user'
          },
          details: 'User warned for spam in #general channel',
          severity: 'medium',
          channel: {
            id: 'ch1',
            name: 'general'
          },
          metadata: {
            reason: 'Spam messages',
            warningCount: 2
          }
        },
        {
          id: 'log_2',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          type: 'music',
          action: 'Song Played',
          user: {
            id: '456789123',
            username: 'MusicLover',
            avatar: '/api/placeholder/32/32',
            discriminator: '0002'
          },
          details: 'Started playing: "Bohemian Rhapsody" by Queen',
          severity: 'low',
          channel: {
            id: 'vc1',
            name: 'Music Room'
          },
          metadata: {
            songTitle: 'Bohemian Rhapsody',
            artist: 'Queen',
            duration: '5:55',
            platform: 'YouTube'
          }
        },
        {
          id: 'log_3',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          type: 'command',
          action: 'Command Executed',
          user: {
            id: '789123456',
            username: 'RegularUser',
            avatar: '/api/placeholder/32/32',
            discriminator: '0003'
          },
          details: 'Executed command: /serverinfo',
          severity: 'low',
          channel: {
            id: 'ch2',
            name: 'bot-commands'
          },
          metadata: {
            commandName: 'serverinfo',
            executionTime: '125ms',
            success: true
          }
        },
        {
          id: 'log_4',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          type: 'error',
          action: 'Command Failed',
          user: {
            id: '321654987',
            username: 'AnotherUser',
            discriminator: '0004'
          },
          details: 'Failed to execute /play command: Missing permissions',
          severity: 'medium',
          channel: {
            id: 'ch3',
            name: 'music-requests'
          },
          metadata: {
            commandName: 'play',
            errorType: 'PermissionError',
            errorMessage: 'Bot missing voice channel permissions'
          }
        },
        {
          id: 'log_5',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          type: 'security',
          action: 'Suspicious Activity',
          details: 'Multiple failed command attempts detected from IP: 192.168.1.100',
          severity: 'high',
          metadata: {
            ipAddress: '192.168.1.100',
            attemptCount: 15,
            timeWindow: '5 minutes'
          }
        },
        {
          id: 'log_6',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          type: 'system',
          action: 'Bot Restart',
          details: 'Bot successfully restarted and reconnected to Discord',
          severity: 'medium',
          metadata: {
            reason: 'Scheduled maintenance',
            downtime: '2 minutes',
            version: 'v0.05'
          }
        }
      ]
      
      // Apply filters
      let filteredLogs = mockLogs
      
      if (filters.type !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.type === filters.type)
      }
      
      if (filters.severity !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.severity === filters.severity)
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredLogs = filteredLogs.filter(log => 
          log.action.toLowerCase().includes(searchLower) ||
          log.details.toLowerCase().includes(searchLower) ||
          log.user?.username.toLowerCase().includes(searchLower) ||
          log.target?.name.toLowerCase().includes(searchLower)
        )
      }
      
      setLogs(filteredLogs)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
    setLoading(false)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'moderation': return '🛡️'
      case 'music': return '🎵'
      case 'command': return '⚡'
      case 'error': return '❌'
      case 'system': return '⚙️'
      case 'user': return '👤'
      case 'security': return '🔒'
      default: return '📄'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'moderation': return '#F59E0B'
      case 'music': return '#10B981'
      case 'command': return '#3B82F6'
      case 'error': return '#EF4444'
      case 'system': return '#8B5CF6'
      case 'user': return '#6B7280'
      case 'security': return '#DC2626'
      default: return '#6B7280'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#10B981'
      case 'medium': return '#F59E0B'
      case 'high': return '#EF4444'
      case 'critical': return '#DC2626'
      default: return '#6B7280'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🟠'
      case 'critical': return '🔴'
      default: return '⚪'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Action', 'User', 'Details', 'Severity'],
      ...logs.map(log => [
        log.timestamp,
        log.type,
        log.action,
        log.user?.username || '',
        log.details,
        log.severity
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-logs-${selectedServer}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout 
      currentPage="logs"
      title="Activity Logs"
      description="Monitor and audit all bot activities and events"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Server Selector */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>
            Select Server
          </h3>
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '1rem'
            }}
          >
            <option value="">Select a server...</option>
            <option value="guild1">Test Server #1</option>
            <option value="guild2">Test Server #2</option>
          </select>
        </div>

        {selectedServer && (
          <>
            {/* Filters */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>
                Filters & Search
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                    Event Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white'
                    }}
                  >
                    <option value="all">All Types</option>
                    <option value="moderation">🛡️ Moderation</option>
                    <option value="music">🎵 Music</option>
                    <option value="command">⚡ Commands</option>
                    <option value="error">❌ Errors</option>
                    <option value="system">⚙️ System</option>
                    <option value="security">🔒 Security</option>
                  </select>
                </div>

                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                    Severity
                  </label>
                  <select
                    value={filters.severity}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white'
                    }}
                  >
                    <option value="all">All Severities</option>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="critical">🔴 Critical</option>
                  </select>
                </div>

                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                    Time Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white'
                    }}
                  >
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>

                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                    Search
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search logs..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Log Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {[
                { type: 'moderation', count: logs.filter(l => l.type === 'moderation').length },
                { type: 'music', count: logs.filter(l => l.type === 'music').length },
                { type: 'command', count: logs.filter(l => l.type === 'command').length },
                { type: 'error', count: logs.filter(l => l.type === 'error').length }
              ].map(stat => (
                <div
                  key={stat.type}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    backdropFilter: 'blur(10px)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    {getTypeIcon(stat.type)}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>
                    {stat.count}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'capitalize' }}>
                    {stat.type}
                  </div>
                </div>
              ))}
            </div>

            {/* Activity Logs */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ color: 'white', margin: 0 }}>
                  Activity Logs ({logs.length} entries)
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={exportLogs}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    📥 Export CSV
                  </button>
                  <button
                    onClick={fetchLogs}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', padding: '2rem' }}>
                  Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', padding: '2rem' }}>
                  No logs found matching the current filters.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => {
                        setSelectedLog(log)
                        setShowDetails(true)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderLeft: `4px solid ${getTypeColor(log.type)}`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: `${getTypeColor(log.type)}20`,
                          fontSize: '1.25rem'
                        }}>
                          {getTypeIcon(log.type)}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '0.25rem'
                          }}>
                            <span style={{ color: 'white', fontWeight: 'bold' }}>
                              {log.action}
                            </span>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              background: `${getSeverityColor(log.severity)}20`,
                              color: getSeverityColor(log.severity),
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              {getSeverityIcon(log.severity)}
                              {log.severity}
                            </span>
                          </div>

                          <div style={{
                            fontSize: '0.85rem',
                            color: 'rgba(255, 255, 255, 0.7)',
                            marginBottom: '0.25rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {log.details}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {log.user && (
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                                👤 {log.user.username}
                              </span>
                            )}
                            {log.channel && (
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                                # {log.channel.name}
                              </span>
                            )}
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        background: `${getTypeColor(log.type)}20`,
                        color: getTypeColor(log.type),
                        textTransform: 'capitalize'
                      }}>
                        {log.type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Log Details Modal */}
        {showDetails && selectedLog && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowDetails(false)}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80%',
                overflowY: 'auto',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ color: 'white', margin: 0 }}>Log Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    fontSize: '1.5rem'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    background: `${getTypeColor(selectedLog.type)}20`,
                    padding: '0.5rem',
                    borderRadius: '8px'
                  }}>
                    {getTypeIcon(selectedLog.type)}
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      {selectedLog.action}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Details</h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0, lineHeight: '1.5' }}>
                    {selectedLog.details}
                  </p>
                </div>

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    <h4 style={{ color: 'white', marginBottom: '1rem' }}>Additional Information</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Object.entries(selectedLog.metadata).map(([key, value]) => (
                        <div key={key} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px'
                        }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)', textTransform: 'capitalize' }}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span style={{ color: 'white', fontFamily: 'monospace' }}>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedLog.user || selectedLog.target || selectedLog.channel) && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    <h4 style={{ color: 'white', marginBottom: '1rem' }}>Context</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedLog.user && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>User:</span>
                          <span style={{ color: 'white' }}>
                            {selectedLog.user.username}#{selectedLog.user.discriminator || '0000'}
                          </span>
                        </div>
                      )}
                      {selectedLog.target && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Target:</span>
                          <span style={{ color: 'white' }}>
                            {selectedLog.target.name} ({selectedLog.target.type})
                          </span>
                        </div>
                      )}
                      {selectedLog.channel && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Channel:</span>
                          <span style={{ color: 'white' }}>
                            #{selectedLog.channel.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export const getStaticProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'admin', 'navigation']))
  }
})