import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import AdminLayout from '../../components/AdminLayout'
import ServerSelector from '../../components/ServerSelector'
import axios from 'axios'

interface ModerationSettings {
  // AutoMod Settings
  autoModEnabled: boolean
  spamDetection: boolean
  linkDetection: boolean
  profanityFilter: boolean
  capsFilter: boolean
  duplicateMessageFilter: boolean
  massmentionFilter: boolean
  inviteFilter: boolean
  
  // Anti-Spam Configuration
  antiSpamEnabled: boolean
  maxMessagesPerMinute: number
  maxDuplicateMessages: number
  duplicateTimeWindow: number // seconds
  spamMuteTime: number // seconds
  spamDeleteMessages: boolean
  spamIgnoreChannels: string[]
  spamIgnoreRoles: string[]
  
  // Warning System
  warningSystemEnabled: boolean
  maxWarnings: number
  warningDecayDays: number
  autoMuteAfterWarnings: number
  autoKickAfterWarnings: number
  autoBanAfterWarnings: number
  
  // Punishment Settings  
  muteRoleId?: string
  muteDuration: number // minutes
  appealChannelId?: string
  dmPunishments: boolean
  
  // Logging
  logChannelId?: string
  logDeletedMessages: boolean
  logEditedMessages: boolean
  logBulkDeletes: boolean
  logModerationActions: boolean
  logJoinLeave: boolean
  
  // Advanced Filters
  phishingProtection: boolean
  scamLinkDetection: boolean
  maliciousFileDetection: boolean
  explicitContentFilter: boolean
  toxicityDetection: boolean
  toxicityThreshold: number
  
  // Whitelist/Blacklist
  whitelistedDomains: string[]
  blacklistedWords: string[]
  whitelistedChannels: string[]
  whitelistedRoles: string[]
  
  // Raid Protection
  raidProtectionEnabled: boolean
  raidDetectionThreshold: number // joins per minute
  raidActionType: 'lockdown' | 'slowmode' | 'verification'
  raidLockdownDuration: number // minutes
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

interface ServerInfo {
  id: string
  name: string
  icon?: string
  memberCount?: number
  isOnline?: boolean
}

interface ModerationStats {
  totalWarnings: number
  totalMutes: number
  totalKicks: number
  totalBans: number
  messagesDeleted: number
  spamMessagesBlocked: number
  linksBlocked: number
  profanityBlocked: number
}

export default function ModerationControl() {
  const { data: session } = useSession()
  const { t } = useTranslation(['common', 'admin', 'moderation'])
  
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null)
  const [settings, setSettings] = useState<ModerationSettings>({
    // AutoMod Settings
    autoModEnabled: true,
    spamDetection: true,
    linkDetection: true,
    profanityFilter: true,
    capsFilter: false,
    duplicateMessageFilter: true,
    massmentionFilter: true,
    inviteFilter: false,
    
    // Anti-Spam Configuration
    antiSpamEnabled: true,
    maxMessagesPerMinute: 10,
    maxDuplicateMessages: 3,
    duplicateTimeWindow: 60,
    spamMuteTime: 300,
    spamDeleteMessages: true,
    spamIgnoreChannels: [],
    spamIgnoreRoles: [],
    
    // Warning System
    warningSystemEnabled: true,
    maxWarnings: 5,
    warningDecayDays: 30,
    autoMuteAfterWarnings: 3,
    autoKickAfterWarnings: 4,
    autoBanAfterWarnings: 5,
    
    // Punishment Settings
    muteDuration: 60,
    appealChannelId: undefined,
    dmPunishments: true,
    
    // Logging
    logDeletedMessages: true,
    logEditedMessages: true,
    logBulkDeletes: true,
    logModerationActions: true,
    logJoinLeave: false,
    
    // Advanced Filters
    phishingProtection: true,
    scamLinkDetection: true,
    maliciousFileDetection: false,
    explicitContentFilter: false,
    toxicityDetection: false,
    toxicityThreshold: 70,
    
    // Whitelist/Blacklist
    whitelistedDomains: [],
    blacklistedWords: [],
    whitelistedChannels: [],
    whitelistedRoles: [],
    
    // Raid Protection
    raidProtectionEnabled: true,
    raidDetectionThreshold: 10,
    raidActionType: 'slowmode',
    raidLockdownDuration: 30
  })
  
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [stats, setStats] = useState<ModerationStats>({
    totalWarnings: 0,
    totalMutes: 0,
    totalKicks: 0,
    totalBans: 0,
    messagesDeleted: 0,
    spamMessagesBlocked: 0,
    linksBlocked: 0,
    profanityBlocked: 0
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'automod' | 'warnings' | 'logging' | 'advanced' | 'stats'>('automod')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [testMessage, setTestMessage] = useState('')
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    if (selectedServerId) {
      fetchSettings()
      fetchServerData()
      fetchStats()
    }
  }, [selectedServerId])

