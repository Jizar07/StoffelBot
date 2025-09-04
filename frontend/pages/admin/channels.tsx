import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import AdminLayout from '../../components/AdminLayout'
import ServerSelector from '../../components/ServerSelector'
import axios from 'axios'

interface Channel {
  id: string
  name: string
  type: string
  position: number
  topic?: string
  nsfw: boolean
  rateLimitPerUser?: number
  parentId?: string
  categoryName?: string
  permissions: {
    viewChannel: string[]
    sendMessages: string[]
    manageMessages: string[]
    moderatorRoles: string[]
  }
  settings: {
    automodEnabled: boolean
    slowModeEnabled: boolean
    slowModeDelay: number
    logDeleted: boolean
    logEdited: boolean
    webhooksEnabled: boolean
    threadsEnabled: boolean
  }
  stats: {
    messageCount: number
    activeUsers: number
    lastActivity: string
  }
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

export default function ChannelsManagement() {
  const { data: session } = useSession()
  const { t } = useTranslation(['common', 'admin', 'channels'])
  
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'text' | 'voice' | 'categories' | 'permissions'>('text')
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (selectedServerId) {
      fetchChannels()
      fetchRoles()
    }
  }, [selectedServerId])

  const fetchChannels = async () => {
    if (!selectedServerId) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/guild/${selectedServerId}/channels`)
      if (response.data.channels) {
        setChannels(response.data.channels)
      }
    } catch (error) {
      console.error('Error fetching channels:', error)
      setMessage({ type: 'error', text: 'Failed to load channels' })
    } finally {
      setLoading(false)
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

  const saveChannelSettings = async (channelId: string, settings: Partial<Channel>) => {
    setSaving(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      await axios.post(`${backendUrl}/api/admin/channels/${selectedServerId}/${channelId}`, {
        settings: settings,
        userId: session?.user?.id,
        userName: session?.user?.name
      })
      
      setMessage({ type: 'success', text: 'Channel settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
      fetchChannels() // Refresh data
    } catch (error) {
      console.error('Error saving channel settings:', error)
      setMessage({ type: 'error', text: 'Failed to save channel settings' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleServerSelect = (serverId: string, server: ServerInfo) => {
    setSelectedServerId(serverId)
    setSelectedServer(server)
    setSelectedChannel(null)
  }

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = activeTab === 'text' ? channel.type === 'text' : 
                       activeTab === 'voice' ? channel.type === 'voice' :
                       activeTab === 'categories' ? channel.type === 'category' : true
    return matchesSearch && matchesType
  })

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'text': return '💬'
      case 'voice': return '🔊'
      case 'category': return '📁'
      case 'news': return '📢'
      case 'stage': return '🎤'
      default: return '📺'
    }
  }

  const TabButton = ({ tab, label, icon, count }: { tab: string, label: string, icon: string, count?: number }) => (
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
      {count !== undefined && (
        <span style={{
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }}>
          {count}
        </span>
      )}
    </button>
  )

  if (!selectedServerId) {
    return (
      <AdminLayout 
        currentPage="channels"
        title="📺 Channel Management"
        description="Manage server channels, permissions, and settings"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          padding: '4rem 2rem'
        }}>
          <div style={{ fontSize: '4rem' }}>📺</div>
          <div style={{
            textAlign: 'center',
            color: 'white'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Select a Server
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
              Choose a server to manage its channels and permissions
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
      currentPage="channels"
      title="📺 Channel Management"
      description={`Manage channels for ${selectedServer?.name}`}
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
          <TabButton 
            tab="text" 
            label="Text Channels" 
            icon="💬" 
            count={channels.filter(c => c.type === 'text').length}
          />
          <TabButton 
            tab="voice" 
            label="Voice Channels" 
            icon="🔊" 
            count={channels.filter(c => c.type === 'voice').length}
          />
          <TabButton 
            tab="categories" 
            label="Categories" 
            icon="📁" 
            count={channels.filter(c => c.type === 'category').length}
          />
          <TabButton 
            tab="permissions" 
            label="Permissions" 
            icon="🔐"
          />
        </div>

        {/* Search Bar */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Content Based on Active Tab */}
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
                {activeTab === 'text' ? 'Text Channels' :
                 activeTab === 'voice' ? 'Voice Channels' :
                 activeTab === 'categories' ? 'Channel Categories' :
                 'Channel Permissions'} ({filteredChannels.length})
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: selectedChannel?.id === channel.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: `1px solid ${selectedChannel?.id === channel.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
                  }}
                  onClick={() => setSelectedChannel(channel)}
                  onMouseEnter={(e) => {
                    if (selectedChannel?.id !== channel.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChannel?.id !== channel.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.5rem' }}>
                      {getChannelIcon(channel.type)}
                    </div>
                    <div>
                      <div style={{ 
                        color: 'white', 
                        fontWeight: 'bold',
                        marginBottom: '0.25rem'
                      }}>
                        {channel.type === 'voice' ? channel.name : `#${channel.name}`}
                      </div>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: 'rgba(255, 255, 255, 0.6)' 
                      }}>
                        {channel.topic || (channel.categoryName ? `in ${channel.categoryName}` : 'No category')}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {channel.nsfw && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#FCA5A5'
                      }}>
                        NSFW
                      </span>
                    )}
                    {channel.settings?.slowModeEnabled && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(245, 158, 11, 0.2)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#FCD34D'
                      }}>
                        Slowmode
                      </span>
                    )}
                    {channel.settings?.automodEnabled && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(34, 197, 94, 0.2)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#4ADE80'
                      }}>
                        AutoMod
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredChannels.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.6)',
                  padding: '3rem 1rem'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📺</div>
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No channels found</div>
                  <div style={{ fontSize: '0.9rem' }}>
                    {searchQuery ? 'Try adjusting your search terms' : 'This server has no channels of this type'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Channel Details Panel */}
        {selectedChannel && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>
              Channel Settings: {getChannelIcon(selectedChannel.type)} {selectedChannel.name}
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {/* Channel Info */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <h4 style={{ color: 'white', marginBottom: '1rem' }}>Channel Information</h4>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  <div><strong>Type:</strong> {selectedChannel.type}</div>
                  <div><strong>Position:</strong> {selectedChannel.position}</div>
                  {selectedChannel.topic && <div><strong>Topic:</strong> {selectedChannel.topic}</div>}
                  {selectedChannel.categoryName && <div><strong>Category:</strong> {selectedChannel.categoryName}</div>}
                  {selectedChannel.rateLimitPerUser && (
                    <div><strong>Slow Mode:</strong> {selectedChannel.rateLimitPerUser}s</div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <h4 style={{ color: 'white', marginBottom: '1rem' }}>Statistics</h4>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  <div><strong>Messages:</strong> {selectedChannel.stats?.messageCount || 0}</div>
                  <div><strong>Active Users:</strong> {selectedChannel.stats?.activeUsers || 0}</div>
                  <div><strong>Last Activity:</strong> {
                    selectedChannel.stats?.lastActivity ? 
                    new Date(selectedChannel.stats.lastActivity).toLocaleDateString() : 
                    'No recent activity'
                  }</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                onClick={() => {
                  // Toggle automod for this channel
                  const newSettings = {
                    ...selectedChannel,
                    settings: {
                      ...selectedChannel.settings,
                      automodEnabled: !selectedChannel.settings?.automodEnabled
                    }
                  }
                  setSelectedChannel(newSettings)
                  saveChannelSettings(selectedChannel.id, newSettings)
                }}
                disabled={saving}
                style={{
                  padding: '0.5rem 1rem',
                  background: selectedChannel.settings?.automodEnabled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                  border: `1px solid ${selectedChannel.settings?.automodEnabled ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
                  borderRadius: '6px',
                  color: 'white',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {selectedChannel.settings?.automodEnabled ? 'Disable AutoMod' : 'Enable AutoMod'}
              </button>
              
              <button
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Manage Permissions
              </button>
            </div>
          </div>
        )}
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
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'channels', 'navigation'])),
    },
  }
}