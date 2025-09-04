import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import AdminLayout from '../../components/AdminLayout'
import ServerSelector from '../../components/ServerSelector'
import axios from 'axios'

interface MusicSettings {
  enabled: boolean
  defaultVolume: number
  maxQueueSize: number
  allowPlaylists: boolean
  allowYouTube: boolean
  allowSpotify: boolean
  allowSoundCloud: boolean
  djModeEnabled: boolean
  voteSkipThreshold: number
  autoLeaveEmpty: boolean
  autoLeaveEmptyTimeout: number
  autoLeaveEnd: boolean
  autoLeaveEndTimeout: number
  soundEffectsEnabled: boolean
  voiceFiltersEnabled: boolean
  bassBoostEnabled: boolean
  nightcoreEnabled: boolean
  eightDEnabled: boolean
  requireDJRole: boolean
  djRoleId?: string
  allowedChannels: string[]
  blockedChannels: string[]
  maxSongDuration: number // in minutes
  announceSongs: boolean
  showNowPlaying: boolean
  enableLyrics: boolean
  enableRadio: boolean
  crossfadeEnabled: boolean
  crossfadeDuration: number
}

interface VoiceChannel {
  id: string
  name: string
  memberCount: number
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

export default function MusicControl() {
  const { data: session } = useSession()
  const { t } = useTranslation(['common', 'admin', 'music'])
  
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null)
  const [settings, setSettings] = useState<MusicSettings>({
    enabled: true,
    defaultVolume: 50,
    maxQueueSize: 100,
    allowPlaylists: true,
    allowYouTube: true,
    allowSpotify: false,
    allowSoundCloud: false,
    djModeEnabled: false,
    voteSkipThreshold: 50,
    autoLeaveEmpty: true,
    autoLeaveEmptyTimeout: 30,
    autoLeaveEnd: true,
    autoLeaveEndTimeout: 30,
    soundEffectsEnabled: false,
    voiceFiltersEnabled: false,
    bassBoostEnabled: false,
    nightcoreEnabled: false,
    eightDEnabled: false,
    requireDJRole: false,
    allowedChannels: [],
    blockedChannels: [],
    maxSongDuration: 10,
    announceSongs: true,
    showNowPlaying: true,
    enableLyrics: false,
    enableRadio: false,
    crossfadeEnabled: false,
    crossfadeDuration: 3
  })
  
