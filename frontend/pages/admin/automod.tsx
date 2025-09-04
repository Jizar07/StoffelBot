import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import AdminLayout from '../../components/AdminLayout'
import ServerSelector from '../../components/ServerSelector'
import axios from 'axios'

interface AutoModConfig {
  enabled: boolean
  guildId?: string
  logChannelId?: string
  enabledAt?: string
  enabledBy?: string
  
  // Detection Settings
  spamDetection: boolean
  linkDetection: boolean
  profanityFilter: boolean
  capsFilter: boolean
  duplicateMessageFilter: boolean
  massmentionFilter: boolean
  inviteFilter: boolean
  
  // Action Settings
  autoDelete: boolean
  autoTimeout: boolean
  autoWarn: boolean
  dmUser: boolean
  
  // Thresholds
  spamThreshold: number
  capsThreshold: number
  mentionThreshold: number
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

interface Channel {
  id: string
  name: string
  type: string
}

interface ServerInfo {
  id: string
  name: string
  icon?: string
  memberCount?: number
  isOnline?: boolean
}

export default function AutoModManagement() {
  const { data: session } = useSession()
  const { t } = useTranslation(['common', 'admin', 'automod'])
  
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null)
  const [config, setConfig] = useState<AutoModConfig>({
    enabled: false,
    spamDetection: true,
    linkDetection: true,
    profanityFilter: true,
    capsFilter: false,
    duplicateMessageFilter: true,
    massmentionFilter: true,
    inviteFilter: false,
    autoDelete: true,
    autoTimeout: false,
    autoWarn: true,
    dmUser: true,
    spamThreshold: 5,
    capsThreshold: 70,
    mentionThreshold: 5
  })
  const [serverLanguage, setServerLanguage] = useState<ServerLanguage>({ language: 'en' })
  const [botCustomization, setBotCustomization] = useState<BotCustomization>({})
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'detection' | 'actions' | 'language' | 'customization' | 'test'>('settings')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [testMessage, setTestMessage] = useState('')
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    if (selectedServerId) {
      fetchConfig()
      fetchChannels()
      fetchServerLanguage()
      fetchBotCustomization()
    }
  }, [selectedServerId])

  const fetchConfig = async () => {
    if (!selectedServerId) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/admin/automod/${selectedServerId}`)
      if (response.data.config) {
        setConfig({ ...config, ...response.data.config })
      }
    } catch (error) {
      console.error('Error fetching automod config:', error)
      setMessage({ type: 'error', text: 'Failed to load AutoMod configuration' })
    } finally {
      setLoading(false)
    }
  }

  const fetchChannels = async () => {
    if (!selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/guild/${selectedServerId}/channels`)
      if (response.data.channels) {
        setChannels(response.data.channels.filter((ch: Channel) => ch.type === 'text'))
      }
    } catch (error) {
      console.error('Error fetching channels:', error)
    }
  }

  const fetchServerLanguage = async () => {
    if (!selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/server/${selectedServerId}/language`)
      if (response.data) {
        setServerLanguage({ language: response.data.language, ...response.data.config })
      }
    } catch (error) {
      console.error('Error fetching server language:', error)
    }
  }

  const fetchBotCustomization = async () => {
    if (!selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/server/${selectedServerId}/customization`)
      if (response.data.customization) {
        setBotCustomization(response.data.customization)
      }
    } catch (error) {
      console.error('Error fetching bot customization:', error)
    }
  }

  const saveConfig = async () => {
    if (!selectedServerId) return
    
    setSaving(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      await axios.post(`${backendUrl}/api/admin/automod/${selectedServerId}`, {
        config: config,
        userId: session?.user?.id,
        userName: session?.user?.name
      })
      
      setMessage({ type: 'success', text: 'AutoMod configuration saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving automod config:', error)
      setMessage({ type: 'error', text: 'Failed to save AutoMod configuration' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const updateServerLanguage = async (newLanguage: string) => {
    if (!selectedServerId || !session?.user) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.post(`${backendUrl}/api/server/${selectedServerId}/language`, {
        language: newLanguage,
        userId: session.user.id,
        userName: session.user.name
      })

      if (response.data) {
        setServerLanguage({ language: newLanguage, ...response.data.config })
        setMessage({ 
          type: 'success', 
          text: response.data.message || 'Language updated successfully!' 
        })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error updating server language:', error)
      setMessage({ type: 'error', text: 'Failed to update server language' })
      setTimeout(() => setMessage(null), 3000)
    }
    setLoading(false)
  }

  const updateBotCustomization = async (updates: Partial<BotCustomization>) => {
    if (!selectedServerId || !session?.user) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.post(`${backendUrl}/api/server/${selectedServerId}/customization`, {
        ...updates,
        userId: session.user.id,
        userName: session.user.name
      })

      if (response.data.customization) {
        setBotCustomization(response.data.customization)
        setMessage({ 
          type: 'success', 
          text: response.data.message || 'Bot customization updated successfully!'
        })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error updating bot customization:', error)
      setMessage({ type: 'error', text: 'Failed to update bot customization' })
      setTimeout(() => setMessage(null), 3000)
    }
    setLoading(false)
  }

  const testAutoMod = async () => {
    if (!testMessage.trim() || !selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.post(`${backendUrl}/api/automod/test`, {
        message: testMessage,
        guildId: selectedServerId
      })
      setTestResult(response.data)
    } catch (error) {
      console.error('Error testing automod:', error)
      setTestResult({ error: 'Failed to test message' })
    }
  }

  const handleServerSelect = (serverId: string, server: ServerInfo) => {
    setSelectedServerId(serverId)
    setSelectedServer(server)
    setTestResult(null)
  }

  const updateSetting = <K extends keyof AutoModConfig>(key: K, value: AutoModConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const TabButton = ({ tab, label, icon }: { tab: string, label: string, icon: string }) => (
    <button
      onClick={() => setActiveTab(tab as any)}
      style={{
        padding: '0.75rem 1.5rem',
        background: activeTab === tab ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
        border: activeTab === tab ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s ease',
        fontSize: '0.9rem',
        fontWeight: activeTab === tab ? 'bold' : 'normal'
      }}
      onMouseEnter={(e) => {
        if (activeTab !== tab) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
        }
      }}
      onMouseLeave={(e) => {
        if (activeTab !== tab) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )

  const ConfigSection = ({ title, children, description }: { 
    title: string, 
    children: React.ReactNode,
    description?: string 
  }) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '1.5rem',
      marginBottom: '1.5rem'
    }}>
      <h3 style={{
        color: 'white',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        margin: '0 0 0.5rem 0'
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '0.9rem',
          margin: '0 0 1rem 0'
        }}>
          {description}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {children}
      </div>
    </div>
  )

  const ToggleSwitch = ({ 
    checked, 
    onChange, 
    label, 
    description 
  }: {
    checked: boolean
    onChange: (checked: boolean) => void
    label: string
    description?: string
  }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>
          {label}
        </div>
        {description && (
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '0.8rem',
            marginTop: '0.25rem'
          }}>
            {description}
          </div>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: '48px',
          height: '24px',
          borderRadius: '12px',
          border: 'none',
          background: checked ? '#22C55E' : 'rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease',
          marginLeft: '1rem'
        }}
      >
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: '2px',
          left: checked ? '26px' : '2px',
          transition: 'left 0.2s ease',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }} />
      </button>
    </div>
  )

  if (!selectedServerId) {
    return (
      <AdminLayout 
        currentPage="automod"
        title="🛡️ AutoMod Management"
        description="Configure automated moderation and content filtering"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          padding: '4rem 2rem'
        }}>
          <div style={{ fontSize: '4rem' }}>🛡️</div>
          <div style={{
            textAlign: 'center',
            color: 'white'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Select a Server
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
              Choose a server to configure its AutoMod settings
            </p>
            <div style={{ maxWidth: '400px' }}>
              <ServerSelector
                selectedServerId={selectedServerId}
                onServerSelect={handleServerSelect}
                showDetails={true}
              />
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout 
      currentPage="automod"
      title="🛡️ AutoMod Management"
      description={`Configure AutoMod for ${selectedServer?.name}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Server Selector */}
        <div style={{ maxWidth: '500px' }}>
          <ServerSelector
            selectedServerId={selectedServerId}
            onServerSelect={handleServerSelect}
            showDetails={true}
            compact
          />
        </div>

        {/* Success/Error Message */}
        {message && (
          <div style={{
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '8px',
            padding: '1rem',
            color: message.type === 'success' ? '#86EFAC' : '#FCA5A5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>{message.type === 'success' ? '✅' : '❌'}</span>
            <span>{message.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem'
        }}>
          <TabButton tab="settings" label="General" icon="⚙️" />
          <TabButton tab="detection" label="Detection" icon="🔍" />
          <TabButton tab="actions" label="Actions" icon="⚡" />
          <TabButton tab="language" label="Language" icon="🌐" />
          <TabButton tab="customization" label="Bot" icon="🎭" />
          <TabButton tab="test" label="Test" icon="🧪" />
        </div>

        {/* Tab Content */}
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px' 
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : (
          <>
            {/* General Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <ConfigSection 
                  title="AutoMod Status"
                  description="Enable or disable automatic moderation for this server"
                >
                  <ToggleSwitch
                    checked={config.enabled}
                    onChange={(checked) => updateSetting('enabled', checked)}
                    label="Enable AutoMod"
                    description="Turn on automatic content moderation"
                  />
                  
                  {config.enabled && config.enabledAt && (
                    <div style={{ 
                      color: 'rgba(255, 255, 255, 0.7)', 
                      fontSize: '0.85rem',
                      marginTop: '0.5rem'
                    }}>
                      Enabled on {new Date(config.enabledAt).toLocaleDateString()}
                    </div>
                  )}
                </ConfigSection>

                <ConfigSection 
                  title="Log Channel"
                  description="Choose where moderation logs should be sent"
                >
                  <div>
                    <select
                      value={config.logChannelId || ''}
                      onChange={(e) => updateSetting('logChannelId', e.target.value || undefined)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="">No logging</option>
                      {channels.map(channel => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </ConfigSection>
              </div>
            )}

            {/* Detection Features Tab */}
            {activeTab === 'detection' && (
              <div>
                <ConfigSection 
                  title="Content Detection"
                  description="Choose what types of content to automatically detect"
                >
                  <ToggleSwitch
                    checked={config.spamDetection}
                    onChange={(checked) => updateSetting('spamDetection', checked)}
                    label="🚫 Spam Detection"
                    description="Block repetitive and promotional messages"
                  />
                  
                  <ToggleSwitch
                    checked={config.profanityFilter}
                    onChange={(checked) => updateSetting('profanityFilter', checked)}
                    label="🤬 Profanity Filter"
                    description="Filter inappropriate language and curse words"
                  />

                  <ToggleSwitch
                    checked={config.linkDetection}
                    onChange={(checked) => updateSetting('linkDetection', checked)}
                    label="🔗 Suspicious Links"
                    description="Block potentially harmful or phishing links"
                  />

                  <ToggleSwitch
                    checked={config.massmentionFilter}
                    onChange={(checked) => updateSetting('massmentionFilter', checked)}
                    label="📢 Mass Mentions"
                    description="Prevent users from mentioning many users at once"
                  />

                  <ToggleSwitch
                    checked={config.duplicateMessageFilter}
                    onChange={(checked) => updateSetting('duplicateMessageFilter', checked)}
                    label="📝 Duplicate Messages"
                    description="Block users from sending the same message repeatedly"
                  />

                  <ToggleSwitch
                    checked={config.capsFilter}
                    onChange={(checked) => updateSetting('capsFilter', checked)}
                    label="🔠 Excessive Caps"
                    description="Filter messages with too many capital letters"
                  />

                  <ToggleSwitch
                    checked={config.inviteFilter}
                    onChange={(checked) => updateSetting('inviteFilter', checked)}
                    label="📮 Discord Invites"
                    description="Block Discord server invitation links"
                  />
                </ConfigSection>
              </div>
            )}

            {/* Actions Tab */}
            {activeTab === 'actions' && (
              <div>
                <ConfigSection 
                  title="Automatic Actions"
                  description="Configure what actions to take when content is detected"
                >
                  <ToggleSwitch
                    checked={config.autoDelete}
                    onChange={(checked) => updateSetting('autoDelete', checked)}
                    label="🗑️ Auto Delete"
                    description="Automatically delete detected problematic messages"
                  />

                  <ToggleSwitch
                    checked={config.autoTimeout}
                    onChange={(checked) => updateSetting('autoTimeout', checked)}
                    label="⏰ Auto Timeout"
                    description="Automatically timeout users who violate rules"
                  />

                  <ToggleSwitch
                    checked={config.autoWarn}
                    onChange={(checked) => updateSetting('autoWarn', checked)}
                    label="⚠️ Auto Warn"
                    description="Automatically issue warnings to violating users"
                  />

                  <ToggleSwitch
                    checked={config.dmUser}
                    onChange={(checked) => updateSetting('dmUser', checked)}
                    label="💬 DM User"
                    description="Send direct messages to users about violations"
                  />
                </ConfigSection>
              </div>
            )}

            {/* Language Tab */}
            {activeTab === 'language' && (
              <div>
                <ConfigSection 
                  title="Bot Language"
                  description="Configure what language the bot responds in for this server"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontSize: '0.95rem' }}>Current Language:</span>
                    <span style={{ fontWeight: 'bold', color: 'white' }}>
                      {serverLanguage.language === 'en' ? '🇺🇸 English' : '🇧🇷 Português (Brasil)'}
                    </span>
                  </div>
                  
                  <select 
                    value={serverLanguage.language} 
                    onChange={(e) => updateServerLanguage(e.target.value)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="pt">🇧🇷 Português (Brasil)</option>
                  </select>
                  
                  {serverLanguage.setAt && (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      Set by {serverLanguage.setByName || 'Unknown'} on {new Date(serverLanguage.setAt).toLocaleDateString()}
                    </div>
                  )}
                </ConfigSection>
              </div>
            )}

            {/* Bot Customization Tab */}
            {activeTab === 'customization' && (
              <div>
                <ConfigSection 
                  title="Bot Customization"
                  description="Customize how the bot appears in your server"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ color: 'white', fontSize: '0.95rem' }}>Current Nickname:</span>
                    <span style={{ fontWeight: 'bold', color: 'white' }}>
                      {botCustomization.currentNickname || 'Default Bot Name'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Enter new bot nickname"
                      maxLength={32}
                      defaultValue={botCustomization.nickname || ''}
                      style={{ 
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    />
                    <button 
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        updateBotCustomization({ nickname: input.value.trim() || undefined });
                      }}
                      disabled={loading}
                      style={{ 
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(59, 130, 246, 0.8)',
                        border: '1px solid rgba(59, 130, 246, 0.6)',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      {loading ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                  
                  {botCustomization.setAt && (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      Last updated by {botCustomization.setByName || 'Unknown'} on {new Date(botCustomization.setAt).toLocaleDateString()}
                    </div>
                  )}
                </ConfigSection>
              </div>
            )}

            {/* Test Tab */}
            {activeTab === 'test' && (
              <div>
                <ConfigSection 
                  title="Test AutoMod"
                  description="Test how a message would be processed by the moderation system"
                >
                  <div>
                    <input
                      type="text"
                      placeholder="Enter a test message..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.9rem',
                        marginBottom: '1rem'
                      }}
                    />
                    <button
                      onClick={testAutoMod}
                      disabled={!testMessage.trim()}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: testMessage.trim() ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.6)',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: testMessage.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span>🧪</span>
                      <span>Test Message</span>
                    </button>
                  </div>

                  {testResult && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      background: testResult.isSpam ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      border: `1px solid ${testResult.isSpam ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                      borderRadius: '8px'
                    }}>
                      <div style={{ 
                        color: testResult.isSpam ? '#FCA5A5' : '#86EFAC',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>{testResult.isSpam ? '❌' : '✅'}</span>
                        <span>{testResult.isSpam ? 'WOULD BE BLOCKED' : 'WOULD BE ALLOWED'}</span>
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                        Confidence: {Math.round((testResult.confidence || 0) * 100)}%
                      </div>
                      {testResult.reasons && testResult.reasons.length > 0 && (
                        <div style={{ 
                          marginTop: '0.5rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.85rem'
                        }}>
                          <strong>Detected Issues:</strong>
                          <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                            {testResult.reasons.map((reason: string, index: number) => (
                              <li key={index}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </ConfigSection>
              </div>
            )}
          </>
        )}

        {/* Save Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button
            onClick={saveConfig}
            disabled={saving}
            style={{
              padding: '0.75rem 2rem',
              background: saving ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.8)',
              border: '1px solid rgba(59, 130, 246, 0.6)',
              borderRadius: '8px',
              color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 1)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.8)'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            {saving ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>🛡️</span>
                <span>Save AutoMod Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AdminLayout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'automod', 'navigation'])),
    },
  }
}