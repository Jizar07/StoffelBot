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
  // Core bot settings
  botPrefix: string
  autoRestart: boolean
  commandLogging: boolean
  maintenanceMode: boolean
  
  // Music settings
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
  
  // Anti-spam system
  antiSpamEnabled: boolean
  maxMessagesPerMinute: number
  maxDuplicateMessages: number
  duplicateTimeWindow: number
  spamMuteTime: number
  spamDeleteMessages: boolean
  spamIgnoreChannels: string[]
  spamIgnoreRoles: string[]
  antiSpamLogChannel: string
  
  // Warning/punishment system
  warningSystemEnabled: boolean
  maxWarnings: number
  warningDecayDays: number
  autoMuteAfterWarnings: number
  autoKickAfterWarnings: number
  autoBanAfterWarnings: number
  muteRoleId: string
  warningLogChannel: string
  punishmentLogChannel: string
  appealChannel: string
  
  // Message logging
  messageLoggingEnabled: boolean
  logDeletedMessages: boolean
  logEditedMessages: boolean
  logBulkDeletes: boolean
  messageLogChannel: string
  logIgnoreChannels: string[]
  logIgnoreBots: boolean
  logAttachments: boolean
  maxLogRetention: number
  
  // Role management
  roleManagementEnabled: boolean
  selfAssignableRoles: string[]
  reactionRoles: ReactionRole[]
  maxSelfRoles: number
  removeReactionOnRevoke: boolean
  roleMenuChannel: string
  roleLogChannel: string
  
  // Ticket system
  ticketSystemEnabled: boolean
  ticketCategory: string
  ticketLogChannel: string
  supportRoles: string[]
  maxTicketsPerUser: number
  autoCloseInactiveTickets: boolean
  inactiveTicketHours: number
  ticketTranscripts: boolean
  ticketRating: boolean
  
  // Auto-role system
  autoRoleEnabled: boolean
  joinRoles: string[]
  timeBasedRoles: TimeBasedRole[]
  activityBasedRoles: ActivityRole[]
  verificationRole: string
  verificationChannel: string
  antiRaidMode: boolean
  
  // Voice channel management
  voiceManagementEnabled: boolean
  tempChannelCategory: string
  tempChannelNameFormat: string
  autoDeleteEmpty: boolean
  maxTempChannels: number
  tempChannelUserLimit: number
  allowedToCreateTemp: string[]
  voiceLogChannel: string
  
  // Polls and voting
  pollsEnabled: boolean
  maxPollOptions: number
  maxPollDuration: number
  allowAnonymousPolls: boolean
  requireRoleForPolls: string[]
  pollResultsChannel: string
  autoDeletePolls: boolean
  
  // Birthday tracking
  birthdayTrackingEnabled: boolean
  birthdayAnnouncementChannel: string
  birthdayRole: string
  birthdayMessage: string
  timezoneHandling: string
  birthdayReminders: boolean
  privateBirthdays: boolean
  
  // Reminder system
  remindersEnabled: boolean
  maxRemindersPerUser: number
  maxReminderDuration: number
  reminderLogChannel: string
  publicReminders: boolean
  recurringReminders: boolean
  
  // Server stats
  serverStatsEnabled: boolean
  statsUpdateInterval: number
  memberCountChannel: string
  messageCountChannel: string
  voiceTimeChannel: string
  statsLogChannel: string
  publicStats: boolean
  statsDashboard: boolean
  
  // Translation
  translationEnabled: boolean
  autoTranslateChannels: string[]
  supportedLanguages: string[]
  translationReactions: boolean
  translationLogChannel: string
  detectLanguage: boolean
  
  // Scheduled messages
  scheduledMessagesEnabled: boolean
  maxScheduledMessages: number
  scheduleLogChannel: string
  allowUserScheduling: boolean
  scheduleRoles: string[]
  
  // Voice recording
  voiceRecordingEnabled: boolean
  maxRecordingDuration: number
  recordingStorage: string
  recordingLogChannel: string
  autoDeleteRecordings: number
  recordingPermissions: string[]
  
  // RSS feeds
  rssEnabled: boolean
  rssFeedChannels: RSSFeed[]
  rssUpdateInterval: number
  rssLogChannel: string
  maxFeedsPerServer: number
  
  // AI integration
  aiEnabled: boolean
  aiModel: string
  aiChannels: string[]
  aiPersonality: string
  aiResponseLength: string
  aiModeration: boolean
  aiLogChannel: string
  aiCooldown: number
  maxAiTokens: number
  
  // Calendar integration
  calendarEnabled: boolean
  calendarChannel: string
  eventReminders: boolean
  reminderTimes: number[]
  calendarSync: string
  timezoneDefault: string
  eventLogChannel: string
  
  // Database dashboard
  dashboardEnabled: boolean
  dashboardUsers: string[]
  dashboardLogLevel: string
  backupFrequency: string
  dataRetention: number
  
  // API webhooks
  webhooksEnabled: boolean
  incomingWebhooks: Webhook[]
  outgoingWebhooks: Webhook[]
  webhookSecurity: boolean
  webhookLogChannel: string
  
  // Backup/restore
  backupEnabled: boolean
  backupSchedule: string
  backupLocation: string
  autoRestore: boolean
  backupLogChannel: string
  maxBackups: number
}

