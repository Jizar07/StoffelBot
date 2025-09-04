import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import AdminLayout from '../../components/AdminLayout'
import ServerSelector from '../../components/ServerSelector'
import axios from 'axios'

interface BotSettings {
  // Core bot settings
  botPrefix: string
  autoRestart: boolean
  commandLogging: boolean
  maintenanceMode: boolean
  
  // Global Music settings
  defaultVolume: number
  autoLeaveEmpty: boolean
  autoLeaveEmptyTimeout: number
  autoLeaveEnd: boolean
  autoLeaveEndTimeout: number
  maxQueueSize: number
  allowPlaylists: boolean
  allowSpotify: boolean
  allowYouTube: boolean
  soundEffectsEnabled: boolean
  voiceFiltersEnabled: boolean
  djModeEnabled: boolean
  voteSkipThreshold: number
  musicRecommendations: boolean
  
  // Role management
  roleManagementEnabled: boolean
  maxSelfRoles: number
  removeReactionOnRevoke: boolean
  
  // Ticket system
  ticketSystemEnabled: boolean
  maxTicketsPerUser: number
  autoCloseInactiveTickets: boolean
  inactiveTicketHours: number
  ticketTranscripts: boolean
  ticketRating: boolean
  
  // Welcome system
  welcomeSystemEnabled: boolean
  welcomeChannel?: string
  welcomeMessage: string
  farewellMessage: string
  directWelcomeMessage: boolean
  assignWelcomeRole: boolean
  welcomeRoleId?: string
  
  // Leveling system
  levelingEnabled: boolean
  levelUpMessage: string
  levelUpChannel?: string
  xpPerMessage: number
  xpCooldown: number
  levelRoleRewards: LevelReward[]
  noXpChannels: string[]
  noXpRoles: string[]
  
  // Economy system
  economyEnabled: boolean
  currencyName: string
  currencySymbol: string
  dailyAmount: number
  workAmount: number
  workCooldown: number
  gambleEnabled: boolean
  shopEnabled: boolean
  economyLogChannel?: string
}

interface LevelReward {
  level: number
  roleId: string
  roleName: string
  removeOnLevelUp: boolean
}

interface Channel {
  id: string
  name: string
  type: string
}

interface Role {
  id: string
  name: string
  color: string
}

interface BotStatus {
  online: boolean
  guilds: number
  users: number
  uptime: string
  ping?: number
  memoryUsage: number
  cpuUsage: number
}

interface ServerInfo {
  id: string
  name: string
  icon?: string
  memberCount?: number
  isOnline?: boolean
}