  const fetchSettings = async () => {
    if (!selectedServerId) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/admin/moderation/${selectedServerId}`)
      if (response.data.config) {
        const config = response.data.config
        setSettings({
          ...settings,
          autoModEnabled: config.autoModEnabled ?? settings.autoModEnabled,
          spamDetection: config.spamDetection ?? settings.spamDetection,
          linkDetection: config.linkDetection ?? settings.linkDetection,
          profanityFilter: config.profanityFilter ?? settings.profanityFilter,
          capsFilter: config.capsFilter ?? settings.capsFilter,
          duplicateMessageFilter: config.duplicateMessageFilter ?? settings.duplicateMessageFilter,
          massmentionFilter: config.massmentionFilter ?? settings.massmentionFilter,
          inviteFilter: config.inviteFilter ?? settings.inviteFilter,
          antiSpamEnabled: config.antiSpamEnabled ?? settings.antiSpamEnabled,
          maxMessagesPerMinute: config.maxMessagesPerMinute ?? settings.maxMessagesPerMinute,
          maxDuplicateMessages: config.maxDuplicateMessages ?? settings.maxDuplicateMessages,
          duplicateTimeWindow: config.duplicateTimeWindow ?? settings.duplicateTimeWindow,
          spamMuteTime: config.spamMuteTime ?? settings.spamMuteTime,
          spamDeleteMessages: config.spamDeleteMessages ?? settings.spamDeleteMessages,
          spamIgnoreChannels: config.spamIgnoreChannels ?? settings.spamIgnoreChannels,
          spamIgnoreRoles: config.spamIgnoreRoles ?? settings.spamIgnoreRoles,
          warningSystemEnabled: config.warningSystemEnabled ?? settings.warningSystemEnabled,
          maxWarnings: config.maxWarnings ?? settings.maxWarnings,
          warningDecayDays: config.warningDecayDays ?? settings.warningDecayDays,
          autoMuteAfterWarnings: config.autoMuteAfterWarnings ?? settings.autoMuteAfterWarnings,
          autoKickAfterWarnings: config.autoKickAfterWarnings ?? settings.autoKickAfterWarnings,
          autoBanAfterWarnings: config.autoBanAfterWarnings ?? settings.autoBanAfterWarnings,
          muteRoleId: config.muteRoleId ?? settings.muteRoleId,
          muteDuration: config.muteDuration ?? settings.muteDuration,
          appealChannelId: config.appealChannelId ?? settings.appealChannelId,
          dmPunishments: config.dmPunishments ?? settings.dmPunishments,
          logChannelId: config.logChannelId ?? settings.logChannelId,
          logDeletedMessages: config.logDeletedMessages ?? settings.logDeletedMessages,
          logEditedMessages: config.logEditedMessages ?? settings.logEditedMessages,
          logBulkDeletes: config.logBulkDeletes ?? settings.logBulkDeletes,
          logModerationActions: config.logModerationActions ?? settings.logModerationActions,
          logJoinLeave: config.logJoinLeave ?? settings.logJoinLeave,
          phishingProtection: config.phishingProtection ?? settings.phishingProtection,
          scamLinkDetection: config.scamLinkDetection ?? settings.scamLinkDetection,
          maliciousFileDetection: config.maliciousFileDetection ?? settings.maliciousFileDetection,
          explicitContentFilter: config.explicitContentFilter ?? settings.explicitContentFilter,
          toxicityDetection: config.toxicityDetection ?? settings.toxicityDetection,
          toxicityThreshold: config.toxicityThreshold ?? settings.toxicityThreshold,
          whitelistedDomains: config.whitelistedDomains ?? settings.whitelistedDomains,
          blacklistedWords: config.blacklistedWords ?? settings.blacklistedWords,
          whitelistedChannels: config.whitelistedChannels ?? settings.whitelistedChannels,
          whitelistedRoles: config.whitelistedRoles ?? settings.whitelistedRoles,
          raidProtectionEnabled: config.raidProtectionEnabled ?? settings.raidProtectionEnabled,
          raidDetectionThreshold: config.raidDetectionThreshold ?? settings.raidDetectionThreshold,
          raidActionType: config.raidActionType ?? settings.raidActionType,
          raidLockdownDuration: config.raidLockdownDuration ?? settings.raidLockdownDuration
        })
      }
    } catch (error) {
      console.error('Error fetching moderation settings:', error)
      setMessage({ type: 'error', text: 'Failed to load moderation settings' })
    } finally {
      setLoading(false)
    }
  }

  const fetchServerData = async () => {
    if (!selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      
      // Fetch channels
      const channelsResponse = await axios.get(`${backendUrl}/api/guild/${selectedServerId}/channels`)
      if (channelsResponse.data.channels) {
        setChannels(channelsResponse.data.channels)
      }
      
      // Fetch roles
      const rolesResponse = await axios.get(`${backendUrl}/api/guild/${selectedServerId}/roles`)
      if (rolesResponse.data.roles) {
        setRoles(rolesResponse.data.roles)
      }
    } catch (error) {
      console.error('Error fetching server data:', error)
    }
  }

  const fetchStats = async () => {
    if (!selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/admin/moderation/stats/${selectedServerId}`)
      if (response.data.stats) {
        setStats(response.data.stats)
      }
    } catch (error) {
      console.error('Error fetching moderation stats:', error)
    }
  }

  const saveSettings = async () => {
    if (!selectedServerId) return
    
    setSaving(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const config = {
        autoModEnabled: settings.autoModEnabled,
        spamDetection: settings.spamDetection,
        linkDetection: settings.linkDetection,
        profanityFilter: settings.profanityFilter,
        capsFilter: settings.capsFilter,
        duplicateMessageFilter: settings.duplicateMessageFilter,
        massmentionFilter: settings.massmentionFilter,
        inviteFilter: settings.inviteFilter,
        antiSpamEnabled: settings.antiSpamEnabled,
        maxMessagesPerMinute: settings.maxMessagesPerMinute,
        maxDuplicateMessages: settings.maxDuplicateMessages,
        duplicateTimeWindow: settings.duplicateTimeWindow,
        spamMuteTime: settings.spamMuteTime,
        spamDeleteMessages: settings.spamDeleteMessages,
        spamIgnoreChannels: settings.spamIgnoreChannels,
        spamIgnoreRoles: settings.spamIgnoreRoles,
        warningSystemEnabled: settings.warningSystemEnabled,
        maxWarnings: settings.maxWarnings,
        warningDecayDays: settings.warningDecayDays,
        autoMuteAfterWarnings: settings.autoMuteAfterWarnings,
        autoKickAfterWarnings: settings.autoKickAfterWarnings,
        autoBanAfterWarnings: settings.autoBanAfterWarnings,
        muteRoleId: settings.muteRoleId,
        muteDuration: settings.muteDuration,
        appealChannelId: settings.appealChannelId,
        dmPunishments: settings.dmPunishments,
        logChannelId: settings.logChannelId,
        logDeletedMessages: settings.logDeletedMessages,
        logEditedMessages: settings.logEditedMessages,
        logBulkDeletes: settings.logBulkDeletes,
        logModerationActions: settings.logModerationActions,
        logJoinLeave: settings.logJoinLeave,
        phishingProtection: settings.phishingProtection,
        scamLinkDetection: settings.scamLinkDetection,
        maliciousFileDetection: settings.maliciousFileDetection,
        explicitContentFilter: settings.explicitContentFilter,
        toxicityDetection: settings.toxicityDetection,
        toxicityThreshold: settings.toxicityThreshold,
        whitelistedDomains: settings.whitelistedDomains,
        blacklistedWords: settings.blacklistedWords,
        whitelistedChannels: settings.whitelistedChannels,
        whitelistedRoles: settings.whitelistedRoles,
        raidProtectionEnabled: settings.raidProtectionEnabled,
        raidDetectionThreshold: settings.raidDetectionThreshold,
        raidActionType: settings.raidActionType,
        raidLockdownDuration: settings.raidLockdownDuration
      }
      
      await axios.post(`${backendUrl}/api/admin/moderation/${selectedServerId}`, {
        config: config,
        userId: session?.user?.id,
        userName: session?.user?.name
      })
      
      setMessage({ type: 'success', text: 'Moderation settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save moderation settings' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
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
    setTestResult(null) // Reset test result when changing servers
  }

  const updateSetting = <K extends keyof ModerationSettings>(key: K, value: ModerationSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const addToList = (listKey: keyof ModerationSettings, value: string) => {
    if (!value.trim()) return
    const currentList = settings[listKey] as string[]
    if (!currentList.includes(value)) {
      updateSetting(listKey, [...currentList, value] as any)
    }
  }

  const removeFromList = (listKey: keyof ModerationSettings, value: string) => {
    const currentList = settings[listKey] as string[]
    updateSetting(listKey, currentList.filter(item => item !== value) as any)
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

  const StatCard = ({ title, value, icon, color = '#3B82F6' }: {
    title: string
    value: number
    icon: string
    color?: string
  }) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '1.5rem',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{
        fontSize: '1.8rem',
        fontWeight: 'bold',
        color: color,
        marginBottom: '0.25rem'
      }}>
        {value.toLocaleString()}
      </div>
      <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
        {title}
      </div>
    </div>
  )

  if (!selectedServerId) {
    return (
      <AdminLayout 
        currentPage="moderation"
        title="🛡️ Moderation Control"
        description="Configure automated moderation and punishment systems"
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
              Choose a server to configure its moderation settings
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
      currentPage="moderation"
      title="🛡️ Moderation Control"
      description={`Configure moderation settings for ${selectedServer?.name}`}
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
          <TabButton tab="automod" label="AutoMod" icon="🤖" />
          <TabButton tab="warnings" label="Warnings" icon="⚠️" />
          <TabButton tab="logging" label="Logging" icon="📋" />
          <TabButton tab="advanced" label="Advanced" icon="🔧" />
          <TabButton tab="stats" label="Statistics" icon="📊" />
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
            {/* AutoMod Tab */}
            {activeTab === 'automod' && (
              <div>
                <ConfigSection 
                  title="AutoMod System"
                  description="Automatically detect and act on harmful content"
                >
                  <ToggleSwitch
                    checked={settings.autoModEnabled}
                    onChange={(checked) => updateSetting('autoModEnabled', checked)}
                    label="Enable AutoMod"
                    description="Turn on automatic content moderation"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Detection Features"
                  description="Choose what types of content to automatically moderate"
                >
                  <ToggleSwitch
                    checked={settings.spamDetection}
                    onChange={(checked) => updateSetting('spamDetection', checked)}
                    label="🚫 Spam Detection"
                    description="Block repetitive and promotional messages"
                  />
                  
                  <ToggleSwitch
                    checked={settings.profanityFilter}
                    onChange={(checked) => updateSetting('profanityFilter', checked)}
                    label="🤬 Profanity Filter"
                    description="Filter inappropriate language and curse words"
                  />

                  <ToggleSwitch
                    checked={settings.linkDetection}
                    onChange={(checked) => updateSetting('linkDetection', checked)}
                    label="🔗 Suspicious Links"
                    description="Block potentially harmful or phishing links"
                  />

                  <ToggleSwitch
                    checked={settings.massmentionFilter}
                    onChange={(checked) => updateSetting('massmentionFilter', checked)}
                    label="📢 Mass Mentions"
                    description="Prevent users from mentioning many users at once"
                  />

                  <ToggleSwitch
                    checked={settings.duplicateMessageFilter}
                    onChange={(checked) => updateSetting('duplicateMessageFilter', checked)}
                    label="📝 Duplicate Messages"
                    description="Block users from sending the same message repeatedly"
                  />

                  <ToggleSwitch
                    checked={settings.capsFilter}
                    onChange={(checked) => updateSetting('capsFilter', checked)}
                    label="🔠 Excessive Caps"
                    description="Filter messages with too many capital letters"
                  />

                  <ToggleSwitch
                    checked={settings.inviteFilter}
                    onChange={(checked) => updateSetting('inviteFilter', checked)}
                    label="📮 Discord Invites"
                    description="Block Discord server invitation links"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Anti-Spam Configuration"
                  description="Fine-tune spam detection settings"
                >
                  <SliderInput
                    value={settings.maxMessagesPerMinute}
                    onChange={(value) => updateSetting('maxMessagesPerMinute', value)}
                    min={1}
                    max={50}
                    label="Max Messages Per Minute"
                    unit=" messages"
                    description="Maximum messages a user can send per minute"
                  />

                  <SliderInput
                    value={settings.maxDuplicateMessages}
                    onChange={(value) => updateSetting('maxDuplicateMessages', value)}
                    min={1}
                    max={10}
                    label="Max Duplicate Messages"
                    unit=" messages"
                    description="How many times a user can repeat the same message"
                  />

                  <SliderInput
                    value={settings.duplicateTimeWindow}
                    onChange={(value) => updateSetting('duplicateTimeWindow', value)}
                    min={10}
                    max={300}
                    step={10}
                    label="Duplicate Detection Window"
                    unit=" seconds"
                    description="Time frame for checking duplicate messages"
                  />

                  <SliderInput
                    value={settings.spamMuteTime}
                    onChange={(value) => updateSetting('spamMuteTime', value)}
                    min={30}
                    max={3600}
                    step={30}
                    label="Spam Mute Duration"
                    unit=" seconds"
                    description="How long to mute users for spamming"
                  />

                  <ToggleSwitch
                    checked={settings.spamDeleteMessages}
                    onChange={(checked) => updateSetting('spamDeleteMessages', checked)}
                    label="Delete Spam Messages"
                    description="Automatically delete detected spam messages"
                  />
                </ConfigSection>

                {/* AutoMod Test Section */}
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

            {/* Warning System Tab */}
            {activeTab === 'warnings' && (
              <div>
                <ConfigSection 
                  title="Warning System"
                  description="Configure how warnings are issued and escalated"
                >
                  <ToggleSwitch
                    checked={settings.warningSystemEnabled}
                    onChange={(checked) => updateSetting('warningSystemEnabled', checked)}
                    label="Enable Warning System"
                    description="Allow moderators to issue warnings to users"
                  />

                  <SliderInput
                    value={settings.maxWarnings}
                    onChange={(value) => updateSetting('maxWarnings', value)}
                    min={1}
                    max={20}
                    label="Maximum Warnings"
                    unit=" warnings"
                    description="Maximum warnings before automatic ban"
                  />

                  <SliderInput
                    value={settings.warningDecayDays}
                    onChange={(value) => updateSetting('warningDecayDays', value)}
                    min={1}
                    max={365}
                    label="Warning Decay Period"
                    unit=" days"
                    description="How long warnings stay on a user's record"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Automatic Punishment Escalation"
                  description="Set when automatic punishments should be applied"
                >
                  <SliderInput
                    value={settings.autoMuteAfterWarnings}
                    onChange={(value) => updateSetting('autoMuteAfterWarnings', value)}
                    min={1}
                    max={settings.maxWarnings}
                    label="Auto-Mute After"
                    unit=" warnings"
                    description="Automatically mute users after this many warnings"
                  />

                  <SliderInput
                    value={settings.autoKickAfterWarnings}
                    onChange={(value) => updateSetting('autoKickAfterWarnings', value)}
                    min={1}
                    max={settings.maxWarnings}
                    label="Auto-Kick After"
                    unit=" warnings"
                    description="Automatically kick users after this many warnings"
                  />

                  <SliderInput
                    value={settings.autoBanAfterWarnings}
                    onChange={(value) => updateSetting('autoBanAfterWarnings', value)}
                    min={1}
                    max={settings.maxWarnings}
                    label="Auto-Ban After"
                    unit=" warnings"
                    description="Automatically ban users after this many warnings"
                  />

                  <SliderInput
                    value={settings.muteDuration}
                    onChange={(value) => updateSetting('muteDuration', value)}
                    min={1}
                    max={1440}
                    label="Default Mute Duration"
                    unit=" minutes"
                    description="How long users are muted by default"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Punishment Settings"
                  description="Configure how punishments are handled"
                >
                  <div>
                    <label style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '0.9rem',
                      display: 'block',
                      marginBottom: '0.5rem'
                    }}>
                      Mute Role:
                    </label>
                    <select
                      value={settings.muteRoleId || ''}
                      onChange={(e) => updateSetting('muteRoleId', e.target.value || undefined)}
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
                      <option value="">Create automatically</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '0.9rem',
                      display: 'block',
                      marginBottom: '0.5rem'
                    }}>
                      Appeal Channel:
                    </label>
                    <select
                      value={settings.appealChannelId || ''}
                      onChange={(e) => updateSetting('appealChannelId', e.target.value || undefined)}
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
                      <option value="">No appeal channel</option>
                      {channels.filter(ch => ch.type === 'text').map(channel => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <ToggleSwitch
                    checked={settings.dmPunishments}
                    onChange={(checked) => updateSetting('dmPunishments', checked)}
                    label="DM Punishment Notifications"
                    description="Send direct messages to users when they receive punishments"
                  />
                </ConfigSection>
              </div>
            )}

            {/* Logging Tab */}
            {activeTab === 'logging' && (
              <div>
                <ConfigSection 
                  title="Log Channel"
                  description="Choose where moderation logs should be sent"
                >
                  <div>
                    <label style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '0.9rem',
                      display: 'block',
                      marginBottom: '0.5rem'
                    }}>
                      Log Channel:
                    </label>
                    <select
                      value={settings.logChannelId || ''}
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
                      {channels.filter(ch => ch.type === 'text').map(channel => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </ConfigSection>

                <ConfigSection 
                  title="Message Logging"
                  description="Configure what message events to log"
                >
                  <ToggleSwitch
                    checked={settings.logDeletedMessages}
                    onChange={(checked) => updateSetting('logDeletedMessages', checked)}
                    label="Log Deleted Messages"
                    description="Record when messages are deleted"
                  />

                  <ToggleSwitch
                    checked={settings.logEditedMessages}
                    onChange={(checked) => updateSetting('logEditedMessages', checked)}
                    label="Log Edited Messages"
                    description="Record when messages are edited"
                  />

                  <ToggleSwitch
                    checked={settings.logBulkDeletes}
                    onChange={(checked) => updateSetting('logBulkDeletes', checked)}
                    label="Log Bulk Deletes"
                    description="Record when multiple messages are deleted at once"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Moderation Logging"
                  description="Configure what moderation events to log"
                >
                  <ToggleSwitch
                    checked={settings.logModerationActions}
                    onChange={(checked) => updateSetting('logModerationActions', checked)}
                    label="Log Moderation Actions"
                    description="Record warns, mutes, kicks, and bans"
                  />

                  <ToggleSwitch
                    checked={settings.logJoinLeave}
                    onChange={(checked) => updateSetting('logJoinLeave', checked)}
                    label="Log Join/Leave Events"
                    description="Record when users join or leave the server"
                  />
                </ConfigSection>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div>
                <ConfigSection 
                  title="Advanced Protection"
                  description="Enhanced security and content filtering"
                >
                  <ToggleSwitch
                    checked={settings.phishingProtection}
                    onChange={(checked) => updateSetting('phishingProtection', checked)}
                    label="🎣 Phishing Protection"
                    description="Block known phishing and malicious websites"
                  />

                  <ToggleSwitch
                    checked={settings.scamLinkDetection}
                    onChange={(checked) => updateSetting('scamLinkDetection', checked)}
                    label="💸 Scam Link Detection"
                    description="Detect and block cryptocurrency and financial scams"
                  />

                  <ToggleSwitch
                    checked={settings.maliciousFileDetection}
                    onChange={(checked) => updateSetting('maliciousFileDetection', checked)}
                    label="🦠 Malicious File Detection"
                    description="Scan uploaded files for malware"
                  />

                  <ToggleSwitch
                    checked={settings.explicitContentFilter}
                    onChange={(checked) => updateSetting('explicitContentFilter', checked)}
                    label="🔞 Explicit Content Filter"
                    description="Filter inappropriate images and content"
                  />

                  <ToggleSwitch
                    checked={settings.toxicityDetection}
                    onChange={(checked) => updateSetting('toxicityDetection', checked)}
                    label="☢️ Toxicity Detection"
                    description="Use AI to detect toxic and harmful behavior"
                  />

                  {settings.toxicityDetection && (
                    <SliderInput
                      value={settings.toxicityThreshold}
                      onChange={(value) => updateSetting('toxicityThreshold', value)}
                      min={10}
                      max={100}
                      label="Toxicity Threshold"
                      unit="%"
                      description="Confidence level required to flag toxic content"
                    />
                  )}
                </ConfigSection>

                <ConfigSection 
                  title="Raid Protection"
                  description="Protect against coordinated attacks"
                >
                  <ToggleSwitch
                    checked={settings.raidProtectionEnabled}
                    onChange={(checked) => updateSetting('raidProtectionEnabled', checked)}
                    label="Enable Raid Protection"
                    description="Automatically protect against server raids"
                  />

                  {settings.raidProtectionEnabled && (
                    <>
                      <SliderInput
                        value={settings.raidDetectionThreshold}
                        onChange={(value) => updateSetting('raidDetectionThreshold', value)}
                        min={5}
                        max={50}
                        label="Raid Detection Threshold"
                        unit=" joins/minute"
                        description="How many joins per minute triggers raid protection"
                      />

                      <div>
                        <label style={{ 
                          color: 'rgba(255, 255, 255, 0.8)', 
                          fontSize: '0.9rem',
                          display: 'block',
                          marginBottom: '0.5rem'
                        }}>
                          Raid Action:
                        </label>
                        <select
                          value={settings.raidActionType}
                          onChange={(e) => updateSetting('raidActionType', e.target.value as 'lockdown' | 'slowmode' | 'verification')}
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
                          <option value="lockdown">Server Lockdown</option>
                          <option value="slowmode">Enable Slowmode</option>
                          <option value="verification">Require Verification</option>
                        </select>
                      </div>

                      {settings.raidActionType === 'lockdown' && (
                        <SliderInput
                          value={settings.raidLockdownDuration}
                          onChange={(value) => updateSetting('raidLockdownDuration', value)}
                          min={5}
                          max={180}
                          step={5}
                          label="Lockdown Duration"
                          unit=" minutes"
                          description="How long to keep the server locked down"
                        />
                      )}
                    </>
                  )}
                </ConfigSection>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
              <div>
                <ConfigSection 
                  title="Moderation Statistics"
                  description="Overview of moderation activity"
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                  }}>
                    <StatCard title="Total Warnings" value={stats.totalWarnings} icon="⚠️" color="#F59E0B" />
                    <StatCard title="Total Mutes" value={stats.totalMutes} icon="🔇" color="#8B5CF6" />
                    <StatCard title="Total Kicks" value={stats.totalKicks} icon="👢" color="#EF4444" />
                    <StatCard title="Total Bans" value={stats.totalBans} icon="🔨" color="#DC2626" />
                  </div>
                </ConfigSection>

                <ConfigSection 
                  title="Content Filtering Statistics"
                  description="AutoMod activity overview"
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                  }}>
                    <StatCard title="Messages Deleted" value={stats.messagesDeleted} icon="🗑️" color="#6B7280" />
                    <StatCard title="Spam Blocked" value={stats.spamMessagesBlocked} icon="🚫" color="#DC2626" />
                    <StatCard title="Links Blocked" value={stats.linksBlocked} icon="🔗" color="#F59E0B" />
                    <StatCard title="Profanity Blocked" value={stats.profanityBlocked} icon="🤬" color="#EF4444" />
                  </div>
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
                <span>🛡️</span>
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'moderation', 'navigation'])),
    },
  }
}