  const [voiceChannels, setVoiceChannels] = useState<VoiceChannel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'filters' | 'permissions'>('basic')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (selectedServerId) {
      fetchSettings()
      fetchServerData()
    }
  }, [selectedServerId])

  const fetchSettings = async () => {
    if (!selectedServerId) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/admin/music/${selectedServerId}`)
      if (response.data.config) {
        // Map the backend config to our settings structure
        const config = response.data.config
        setSettings({
          ...settings,
          enabled: config.enabled,
          defaultVolume: config.defaultVolume,
          maxQueueSize: config.maxQueueSize,
          allowYouTube: config.platforms?.youtube ?? true,
          allowSpotify: config.platforms?.spotify ?? false,
          allowSoundCloud: config.platforms?.soundcloud ?? false,
          djModeEnabled: config.djMode ?? false,
          voteSkipThreshold: config.voteSkip ? 50 : 100,
          autoLeaveEmpty: config.autoLeave?.enabled ?? true,
          autoLeaveEmptyTimeout: config.autoLeave?.timeout ? config.autoLeave.timeout / 60 : 5,
          bassBoostEnabled: config.filters?.bassBoost ?? false,
          nightcoreEnabled: config.filters?.nightcore ?? false,
          eightDEnabled: config.filters?.eightD ?? false,
          requireDJRole: !!config.restrictions?.djRole,
          djRoleId: config.restrictions?.djRole,
          allowedChannels: config.restrictions?.allowedChannels ?? []
        })
      }
    } catch (error) {
      console.error('Error fetching music settings:', error)
      setMessage({ type: 'error', text: 'Failed to load music settings' })
    } finally {
      setLoading(false)
    }
  }

  const fetchServerData = async () => {
    if (!selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      
      // Fetch voice channels
      const channelsResponse = await axios.get(`${backendUrl}/api/admin/channels/${selectedServerId}`)
      if (channelsResponse.data.channels) {
        setVoiceChannels(channelsResponse.data.channels.filter((ch: any) => ch.type === 2)) // Voice channels have type 2
      }
      
      // Fetch roles
      const rolesResponse = await axios.get(`${backendUrl}/api/admin/roles/${selectedServerId}`)
      if (rolesResponse.data.roles) {
        setRoles(rolesResponse.data.roles)
      }
    } catch (error) {
      console.error('Error fetching server data:', error)
    }
  }

  const saveSettings = async () => {
    if (!selectedServerId) return
    
    setSaving(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      
      // Convert our settings format to backend format
      const config = {
        enabled: settings.enabled,
        defaultVolume: settings.defaultVolume,
        maxQueueSize: settings.maxQueueSize,
        platforms: {
          youtube: settings.allowYouTube,
          spotify: settings.allowSpotify,
          soundcloud: settings.allowSoundCloud
        },
        autoLeave: {
          enabled: settings.autoLeaveEmpty,
          timeout: settings.autoLeaveEmptyTimeout * 60 // Convert minutes to seconds
        },
        djMode: settings.djModeEnabled,
        voteSkip: settings.voteSkipThreshold < 100,
        filters: {
          bassBoost: settings.bassBoostEnabled,
          nightcore: settings.nightcoreEnabled,
          eightD: settings.eightDEnabled
        },
        restrictions: {
          djRole: settings.requireDJRole ? settings.djRoleId : null,
          allowedChannels: settings.allowedChannels
        }
      }
      
      await axios.post(`${backendUrl}/api/admin/music/${selectedServerId}`, config)
      
      setMessage({ type: 'success', text: 'Music settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save music settings' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleServerSelect = (serverId: string, server: ServerInfo) => {
    setSelectedServerId(serverId)
    setSelectedServer(server)
  }

  const updateSetting = <K extends keyof MusicSettings>(key: K, value: MusicSettings[K]) => {
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

  if (!selectedServerId) {
    return (
      <AdminLayout 
        currentPage="music"
        title="🎵 Music System Control"
        description="Configure music playback settings for your Discord bot"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          padding: '4rem 2rem'
        }}>
          <div style={{ fontSize: '4rem' }}>🎵</div>
          <div style={{
            textAlign: 'center',
            color: 'white'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Select a Server
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
              Choose a server to configure its music settings
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
      currentPage="music"
      title="🎵 Music System Control"
      description={`Configure music settings for ${selectedServer?.name}`}
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
          <TabButton tab="basic" label="Basic Settings" icon="🎵" />
          <TabButton tab="advanced" label="Advanced" icon="⚙️" />
          <TabButton tab="filters" label="Audio Filters" icon="🎛️" />
          <TabButton tab="permissions" label="Permissions" icon="👮" />
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
            {/* Basic Settings Tab */}
            {activeTab === 'basic' && (
              <div>
                <ConfigSection 
                  title="Music System Status"
                  description="Enable or disable the music system entirely"
                >
                  <ToggleSwitch
                    checked={settings.enabled}
                    onChange={(checked) => updateSetting('enabled', checked)}
                    label="Enable Music System"
                    description="Turn this off to completely disable music functionality"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Playback Settings"
                  description="Configure basic music playback options"
                >
                  <SliderInput
                    value={settings.defaultVolume}
                    onChange={(value) => updateSetting('defaultVolume', value)}
                    min={1}
                    max={100}
                    label="Default Volume"
                    unit="%"
                    description="The default volume when music starts playing"
                  />
                  
                  <SliderInput
                    value={settings.maxQueueSize}
                    onChange={(value) => updateSetting('maxQueueSize', value)}
                    min={10}
                    max={500}
                    step={10}
                    label="Maximum Queue Size"
                    unit=" songs"
                    description="Maximum number of songs that can be queued"
                  />

                  <SliderInput
                    value={settings.maxSongDuration}
                    onChange={(value) => updateSetting('maxSongDuration', value)}
                    min={1}
                    max={60}
                    label="Maximum Song Duration"
                    unit=" minutes"
                    description="Maximum length of songs that can be played"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Supported Platforms"
                  description="Choose which music platforms users can play from"
                >
                  <ToggleSwitch
                    checked={settings.allowYouTube}
                    onChange={(checked) => updateSetting('allowYouTube', checked)}
                    label="🎥 YouTube"
                    description="Allow playing music from YouTube"
                  />
                  
                  <ToggleSwitch
                    checked={settings.allowSpotify}
                    onChange={(checked) => updateSetting('allowSpotify', checked)}
                    label="🎧 Spotify"
                    description="Allow playing music from Spotify (requires premium)"
                  />

                  <ToggleSwitch
                    checked={settings.allowSoundCloud}
                    onChange={(checked) => updateSetting('allowSoundCloud', checked)}
                    label="☁️ SoundCloud"
                    description="Allow playing music from SoundCloud"
                  />

                  <ToggleSwitch
                    checked={settings.allowPlaylists}
                    onChange={(checked) => updateSetting('allowPlaylists', checked)}
                    label="📝 Playlists"
                    description="Allow users to queue entire playlists"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Auto-Leave Settings"
                  description="Configure when the bot should automatically leave voice channels"
                >
                  <ToggleSwitch
                    checked={settings.autoLeaveEmpty}
                    onChange={(checked) => updateSetting('autoLeaveEmpty', checked)}
                    label="Auto-leave when empty"
                    description="Leave voice channel when no users are present"
                  />
                  
                  {settings.autoLeaveEmpty && (
                    <SliderInput
                      value={settings.autoLeaveEmptyTimeout}
                      onChange={(value) => updateSetting('autoLeaveEmptyTimeout', value)}
                      min={5}
                      max={300}
                      step={5}
                      label="Empty Timeout"
                      unit=" seconds"
                      description="How long to wait before leaving empty channel"
                    />
                  )}

                  <ToggleSwitch
                    checked={settings.autoLeaveEnd}
                    onChange={(checked) => updateSetting('autoLeaveEnd', checked)}
                    label="Auto-leave when music ends"
                    description="Leave voice channel when queue is empty"
                  />

                  {settings.autoLeaveEnd && (
                    <SliderInput
                      value={settings.autoLeaveEndTimeout}
                      onChange={(value) => updateSetting('autoLeaveEndTimeout', value)}
                      min={5}
                      max={300}
                      step={5}
                      label="End Timeout"
                      unit=" seconds"
                      description="How long to wait before leaving after music ends"
                    />
                  )}
                </ConfigSection>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div>
                <ConfigSection 
                  title="DJ Mode"
                  description="Enable special DJ features and voting system"
                >
                  <ToggleSwitch
                    checked={settings.djModeEnabled}
                    onChange={(checked) => updateSetting('djModeEnabled', checked)}
                    label="Enable DJ Mode"
                    description="Enables vote-to-skip and other DJ features"
                  />

                  {settings.djModeEnabled && (
                    <SliderInput
                      value={settings.voteSkipThreshold}
                      onChange={(value) => updateSetting('voteSkipThreshold', value)}
                      min={10}
                      max={100}
                      label="Vote Skip Threshold"
                      unit="%"
                      description="Percentage of listeners needed to skip a song"
                    />
                  )}
                </ConfigSection>

                <ConfigSection 
                  title="Song Announcements"
                  description="Configure how the bot announces currently playing songs"
                >
                  <ToggleSwitch
                    checked={settings.announceSongs}
                    onChange={(checked) => updateSetting('announceSongs', checked)}
                    label="Announce New Songs"
                    description="Send a message when a new song starts playing"
                  />

                  <ToggleSwitch
                    checked={settings.showNowPlaying}
                    onChange={(checked) => updateSetting('showNowPlaying', checked)}
                    label="Show Now Playing Status"
                    description="Update bot status to show currently playing song"
                  />

                  <ToggleSwitch
                    checked={settings.enableLyrics}
                    onChange={(checked) => updateSetting('enableLyrics', checked)}
                    label="Enable Lyrics Display"
                    description="Allow users to view song lyrics"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Additional Features"
                  description="Extra music system features"
                >
                  <ToggleSwitch
                    checked={settings.enableRadio}
                    onChange={(checked) => updateSetting('enableRadio', checked)}
                    label="Enable Internet Radio"
                    description="Allow streaming from internet radio stations"
                  />

                  <ToggleSwitch
                    checked={settings.crossfadeEnabled}
                    onChange={(checked) => updateSetting('crossfadeEnabled', checked)}
                    label="Enable Crossfade"
                    description="Smooth transition between songs"
                  />

                  {settings.crossfadeEnabled && (
                    <SliderInput
                      value={settings.crossfadeDuration}
                      onChange={(value) => updateSetting('crossfadeDuration', value)}
                      min={1}
                      max={10}
                      label="Crossfade Duration"
                      unit=" seconds"
                      description="Length of crossfade transition"
                    />
                  )}
                </ConfigSection>
              </div>
            )}

            {/* Audio Filters Tab */}
            {activeTab === 'filters' && (
              <div>
                <ConfigSection 
                  title="Sound Effects"
                  description="Enable various audio effects and filters"
                >
                  <ToggleSwitch
                    checked={settings.soundEffectsEnabled}
                    onChange={(checked) => updateSetting('soundEffectsEnabled', checked)}
                    label="Enable Sound Effects Board"
                    description="Allow users to apply sound effects during playback"
                  />

                  <ToggleSwitch
                    checked={settings.voiceFiltersEnabled}
                    onChange={(checked) => updateSetting('voiceFiltersEnabled', checked)}
                    label="Enable Voice Filters"
                    description="Allow real-time voice filtering during playback"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Audio Filters"
                  description="Specific audio processing filters"
                >
                  <ToggleSwitch
                    checked={settings.bassBoostEnabled}
                    onChange={(checked) => updateSetting('bassBoostEnabled', checked)}
                    label="🔊 Bass Boost"
                    description="Allow users to apply bass enhancement"
                  />

                  <ToggleSwitch
                    checked={settings.nightcoreEnabled}
                    onChange={(checked) => updateSetting('nightcoreEnabled', checked)}
                    label="⚡ Nightcore"
                    description="Enable high-pitch, fast tempo filter"
                  />

                  <ToggleSwitch
                    checked={settings.eightDEnabled}
                    onChange={(checked) => updateSetting('eightDEnabled', checked)}
                    label="🌀 8D Audio"
                    description="Enable immersive 8D audio effect"
                  />
                </ConfigSection>
              </div>
            )}

            {/* Permissions Tab */}
            {activeTab === 'permissions' && (
              <div>
                <ConfigSection 
                  title="DJ Role Permissions"
                  description="Configure who can control music playback"
                >
                  <ToggleSwitch
                    checked={settings.requireDJRole}
                    onChange={(checked) => updateSetting('requireDJRole', checked)}
                    label="Require DJ Role"
                    description="Only users with DJ role can control music"
                  />

                  {settings.requireDJRole && roles.length > 0 && (
                    <div>
                      <label style={{ 
                        color: 'rgba(255, 255, 255, 0.8)', 
                        fontSize: '0.9rem',
                        display: 'block',
                        marginBottom: '0.5rem'
                      }}>
                        DJ Role:
                      </label>
                      <select
                        value={settings.djRoleId || ''}
                        onChange={(e) => updateSetting('djRoleId', e.target.value || undefined)}
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
                        <option value="">Select DJ Role...</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </ConfigSection>

                <ConfigSection 
                  title="Channel Restrictions"
                  description="Control which channels music can be used in"
                >
                  {voiceChannels.length > 0 && (
                    <>
                      <div>
                        <label style={{ 
                          color: 'rgba(255, 255, 255, 0.8)', 
                          fontSize: '0.9rem',
                          display: 'block',
                          marginBottom: '0.5rem'
                        }}>
                          Allowed Voice Channels (leave empty for all):
                        </label>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          maxHeight: '120px',
                          overflowY: 'auto'
                        }}>
                          {voiceChannels.map(channel => (
                            <label key={channel.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.25rem 0',
                              cursor: 'pointer'
                            }}>
                              <input
                                type="checkbox"
                                checked={settings.allowedChannels.includes(channel.id)}
                                onChange={(e) => {
                                  const newChannels = e.target.checked 
                                    ? [...settings.allowedChannels, channel.id]
                                    : settings.allowedChannels.filter(id => id !== channel.id)
                                  updateSetting('allowedChannels', newChannels)
                                }}
                                style={{ accentColor: '#3B82F6' }}
                              />
                              <span style={{ color: 'white', fontSize: '0.9rem' }}>
                                🔊 {channel.name} ({channel.memberCount} members)
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ 
                          color: 'rgba(255, 255, 255, 0.8)', 
                          fontSize: '0.9rem',
                          display: 'block',
                          marginBottom: '0.5rem'
                        }}>
                          Blocked Voice Channels:
                        </label>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          maxHeight: '120px',
                          overflowY: 'auto'
                        }}>
                          {voiceChannels.map(channel => (
                            <label key={channel.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.25rem 0',
                              cursor: 'pointer'
                            }}>
                              <input
                                type="checkbox"
                                checked={settings.blockedChannels.includes(channel.id)}
                                onChange={(e) => {
                                  const newChannels = e.target.checked 
                                    ? [...settings.blockedChannels, channel.id]
                                    : settings.blockedChannels.filter(id => id !== channel.id)
                                  updateSetting('blockedChannels', newChannels)
                                }}
                                style={{ accentColor: '#EF4444' }}
                              />
                              <span style={{ color: 'white', fontSize: '0.9rem' }}>
                                🔊 {channel.name} ({channel.memberCount} members)
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
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
                <span>💾</span>
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
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'music', 'navigation'])),
    },
  }
}