export default function BotSettings() {
  const { data: session } = useSession()
  const { t } = useTranslation(['common', 'admin', 'settings'])
  
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null)
  const [settings, setSettings] = useState<BotSettings>({
    // Core settings
    botPrefix: '!',
    autoRestart: true,
    commandLogging: true,
    maintenanceMode: false,
    
    // Music settings
    defaultVolume: 50,
    autoLeaveEmpty: true,
    autoLeaveEmptyTimeout: 300,
    autoLeaveEnd: false,
    autoLeaveEndTimeout: 60,
    maxQueueSize: 100,
    allowPlaylists: true,
    allowSpotify: true,
    allowYouTube: true,
    soundEffectsEnabled: true,
    voiceFiltersEnabled: false,
    djModeEnabled: false,
    voteSkipThreshold: 50,
    musicRecommendations: true,
    
    // Role management
    roleManagementEnabled: true,
    maxSelfRoles: 5,
    removeReactionOnRevoke: true,
    
    // Ticket system
    ticketSystemEnabled: false,
    maxTicketsPerUser: 3,
    autoCloseInactiveTickets: true,
    inactiveTicketHours: 72,
    ticketTranscripts: true,
    ticketRating: false,
    
    // Welcome system
    welcomeSystemEnabled: false,
    welcomeMessage: 'Welcome to {server}, {user}!',
    farewellMessage: 'Goodbye {user}, thanks for being part of {server}!',
    directWelcomeMessage: false,
    assignWelcomeRole: false,
    
    // Leveling system
    levelingEnabled: false,
    levelUpMessage: 'Congratulations {user}! You reached level {level}!',
    xpPerMessage: 15,
    xpCooldown: 60,
    levelRoleRewards: [],
    noXpChannels: [],
    noXpRoles: [],
    
    // Economy system
    economyEnabled: false,
    currencyName: 'coins',
    currencySymbol: '🪙',
    dailyAmount: 100,
    workAmount: 250,
    workCooldown: 3600,
    gambleEnabled: false,
    shopEnabled: false
  })
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'core' | 'music' | 'features' | 'economy' | 'status'>('core')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (selectedServerId) {
      fetchSettings()
      fetchChannels()
      fetchRoles()
    }
    fetchBotStatus()
  }, [selectedServerId])

  const fetchSettings = async () => {
    if (!selectedServerId) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/admin/settings/${selectedServerId}`)
      if (response.data.settings) {
        setSettings({ ...settings, ...response.data.settings })
      }
    } catch (error) {
      console.error('Error fetching bot settings:', error)
      setMessage({ type: 'error', text: 'Failed to load bot settings' })
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

  const fetchRoles = async () => {
    if (!selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/guild/${selectedServerId}/roles`)
      if (response.data.roles) {
        setRoles(response.data.roles)
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const fetchBotStatus = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/bot/status`)
      if (response.data.status) {
        setBotStatus(response.data.status)
      }
    } catch (error) {
      console.error('Error fetching bot status:', error)
    }
  }

  const saveSettings = async () => {
    if (!selectedServerId) return
    
    setSaving(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      await axios.post(`${backendUrl}/api/admin/settings/${selectedServerId}`, {
        settings: settings,
        userId: session?.user?.id,
        userName: session?.user?.name
      })
      
      setMessage({ type: 'success', text: 'Bot settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving bot settings:', error)
      setMessage({ type: 'error', text: 'Failed to save bot settings' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleServerSelect = (serverId: string, server: ServerInfo) => {
    setSelectedServerId(serverId)
    setSelectedServer(server)
  }

  const updateSetting = <K extends keyof BotSettings>(key: K, value: BotSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
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

  const SliderInput = ({ 
    value, 
    onChange, 
    min, 
    max, 
    step = 1, 
    label, 
    unit = '',
    description
  }: {
    value: number
    onChange: (value: number) => void
    min: number
    max: number
    step?: number
    label: string
    unit?: string
    description?: string
  }) => (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '0.5rem'
      }}>
        <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>
          {label}
        </span>
        <span style={{ 
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}>
          {value}{unit}
        </span>
      </div>
      {description && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          fontSize: '0.8rem',
          marginBottom: '0.75rem'
        }}>
          {description}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((value - min) / (max - min)) * 100}%, rgba(255, 255, 255, 0.2) ${((value - min) / (max - min)) * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
          outline: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
  )

  const StatusCard = ({ title, value, icon, color = '#3B82F6', unit = '' }: {
    title: string
    value: string | number
    icon: string
    color?: string
    unit?: string
  }) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '1.5rem',
      textAlign: 'center',
      flex: 1
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{
        fontSize: '1.8rem',
        fontWeight: 'bold',
        color: color,
        marginBottom: '0.25rem'
      }}>
        {value}{unit}
      </div>
      <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
        {title}
      </div>
    </div>
  )

  if (!selectedServerId) {
    return (
      <AdminLayout 
        currentPage="settings"
        title="⚙️ Bot Settings"
        description="Configure global bot settings and features"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          padding: '4rem 2rem'
        }}>
          <div style={{ fontSize: '4rem' }}>⚙️</div>
          <div style={{
            textAlign: 'center',
            color: 'white'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Select a Server
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
              Choose a server to configure its bot settings
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
      currentPage="settings"
      title="⚙️ Bot Settings"
      description={`Configure bot settings for ${selectedServer?.name}`}
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
          <TabButton tab="core" label="Core" icon="⚙️" />
          <TabButton tab="music" label="Music" icon="🎵" />
          <TabButton tab="features" label="Features" icon="🎯" />
          <TabButton tab="economy" label="Economy" icon="💰" />
          <TabButton tab="status" label="Status" icon="📊" />
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
            {/* Core Settings Tab */}
            {activeTab === 'core' && (
              <div>
                <ConfigSection 
                  title="Bot Core Settings"
                  description="Configure essential bot behavior and preferences"
                >
                  <div>
                    <label style={{ 
                      color: 'white', 
                      fontSize: '0.95rem',
                      display: 'block',
                      marginBottom: '0.5rem'
                    }}>
                      Bot Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.botPrefix}
                      onChange={(e) => updateSetting('botPrefix', e.target.value)}
                      style={{
                        width: '100px',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <ToggleSwitch
                    checked={settings.autoRestart}
                    onChange={(checked) => updateSetting('autoRestart', checked)}
                    label="Auto Restart"
                    description="Automatically restart bot processes on crashes"
                  />

                  <ToggleSwitch
                    checked={settings.commandLogging}
                    onChange={(checked) => updateSetting('commandLogging', checked)}
                    label="Command Logging"
                    description="Log all executed commands for debugging"
                  />

                  <ToggleSwitch
                    checked={settings.maintenanceMode}
                    onChange={(checked) => updateSetting('maintenanceMode', checked)}
                    label="Maintenance Mode"
                    description="Disable all non-admin commands"
                  />
                </ConfigSection>
              </div>
            )}

            {/* Music Settings Tab */}
            {activeTab === 'music' && (
              <div>
                <ConfigSection 
                  title="Music Settings"
                  description="Configure music player behavior and limits"
                >
                  <SliderInput
                    value={settings.defaultVolume}
                    onChange={(value) => updateSetting('defaultVolume', value)}
                    min={0}
                    max={100}
                    label="Default Volume"
                    unit="%"
                    description="Default volume when music starts playing"
                  />

                  <SliderInput
                    value={settings.maxQueueSize}
                    onChange={(value) => updateSetting('maxQueueSize', value)}
                    min={10}
                    max={500}
                    step={10}
                    label="Max Queue Size"
                    unit=" songs"
                    description="Maximum number of songs in queue"
                  />

                  <SliderInput
                    value={settings.voteSkipThreshold}
                    onChange={(value) => updateSetting('voteSkipThreshold', value)}
                    min={0}
                    max={100}
                    label="Vote Skip Threshold"
                    unit="%"
                    description="Percentage of users needed to skip a song"
                  />

                  <ToggleSwitch
                    checked={settings.autoLeaveEmpty}
                    onChange={(checked) => updateSetting('autoLeaveEmpty', checked)}
                    label="Auto Leave Empty Channels"
                    description="Leave voice channel when empty"
                  />

                  <ToggleSwitch
                    checked={settings.allowPlaylists}
                    onChange={(checked) => updateSetting('allowPlaylists', checked)}
                    label="Allow Playlists"
                    description="Allow users to add playlists to queue"
                  />

                  <ToggleSwitch
                    checked={settings.allowSpotify}
                    onChange={(checked) => updateSetting('allowSpotify', checked)}
                    label="Allow Spotify"
                    description="Allow Spotify track playback"
                  />

                  <ToggleSwitch
                    checked={settings.allowYouTube}
                    onChange={(checked) => updateSetting('allowYouTube', checked)}
                    label="Allow YouTube"
                    description="Allow YouTube track playback"
                  />

                  <ToggleSwitch
                    checked={settings.soundEffectsEnabled}
                    onChange={(checked) => updateSetting('soundEffectsEnabled', checked)}
                    label="Sound Effects"
                    description="Enable audio sound effects"
                  />

                  <ToggleSwitch
                    checked={settings.djModeEnabled}
                    onChange={(checked) => updateSetting('djModeEnabled', checked)}
                    label="DJ Mode"
                    description="Require DJ role for music controls"
                  />
                </ConfigSection>
              </div>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div>
                <ConfigSection 
                  title="Welcome System"
                  description="Configure welcome and goodbye messages"
                >
                  <ToggleSwitch
                    checked={settings.welcomeSystemEnabled}
                    onChange={(checked) => updateSetting('welcomeSystemEnabled', checked)}
                    label="Enable Welcome System"
                    description="Send welcome messages to new members"
                  />

                  <div>
                    <label style={{ 
                      color: 'white', 
                      fontSize: '0.95rem',
                      display: 'block',
                      marginBottom: '0.5rem'
                    }}>
                      Welcome Message
                    </label>
                    <textarea
                      value={settings.welcomeMessage}
                      onChange={(e) => updateSetting('welcomeMessage', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.9rem',
                        resize: 'vertical',
                        minHeight: '80px'
                      }}
                    />
                  </div>

                  <ToggleSwitch
                    checked={settings.directWelcomeMessage}
                    onChange={(checked) => updateSetting('directWelcomeMessage', checked)}
                    label="Direct Welcome Message"
                    description="Send welcome message via DM instead of channel"
                  />

                  <ToggleSwitch
                    checked={settings.assignWelcomeRole}
                    onChange={(checked) => updateSetting('assignWelcomeRole', checked)}
                    label="Assign Welcome Role"
                    description="Automatically assign role to new members"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Leveling System"
                  description="Configure XP and leveling features"
                >
                  <ToggleSwitch
                    checked={settings.levelingEnabled}
                    onChange={(checked) => updateSetting('levelingEnabled', checked)}
                    label="Enable Leveling System"
                    description="Track user activity and levels"
                  />

                  <SliderInput
                    value={settings.xpPerMessage}
                    onChange={(value) => updateSetting('xpPerMessage', value)}
                    min={5}
                    max={50}
                    label="XP per Message"
                    unit=" XP"
                    description="Experience points gained per message"
                  />

                  <SliderInput
                    value={settings.xpCooldown}
                    onChange={(value) => updateSetting('xpCooldown', value)}
                    min={30}
                    max={300}
                    step={30}
                    label="XP Cooldown"
                    unit=" seconds"
                    description="Cooldown between XP gains"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Ticket System"
                  description="Configure support ticket functionality"
                >
                  <ToggleSwitch
                    checked={settings.ticketSystemEnabled}
                    onChange={(checked) => updateSetting('ticketSystemEnabled', checked)}
                    label="Enable Ticket System"
                    description="Allow users to create support tickets"
                  />

                  <SliderInput
                    value={settings.maxTicketsPerUser}
                    onChange={(value) => updateSetting('maxTicketsPerUser', value)}
                    min={1}
                    max={10}
                    label="Max Tickets per User"
                    unit=" tickets"
                    description="Maximum open tickets per user"
                  />

                  <ToggleSwitch
                    checked={settings.autoCloseInactiveTickets}
                    onChange={(checked) => updateSetting('autoCloseInactiveTickets', checked)}
                    label="Auto Close Inactive Tickets"
                    description="Automatically close tickets after inactivity"
                  />

                  <ToggleSwitch
                    checked={settings.ticketTranscripts}
                    onChange={(checked) => updateSetting('ticketTranscripts', checked)}
                    label="Ticket Transcripts"
                    description="Generate transcripts when closing tickets"
                  />
                </ConfigSection>
              </div>
            )}

            {/* Economy Tab */}
            {activeTab === 'economy' && (
              <div>
                <ConfigSection 
                  title="Economy System"
                  description="Configure virtual economy and currency"
                >
                  <ToggleSwitch
                    checked={settings.economyEnabled}
                    onChange={(checked) => updateSetting('economyEnabled', checked)}
                    label="Enable Economy System"
                    description="Allow users to earn and spend virtual currency"
                  />

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ 
                        color: 'white', 
                        fontSize: '0.95rem',
                        display: 'block',
                        marginBottom: '0.5rem'
                      }}>
                        Currency Name
                      </label>
                      <input
                        type="text"
                        value={settings.currencyName}
                        onChange={(e) => updateSetting('currencyName', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ 
                        color: 'white', 
                        fontSize: '0.95rem',
                        display: 'block',
                        marginBottom: '0.5rem'
                      }}>
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={settings.currencySymbol}
                        onChange={(e) => updateSetting('currencySymbol', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  </div>

                  <SliderInput
                    value={settings.dailyAmount}
                    onChange={(value) => updateSetting('dailyAmount', value)}
                    min={50}
                    max={1000}
                    step={50}
                    label="Daily Reward Amount"
                    unit={` ${settings.currencyName}`}
                    description="Amount users get from daily command"
                  />

                  <SliderInput
                    value={settings.workAmount}
                    onChange={(value) => updateSetting('workAmount', value)}
                    min={100}
                    max={2000}
                    step={50}
                    label="Work Reward Amount"
                    unit={` ${settings.currencyName}`}
                    description="Amount users get from work command"
                  />

                  <ToggleSwitch
                    checked={settings.gambleEnabled}
                    onChange={(checked) => updateSetting('gambleEnabled', checked)}
                    label="Enable Gambling"
                    description="Allow users to gamble their currency"
                  />

                  <ToggleSwitch
                    checked={settings.shopEnabled}
                    onChange={(checked) => updateSetting('shopEnabled', checked)}
                    label="Enable Shop System"
                    description="Allow users to buy items with currency"
                  />
                </ConfigSection>
              </div>
            )}

            {/* Status Tab */}
            {activeTab === 'status' && (
              <div>
                <ConfigSection 
                  title="Bot Status"
                  description="Current bot performance and statistics"
                >
                  {botStatus ? (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '1rem' 
                    }}>
                      <StatusCard 
                        title="Status" 
                        value={botStatus.online ? "Online" : "Offline"} 
                        icon={botStatus.online ? "🟢" : "🔴"} 
                        color={botStatus.online ? "#22C55E" : "#EF4444"}
                      />
                      <StatusCard 
                        title="Servers" 
                        value={botStatus.guilds} 
                        icon="🏢" 
                        color="#3B82F6"
                      />
                      <StatusCard 
                        title="Users" 
                        value={botStatus.users.toLocaleString()} 
                        icon="👥" 
                        color="#8B5CF6"
                      />
                      <StatusCard 
                        title="Uptime" 
                        value={botStatus.uptime} 
                        icon="⏰" 
                        color="#10B981"
                      />
                      <StatusCard 
                        title="Ping" 
                        value={botStatus.ping || 0} 
                        icon="📡" 
                        color="#F59E0B"
                        unit="ms"
                      />
                      <StatusCard 
                        title="Memory Usage" 
                        value={botStatus.memoryUsage || 0} 
                        icon="💾" 
                        color="#EC4899"
                        unit="MB"
                      />
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.6)',
                      padding: '3rem 1rem'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                      <div style={{ fontSize: '1.1rem' }}>Loading bot status...</div>
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
            onClick={saveSettings}
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
                <span>⚙️</span>
                <span>Save Bot Settings</span>
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
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'settings', 'navigation'])),
    },
  }
}