interface ReactionRole {
  messageId: string
  channelId: string
  emoji: string
  roleId: string
  description: string
}

interface TimeBasedRole {
  roleId: string
  requiredDays: number
  removeOnLeave: boolean
}

interface ActivityRole {
  roleId: string
  requiredMessages: number
  requiredVoiceHours: number
  timeframe: number
}

interface RSSFeed {
  url: string
  channelId: string
  name: string
  updateInterval: number
  lastUpdated: string
}

interface Webhook {
  url: string
  events: string[]
  secret: string
  name: string
  active: boolean
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
    // Core bot settings
    botPrefix: '/',
    autoRestart: true,
    commandLogging: true,
    maintenanceMode: false,
    
    // Music settings
    defaultVolume: 50,
    autoLeaveEmpty: true,
    autoLeaveEmptyTimeout: 30,
    autoLeaveEnd: true,
    autoLeaveEndTimeout: 30,
    maxQueueSize: 100,
    allowPlaylists: true,
    allowSpotify: true,
    allowYouTube: true,
    soundEffectsEnabled: true,
    voiceFiltersEnabled: false,
    djModeEnabled: false,
    voteSkipThreshold: 50,
    musicRecommendations: true,
    
    // Anti-spam system
    antiSpamEnabled: true,
    maxMessagesPerMinute: 10,
    maxDuplicateMessages: 3,
    duplicateTimeWindow: 60,
    spamMuteTime: 300,
    spamDeleteMessages: true,
    spamIgnoreChannels: [],
    spamIgnoreRoles: [],
    antiSpamLogChannel: '',
    
    // Warning/punishment system
    warningSystemEnabled: true,
    maxWarnings: 5,
    warningDecayDays: 30,
    autoMuteAfterWarnings: 3,
    autoKickAfterWarnings: 4,
    autoBanAfterWarnings: 5,
    muteRoleId: '',
    warningLogChannel: '',
    punishmentLogChannel: '',
    appealChannel: '',
    
    // Message logging
    messageLoggingEnabled: true,
    logDeletedMessages: true,
    logEditedMessages: true,
    logBulkDeletes: true,
    messageLogChannel: '',
    logIgnoreChannels: [],
    logIgnoreBots: true,
    logAttachments: true,
    maxLogRetention: 90,
    
    // Role management
    roleManagementEnabled: true,
    selfAssignableRoles: [],
    reactionRoles: [],
    maxSelfRoles: 10,
    removeReactionOnRevoke: true,
    roleMenuChannel: '',
    roleLogChannel: '',
    
