import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import Navigation from '../components/Navigation'

interface AutoModConfig {
  enabled: boolean
  guildId?: string
  logChannelId?: string
  enabledAt?: string
  enabledBy?: string
}

interface ServerLanguage {
  language: string
  setBy?: string
  setByName?: string
  setAt?: string
  serverName?: string
}

interface BotCustomization {
  nickname?: string
  currentNickname?: string
  setBy?: string
  setByName?: string
  setAt?: string
}

interface Guild {
  id: string
  name: string
  icon?: string
  channels: Array<{
    id: string
    name: string
    type: string
  }>
}

export default function AutoMod() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation(['automod', 'common'])
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [selectedGuild, setSelectedGuild] = useState<string>('')
  const [config, setConfig] = useState<AutoModConfig>({ enabled: false })
  const [serverLanguage, setServerLanguage] = useState<ServerLanguage>({ language: 'en' })
  const [botCustomization, setBotCustomization] = useState<BotCustomization>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchGuilds()
    }
  }, [session])

  useEffect(() => {
    if (selectedGuild) {
      fetchConfig()
      fetchGuildChannels(selectedGuild)
      fetchServerLanguage()
      fetchBotCustomization()
    }
  }, [selectedGuild])

  const fetchGuilds = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/user/guilds/${session?.user?.id}`)
      
      if (response.ok) {
        const data = await response.json()
        setGuilds(data.guilds || [])
        if (data.guilds && data.guilds.length > 0) {
          setSelectedGuild(data.guilds[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching guilds:', error)
      setMessage({ type: 'error', text: t('automod:messages.loadError') })
    }
  }

  const fetchConfig = async () => {
    if (!selectedGuild) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/automod/config/${selectedGuild}`)
      
      if (response.ok) {
        const data = await response.json()
        setConfig(data.config || { enabled: false })
      } else {
        setConfig({ enabled: false })
      }
    } catch (error) {
      console.error('Error fetching config:', error)
      setConfig({ enabled: false })
    }
  }

  const fetchGuildChannels = async (guildId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/guild/${guildId}/info`)
      
      if (response.ok) {
        const data = await response.json()
        // Update the selected guild data with channels
        setGuilds(prev => prev.map(g => 
          g.id === guildId 
            ? { ...g, channels: data.channels.filter((ch: any) => ch.type === 'text') }
            : g
        ))
        return data.channels.filter((ch: any) => ch.type === 'text')
      }
    } catch (error) {
      console.error('Error fetching channels:', error)
    }
    return []
  }

  const updateConfig = async (newConfig: Partial<AutoModConfig>) => {
    if (!selectedGuild) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/automod/config/${selectedGuild}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          ...newConfig,
          guildId: selectedGuild
        })
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data.config)
        setMessage({ 
          type: 'success', 
          text: newConfig.enabled ? t('automod:messages.enabledSuccess') : t('automod:messages.disabledSuccess')
        })
      } else {
        setMessage({ type: 'error', text: t('automod:messages.updateError') })
      }
    } catch (error) {
      console.error('Error updating config:', error)
      setMessage({ type: 'error', text: t('automod:messages.updateError') })
    }
    setLoading(false)
  }

  const fetchServerLanguage = async () => {
    if (!selectedGuild) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/server/${selectedGuild}/language`)
      
      if (response.ok) {
        const data = await response.json()
        setServerLanguage({ language: data.language, ...data.config })
      }
    } catch (error) {
      console.error('Error fetching server language:', error)
    }
  }

  const updateServerLanguage = async (newLanguage: string) => {
    if (!selectedGuild || !session?.user) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/server/${selectedGuild}/language`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: newLanguage,
          userId: session.user.id,
          userName: session.user.name
        })
      })

      if (response.ok) {
        const data = await response.json()
        setServerLanguage({ language: newLanguage, ...data.config })
        setMessage({ 
          type: 'success', 
          text: data.message 
        })
      } else {
        setMessage({ type: 'error', text: t('automod:messages.updateError') })
      }
    } catch (error) {
      console.error('Error updating server language:', error)
      setMessage({ type: 'error', text: t('automod:messages.updateError') })
    }
    setLoading(false)
  }

  const fetchBotCustomization = async () => {
    if (!selectedGuild) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/server/${selectedGuild}/customization`)
      
      if (response.ok) {
        const data = await response.json()
        setBotCustomization(data.customization || {})
      }
    } catch (error) {
      console.error('Error fetching bot customization:', error)
    }
  }

  const updateBotCustomization = async (updates: Partial<BotCustomization>) => {
    if (!selectedGuild || !session?.user) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/server/${selectedGuild}/customization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          userId: session.user.id,
          userName: session.user.name
        })
      })

      if (response.ok) {
        const data = await response.json()
        setBotCustomization(data.customization)
        setMessage({ 
          type: 'success', 
          text: data.message 
        })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || t('automod:botCustomization.updateError') })
      }
    } catch (error) {
      console.error('Error updating bot customization:', error)
      setMessage({ type: 'error', text: t('automod:botCustomization.updateError') })
    }
    setLoading(false)
  }

  const resetBotCustomization = async () => {
    if (!selectedGuild) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/server/${selectedGuild}/customization`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        setBotCustomization({})
        setMessage({ 
          type: 'success', 
          text: data.message 
        })
      } else {
        setMessage({ type: 'error', text: t('automod:botCustomization.resetError') })
      }
    } catch (error) {
      console.error('Error resetting bot customization:', error)
      setMessage({ type: 'error', text: t('automod:botCustomization.resetError') })
    }
    setLoading(false)
  }

  const testSpamDetection = async () => {
    const testMessage = (document.getElementById('testMessage') as HTMLInputElement)?.value
    if (!testMessage || !selectedGuild) return

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/automod/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: testMessage, guildId: selectedGuild })
      })

      if (response.ok) {
        const data = await response.json()
        const resultDiv = document.getElementById('testResult')
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div class="card" style="margin-top: 1rem; ${data.isSpam ? 'border: 2px solid #f87171' : 'border: 2px solid #4ade80'}">
              <h4>${data.isSpam ? `❌ ${t('automod:spamDetected')}` : `✅ ${t('automod:cleanMessage')}`}</h4>
              <p><strong>${t('automod:confidence')}:</strong> ${Math.round(data.confidence * 100)}%</p>
              ${data.reasons.length > 0 ? `<p><strong>${t('automod:detectedIssues')}:</strong> ${data.reasons.join(', ')}</p>` : ''}
            </div>
          `
        }
      }
    } catch (error) {
      console.error('Error testing spam detection:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '1.5rem' }}>{t('common:loading')}</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const selectedGuildData = guilds.find(g => g.id === selectedGuild)

  return (
    <>
      <Navigation currentPage="automod" />
      
      <div className="container">
        <header style={{ marginBottom: '3rem', marginTop: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️ {t('automod:title')}</h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
            {t('automod:description')}
          </p>
        </header>

        {message && (
          <div className="card" style={{ 
            marginBottom: '2rem',
            border: `2px solid ${message.type === 'success' ? '#4ade80' : '#f87171'}`,
            backgroundColor: message.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)'
          }}>
            <p style={{ margin: 0, color: message.type === 'success' ? '#4ade80' : '#f87171' }}>
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </p>
          </div>
        )}

        <div className="grid">
          {/* Server Selection */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>📋 {t('automod:serverSelection')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select 
                value={selectedGuild} 
                onChange={(e) => setSelectedGuild(e.target.value)}
                style={{ 
                  padding: '0.75rem', 
                  border: '1px solid #374151', 
                  borderRadius: '8px',
                  backgroundColor: '#1f2937',
                  color: 'white'
                }}
              >
                {guilds.map(guild => (
                  <option key={guild.id} value={guild.id}>
                    {guild.name}
                  </option>
                ))}
              </select>
              
              {selectedGuildData && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px'
                }}>
                  {selectedGuildData.icon && (
                    <img 
                      src={selectedGuildData.icon} 
                      alt={selectedGuildData.name}
                      style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                    />
                  )}
                  <div>
                    <h3 style={{ margin: 0 }}>{selectedGuildData.name}</h3>
                    <p style={{ margin: 0, opacity: 0.7 }}>{t('automod:selectedServer')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AutoMod Status */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>⚡ {t('automod:status')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem' }}>{t('common:status')}:</span>
                <span style={{ 
                  color: config.enabled ? '#4ade80' : '#f87171',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}>
                  {config.enabled ? `✅ ${t('automod:enabled')}` : `❌ ${t('automod:disabled')}`}
                </span>
              </div>
              
              {config.enabled && config.enabledAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('automod:enabled')}:</span>
                  <span>{new Date(config.enabledAt).toLocaleString()}</span>
                </div>
              )}

              <button 
                className="button"
                onClick={() => updateConfig({ enabled: !config.enabled })}
                disabled={loading}
                style={{ 
                  backgroundColor: config.enabled ? '#f87171' : '#4ade80',
                  color: 'white'
                }}
              >
                {loading ? t('automod:updating') : (config.enabled ? t('automod:disableAutomod') : t('automod:enableAutomod'))}
              </button>
            </div>
          </div>

          {/* Bot Language Configuration */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>🌐 Bot Language</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ opacity: 0.8 }}>
                Configure what language the bot responds in for this server.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Current Language:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {serverLanguage.language === 'en' ? '🇺🇸 English' : '🇧🇷 Português (Brasil)'}
                </span>
              </div>
              
              <select 
                value={serverLanguage.language} 
                onChange={(e) => updateServerLanguage(e.target.value)}
                disabled={loading}
                style={{ 
                  padding: '0.75rem', 
                  border: '1px solid #374151', 
                  borderRadius: '8px',
                  backgroundColor: '#1f2937',
                  color: 'white'
                }}
              >
                <option value="en">🇺🇸 English</option>
                <option value="pt">🇧🇷 Português (Brasil)</option>
              </select>
              
              {serverLanguage.setAt && (
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  Set by {serverLanguage.setByName || 'Unknown'} on {new Date(serverLanguage.setAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Bot Customization */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>🎭 {t('automod:botCustomization.title')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <p style={{ opacity: 0.8 }}>
                {t('automod:botCustomization.description')}
              </p>
              
              {/* Nickname Section */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{t('automod:botCustomization.nickname')}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>{t('automod:botCustomization.currentNickname')}</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {botCustomization.currentNickname || t('automod:botCustomization.defaultNickname')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="botNickname"
                    type="text"
                    placeholder={t('automod:botCustomization.nicknamePlaceholder')}
                    maxLength={32}
                    defaultValue={botCustomization.nickname || ''}
                    style={{ 
                      flex: 1,
                      padding: '0.5rem', 
                      border: '1px solid #374151', 
                      borderRadius: '6px',
                      backgroundColor: '#1f2937',
                      color: 'white'
                    }}
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('botNickname') as HTMLInputElement;
                      updateBotCustomization({ nickname: input.value.trim() || null });
                    }}
                    disabled={loading}
                    style={{ 
                      padding: '0.5rem 1rem',
                      backgroundColor: '#3b82f6',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {loading ? t('automod:botCustomization.updating') : t('automod:botCustomization.update')}
                  </button>
                </div>
              </div>
              
              
              {/* Reset Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div>
                  {botCustomization.setAt && (
                    <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                      {t('automod:botCustomization.lastUpdated')} {botCustomization.setByName || 'Unknown'} {t('automod:botCustomization.on')} {new Date(botCustomization.setAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <button 
                  onClick={resetBotCustomization}
                  disabled={loading}
                  style={{ 
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f87171',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? t('automod:botCustomization.resetting') : t('automod:botCustomization.resetNickname')}
                </button>
              </div>
            </div>
          </div>

          {/* Log Channel Configuration */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>📋 {t('automod:logChannel')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ opacity: 0.8 }}>
                {t('automod:logChannelDescription')}
              </p>
              
              <select 
                value={config.logChannelId || ''} 
                onChange={(e) => updateConfig({ logChannelId: e.target.value || undefined })}
                style={{ 
                  padding: '0.75rem', 
                  border: '1px solid #374151', 
                  borderRadius: '8px',
                  backgroundColor: '#1f2937',
                  color: 'white'
                }}
              >
                <option value="">{t('automod:noLogChannel')}</option>
                {selectedGuildData?.channels && Array.isArray(selectedGuildData.channels) && 
                  selectedGuildData.channels.filter(ch => ch.type === 'text').map(channel => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Detection Features */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>🔍 {t('automod:detectionFeatures')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>✅ {t('automod:activeProtections')}</h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  <li>{t('automod:protections.spam')}</li>
                  <li>{t('automod:protections.fakeLinks')}</li>
                  <li>{t('automod:protections.profanity')}</li>
                  <li>{t('automod:protections.massmentions')}</li>
                  <li>{t('automod:protections.caps')}</li>
                  <li>{t('automod:protections.suspicious')}</li>
                </ul>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>⚡ {t('automod:autoActions')}</h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  <li>{t('automod:actions.delete')}</li>
                  <li>{t('automod:actions.timeout')}</li>
                  <li>{t('automod:actions.warn')}</li>
                  <li>{t('automod:actions.log')}</li>
                  <li>{t('automod:actions.dm')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Test Spam Detection */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>🧪 {t('automod:testSpamDetection')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                id="testMessage"
                type="text"
                placeholder={t('automod:testPlaceholder')}
                style={{ 
                  padding: '0.75rem', 
                  border: '1px solid #374151', 
                  borderRadius: '8px',
                  backgroundColor: '#1f2937',
                  color: 'white'
                }}
              />
              
              <button 
                className="button"
                onClick={testSpamDetection}
                style={{ backgroundColor: '#3b82f6' }}
              >
                🔍 {t('automod:testMessage')}
              </button>
              
              <div id="testResult"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'automod', 'navigation'])),
    },
  }
}