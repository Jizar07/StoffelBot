import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import Navigation from '../components/Navigation'
import axios from 'axios'

interface Command {
  name: string
  description: string
  options: any[]
}

interface BotStatus {
  online: boolean
  guilds: number
  users: number
  uptime: string
  ping?: number
}

interface Settings {
  botPrefix: string
  autoRestart: boolean
  commandLogging: boolean
  maintenanceMode: boolean
}

export default function Settings() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation(['settings', 'common'])
  
  const [botStatus, setBotStatus] = useState<BotStatus>({
    online: false,
    guilds: 0,
    users: 0,
    uptime: '0s'
  })
  const [commands, setCommands] = useState<Command[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [settings, setSettings] = useState<Settings>({
    botPrefix: '/',
    autoRestart: true,
    commandLogging: true,
    maintenanceMode: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
        
        // Fetch bot status
        const statusResponse = await axios.get(`${backendUrl}/api/bot/status`)
        setBotStatus(statusResponse.data)
        
        // Fetch commands
        const commandsResponse = await axios.get(`${backendUrl}/api/bot/commands`)
        setCommands(commandsResponse.data.commands || [])
        
        // Fetch logs
        const logsResponse = await axios.get(`${backendUrl}/api/bot/logs`)
        setLogs(logsResponse.data.logs || [])
        
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchData()
      // Refresh data every 30 seconds
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  const handleSettingsChange = (key: keyof Settings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleRestartBot = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      await axios.post(`${backendUrl}/api/bot/restart`)
      alert('Bot restart requested')
    } catch (error) {
      console.error('Error restarting bot:', error)
      alert('Failed to restart bot')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem' }}>{t('common:loading')}</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Navigation currentPage="settings" />
      
      <div className="container">
        <header style={{ marginBottom: '3rem', marginTop: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{t('settings:title')}</h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>{t('settings:description')}</p>
          </div>
        </header>

      <div className="grid">
        {/* Bot Status */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('settings:botStatus')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('settings:status')}:</span>
              <span style={{ 
                color: botStatus.online ? '#4ade80' : '#f87171',
                fontWeight: 'bold'
              }}>
                {botStatus.online ? t('settings:online') : t('settings:offline')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('settings:servers')}:</span>
              <span>{botStatus.guilds}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('settings:users')}:</span>
              <span>{botStatus.users.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('settings:uptime')}:</span>
              <span>{botStatus.uptime}</span>
            </div>
            {botStatus.ping && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('settings:ping')}:</span>
                <span>{botStatus.ping}ms</span>
              </div>
            )}
          </div>
        </div>

        {/* Bot Settings */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('settings:botSettings')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('settings:autoRestart')}:</span>
              <input
                type="checkbox"
                checked={settings.autoRestart}
                onChange={(e) => handleSettingsChange('autoRestart', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('settings:commandLogging')}:</span>
              <input
                type="checkbox"
                checked={settings.commandLogging}
                onChange={(e) => handleSettingsChange('commandLogging', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('settings:maintenanceMode')}:</span>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => handleSettingsChange('maintenanceMode', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>
          </div>
        </div>

        {/* Bot Management */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('settings:management')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              className="button" 
              onClick={() => router.push('/registration')}
              style={{ background: '#059669' }}
            >
              📝 {t('settings:registrationSystem')}
            </button>
            <button className="button" onClick={handleRestartBot}>
              {t('settings:restartBot')}
            </button>
            <button className="button" onClick={() => router.push('/logs')}>
              {t('settings:viewLogs')}
            </button>
            <button className="button" onClick={() => window.open('/api/bot/logs')}>
              {t('settings:downloadLogs')}
            </button>
          </div>
        </div>

        {/* Available Commands */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('settings:availableCommands')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
            {commands.map((cmd, index) => (
              <div key={index} style={{ 
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ 
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: '#60a5fa',
                  marginBottom: '0.25rem'
                }}>
                  /{cmd.name}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  {cmd.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity/Logs */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('settings:recentActivity')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', maxHeight: '200px', overflowY: 'auto' }}>
            {logs.map((log, index) => (
              <div key={index} style={{ opacity: 0.9 }}>
                <span style={{ opacity: 0.7, color: '#94a3b8' }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>{' '}
                <span style={{ 
                  color: log.level === 'error' ? '#f87171' : 
                        log.level === 'warn' ? '#fbbf24' : '#4ade80',
                  textTransform: 'uppercase',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {log.level}
                </span>{' '}
                {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ 
        textAlign: 'center', 
        marginTop: '4rem', 
        padding: '2rem',
        opacity: 0.7
      }}>
        <p>{t('settings:footer')}</p>
      </footer>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'settings', 'navigation'])),
    },
  }
}