    // Ticket system
    ticketSystemEnabled: false,
    ticketCategory: '',
    ticketLogChannel: '',
    supportRoles: [],
    maxTicketsPerUser: 3,
    autoCloseInactiveTickets: true,
    inactiveTicketHours: 24,
    ticketTranscripts: true,
    ticketRating: true,
    
    // Auto-role system
    autoRoleEnabled: true,
    joinRoles: [],
    timeBasedRoles: [],
    activityBasedRoles: [],
    verificationRole: '',
    verificationChannel: '',
    antiRaidMode: false,
    
    // Voice channel management
    voiceManagementEnabled: false,
    tempChannelCategory: '',
    tempChannelNameFormat: '{user}\'s Channel',
    autoDeleteEmpty: true,
    maxTempChannels: 50,
    tempChannelUserLimit: 0,
    allowedToCreateTemp: [],
    voiceLogChannel: '',
    
    // Polls and voting
    pollsEnabled: true,
    maxPollOptions: 20,
    maxPollDuration: 1440,
    allowAnonymousPolls: true,
    requireRoleForPolls: [],
    pollResultsChannel: '',
    autoDeletePolls: false,
    
    // Birthday tracking
    birthdayTrackingEnabled: false,
    birthdayAnnouncementChannel: '',
    birthdayRole: '',
    birthdayMessage: 'Happy Birthday {user}! 🎉',
    timezoneHandling: 'UTC',
    birthdayReminders: true,
    privateBirthdays: false,
    
    // Reminder system
    remindersEnabled: true,
    maxRemindersPerUser: 10,
    maxReminderDuration: 525600,
    reminderLogChannel: '',
    publicReminders: false,
    recurringReminders: true,
    
    // Server stats
    serverStatsEnabled: false,
    statsUpdateInterval: 300,
    memberCountChannel: '',
    messageCountChannel: '',
    voiceTimeChannel: '',
    statsLogChannel: '',
    publicStats: true,
    statsDashboard: true,
    
    // Translation
    translationEnabled: false,
    autoTranslateChannels: [],
    supportedLanguages: ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'],
    translationReactions: true,
    translationLogChannel: '',
    detectLanguage: true,
    
    // Scheduled messages
    scheduledMessagesEnabled: false,
    maxScheduledMessages: 50,
    scheduleLogChannel: '',
    allowUserScheduling: false,
    scheduleRoles: [],
    
    // Voice recording
    voiceRecordingEnabled: false,
    maxRecordingDuration: 300,
    recordingStorage: 'local',
    recordingLogChannel: '',
    autoDeleteRecordings: 7,
    recordingPermissions: [],
    
    // RSS feeds
    rssEnabled: false,
    rssFeedChannels: [],
    rssUpdateInterval: 3600,
    rssLogChannel: '',
    maxFeedsPerServer: 10,
    
    // AI integration
    aiEnabled: false,
    aiModel: 'gpt-3.5-turbo',
    aiChannels: [],
    aiPersonality: 'helpful',
    aiResponseLength: 'medium',
    aiModeration: true,
    aiLogChannel: '',
    aiCooldown: 5,
    maxAiTokens: 1000,
    
    // Calendar integration
    calendarEnabled: false,
    calendarChannel: '',
    eventReminders: true,
    reminderTimes: [60, 30, 15],
    calendarSync: 'none',
    timezoneDefault: 'UTC',
    eventLogChannel: '',
    
    // Database dashboard
    dashboardEnabled: false,
    dashboardUsers: [],
    dashboardLogLevel: 'info',
    backupFrequency: 'daily',
    dataRetention: 365,
    
    // API webhooks
    webhooksEnabled: false,
    incomingWebhooks: [],
    outgoingWebhooks: [],
    webhookSecurity: true,
    webhookLogChannel: '',
    
    // Backup/restore
    backupEnabled: true,
    backupSchedule: 'daily',
    backupLocation: 'local',
    autoRestore: false,
    backupLogChannel: '',
    maxBackups: 30
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

        {/* Music Settings */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>🎵 Music Settings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Default Volume */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Default Volume:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={settings.defaultVolume}
                  onChange={(e) => handleSettingsChange('defaultVolume', parseInt(e.target.value))}
                  style={{ width: '100px' }}
                />
                <span style={{ minWidth: '35px', textAlign: 'right' }}>{settings.defaultVolume}%</span>
              </div>
            </div>

            {/* Max Queue Size */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Max Queue Size:</span>
              <input
                type="number"
                min="10"
                max="1000"
                value={settings.maxQueueSize}
                onChange={(e) => handleSettingsChange('maxQueueSize', parseInt(e.target.value))}
                style={{ 
                  width: '80px', 
                  padding: '0.25rem', 
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: 'white'
                }}
              />
            </div>

            {/* Advanced Music Features */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Advanced Features</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔊 Sound Effects Board:</span>
                <input
                  type="checkbox"
                  checked={settings.soundEffectsEnabled}
                  onChange={(e) => handleSettingsChange('soundEffectsEnabled', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🎛️ Voice Filters:</span>
                <input
                  type="checkbox"
                  checked={settings.voiceFiltersEnabled}
                  onChange={(e) => handleSettingsChange('voiceFiltersEnabled', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🎧 DJ Mode:</span>
                <input
                  type="checkbox"
                  checked={settings.djModeEnabled}
                  onChange={(e) => handleSettingsChange('djModeEnabled', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              {settings.djModeEnabled && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '1rem' }}>
                  <span>Vote Skip Threshold (%):</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.voteSkipThreshold}
                    onChange={(e) => handleSettingsChange('voteSkipThreshold', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🎯 Music Recommendations:</span>
                <input
                  type="checkbox"
                  checked={settings.musicRecommendations}
                  onChange={(e) => handleSettingsChange('musicRecommendations', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>
            </div>

            {/* Auto Leave Settings */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Auto Leave Settings</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Auto Leave When Empty:</span>
                <input
                  type="checkbox"
                  checked={settings.autoLeaveEmpty}
                  onChange={(e) => handleSettingsChange('autoLeaveEmpty', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              {settings.autoLeaveEmpty && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '1rem' }}>
                  <span>Empty Timeout (seconds):</span>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={settings.autoLeaveEmptyTimeout}
                    onChange={(e) => handleSettingsChange('autoLeaveEmptyTimeout', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Auto Leave When Done:</span>
                <input
                  type="checkbox"
                  checked={settings.autoLeaveEnd}
                  onChange={(e) => handleSettingsChange('autoLeaveEnd', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              {settings.autoLeaveEnd && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '1rem' }}>
                  <span>End Timeout (seconds):</span>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={settings.autoLeaveEndTimeout}
                    onChange={(e) => handleSettingsChange('autoLeaveEndTimeout', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Platform Settings */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Allowed Platforms</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🎥 Allow YouTube:</span>
                <input
                  type="checkbox"
                  checked={settings.allowYouTube}
                  onChange={(e) => handleSettingsChange('allowYouTube', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🎧 Allow Spotify:</span>
                <input
                  type="checkbox"
                  checked={settings.allowSpotify}
                  onChange={(e) => handleSettingsChange('allowSpotify', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📝 Allow Playlists:</span>
                <input
                  type="checkbox"
                  checked={settings.allowPlaylists}
                  onChange={(e) => handleSettingsChange('allowPlaylists', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Anti-Spam System */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>🛡️ Anti-Spam System</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Enable Anti-Spam:</span>
              <input
                type="checkbox"
                checked={settings.antiSpamEnabled}
                onChange={(e) => handleSettingsChange('antiSpamEnabled', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>

            {settings.antiSpamEnabled && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Max Messages Per Minute:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxMessagesPerMinute}
                    onChange={(e) => handleSettingsChange('maxMessagesPerMinute', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Max Duplicate Messages:</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.maxDuplicateMessages}
                    onChange={(e) => handleSettingsChange('maxDuplicateMessages', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Duplicate Time Window (seconds):</span>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={settings.duplicateTimeWindow}
                    onChange={(e) => handleSettingsChange('duplicateTimeWindow', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Spam Mute Duration (seconds):</span>
                  <input
                    type="number"
                    min="60"
                    max="86400"
                    value={settings.spamMuteTime}
                    onChange={(e) => handleSettingsChange('spamMuteTime', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Delete Spam Messages:</span>
                  <input
                    type="checkbox"
                    checked={settings.spamDeleteMessages}
                    onChange={(e) => handleSettingsChange('spamDeleteMessages', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Warning/Punishment System */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>⚠️ Warning & Punishment System</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Enable Warning System:</span>
              <input
                type="checkbox"
                checked={settings.warningSystemEnabled}
                onChange={(e) => handleSettingsChange('warningSystemEnabled', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>

            {settings.warningSystemEnabled && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Max Warnings Before Ban:</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.maxWarnings}
                    onChange={(e) => handleSettingsChange('maxWarnings', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Warning Decay (days):</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.warningDecayDays}
                    onChange={(e) => handleSettingsChange('warningDecayDays', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Auto Actions</h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Auto Mute After (warnings):</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={settings.autoMuteAfterWarnings}
                      onChange={(e) => handleSettingsChange('autoMuteAfterWarnings', parseInt(e.target.value))}
                      style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Auto Kick After (warnings):</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={settings.autoKickAfterWarnings}
                      onChange={(e) => handleSettingsChange('autoKickAfterWarnings', parseInt(e.target.value))}
                      style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Auto Ban After (warnings):</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={settings.autoBanAfterWarnings}
                      onChange={(e) => handleSettingsChange('autoBanAfterWarnings', parseInt(e.target.value))}
                      style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Message Logging System */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>📋 Message Logging</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Enable Message Logging:</span>
              <input
                type="checkbox"
                checked={settings.messageLoggingEnabled}
                onChange={(e) => handleSettingsChange('messageLoggingEnabled', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>

            {settings.messageLoggingEnabled && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Log Deleted Messages:</span>
                  <input
                    type="checkbox"
                    checked={settings.logDeletedMessages}
                    onChange={(e) => handleSettingsChange('logDeletedMessages', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Log Edited Messages:</span>
                  <input
                    type="checkbox"
                    checked={settings.logEditedMessages}
                    onChange={(e) => handleSettingsChange('logEditedMessages', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Log Bulk Deletes:</span>
                  <input
                    type="checkbox"
                    checked={settings.logBulkDeletes}
                    onChange={(e) => handleSettingsChange('logBulkDeletes', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Ignore Bot Messages:</span>
                  <input
                    type="checkbox"
                    checked={settings.logIgnoreBots}
                    onChange={(e) => handleSettingsChange('logIgnoreBots', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Log Attachments:</span>
                  <input
                    type="checkbox"
                    checked={settings.logAttachments}
                    onChange={(e) => handleSettingsChange('logAttachments', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Max Log Retention (days):</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.maxLogRetention}
                    onChange={(e) => handleSettingsChange('maxLogRetention', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Role Management */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>👑 Role Management</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Enable Role Management:</span>
              <input
                type="checkbox"
                checked={settings.roleManagementEnabled}
                onChange={(e) => handleSettingsChange('roleManagementEnabled', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>

            {settings.roleManagementEnabled && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Max Self-Assignable Roles:</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.maxSelfRoles}
                    onChange={(e) => handleSettingsChange('maxSelfRoles', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Remove Reaction on Role Revoke:</span>
                  <input
                    type="checkbox"
                    checked={settings.removeReactionOnRevoke}
                    onChange={(e) => handleSettingsChange('removeReactionOnRevoke', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ticket System */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>🎫 Ticket System</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Enable Ticket System:</span>
              <input
                type="checkbox"
                checked={settings.ticketSystemEnabled}
                onChange={(e) => handleSettingsChange('ticketSystemEnabled', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>

            {settings.ticketSystemEnabled && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Max Tickets Per User:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxTicketsPerUser}
                    onChange={(e) => handleSettingsChange('maxTicketsPerUser', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Auto Close Inactive Tickets:</span>
                  <input
                    type="checkbox"
                    checked={settings.autoCloseInactiveTickets}
                    onChange={(e) => handleSettingsChange('autoCloseInactiveTickets', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                {settings.autoCloseInactiveTickets && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '1rem' }}>
                    <span>Inactive Hours:</span>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={settings.inactiveTicketHours}
                      onChange={(e) => handleSettingsChange('inactiveTicketHours', parseInt(e.target.value))}
                      style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Generate Transcripts:</span>
                  <input
                    type="checkbox"
                    checked={settings.ticketTranscripts}
                    onChange={(e) => handleSettingsChange('ticketTranscripts', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Enable Ticket Rating:</span>
                  <input
                    type="checkbox"
                    checked={settings.ticketRating}
                    onChange={(e) => handleSettingsChange('ticketRating', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Auto-Role System */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>🤖 Auto-Role System</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Enable Auto-Role:</span>
              <input
                type="checkbox"
                checked={settings.autoRoleEnabled}
                onChange={(e) => handleSettingsChange('autoRoleEnabled', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>

            {settings.autoRoleEnabled && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Anti-Raid Mode:</span>
                  <input
                    type="checkbox"
                    checked={settings.antiRaidMode}
                    onChange={(e) => handleSettingsChange('antiRaidMode', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Voice Channel Management */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>🔊 Voice Channel Management</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Enable Voice Management:</span>
              <input
                type="checkbox"
                checked={settings.voiceManagementEnabled}
                onChange={(e) => handleSettingsChange('voiceManagementEnabled', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>

            {settings.voiceManagementEnabled && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Temp Channel Name Format:</span>
                  <input
                    type="text"
                    value={settings.tempChannelNameFormat}
                    onChange={(e) => handleSettingsChange('tempChannelNameFormat', e.target.value)}
                    placeholder="{user}'s Channel"
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                    style={{ width: '200px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Auto Delete Empty Channels:</span>
                  <input
                    type="checkbox"
                    checked={settings.autoDeleteEmpty}
                    onChange={(e) => handleSettingsChange('autoDeleteEmpty', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Max Temp Channels:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxTempChannels}
                    onChange={(e) => handleSettingsChange('maxTempChannels', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Default User Limit (0 = unlimited):</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={settings.tempChannelUserLimit}
                    onChange={(e) => handleSettingsChange('tempChannelUserLimit', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Polls and Voting */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>📊 Polls & Voting</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Enable Polls:</span>
              <input
                type="checkbox"
                checked={settings.pollsEnabled}
                onChange={(e) => handleSettingsChange('pollsEnabled', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>

            {settings.pollsEnabled && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Max Poll Options:</span>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={settings.maxPollOptions}
                    onChange={(e) => handleSettingsChange('maxPollOptions', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Max Poll Duration (minutes):</span>
                  <input
                    type="number"
                    min="1"
                    max="10080"
                    value={settings.maxPollDuration}
                    onChange={(e) => handleSettingsChange('maxPollDuration', parseInt(e.target.value))}
                    style={{ 
                      width: '80px', 
                      padding: '0.25rem', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Allow Anonymous Polls:</span>
                  <input
                    type="checkbox"
                    checked={settings.allowAnonymousPolls}
                    onChange={(e) => handleSettingsChange('allowAnonymousPolls', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Auto Delete Ended Polls:</span>
                  <input
                    type="checkbox"
                    checked={settings.autoDeletePolls}
                    onChange={(e) => handleSettingsChange('autoDeletePolls', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
              </>
            )}
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