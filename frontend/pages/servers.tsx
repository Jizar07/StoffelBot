import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import Navigation from '../components/Navigation'
import axios from 'axios'

interface Guild {
  id: string
  name: string
  icon: string | null
  memberCount: number
  ownerId: string
  createdAt: string
  joined: string
  features: string[]
  large: boolean
  verified: boolean
  partnered: boolean
  boostLevel: number
  boostCount: number
  channels: {
    total: number
    text: number
    voice: number
    categories: number
  }
  roles: number
  emojis: number
  region: string
  vanityURLCode: string | null
}

interface GuildsResponse {
  guilds: Guild[]
  totalGuilds: number
  totalMembers: number
  hasSubscription: boolean
  message?: string
}

interface AvailableServer {
  id: string
  name: string
  icon: string | null
  memberCount: number
  createdAt: string
  joined: string
}

export default function Servers() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation(['servers', 'common'])
  
  const [guildsData, setGuildsData] = useState<GuildsResponse | null>(null)
  const [availableServers, setAvailableServers] = useState<AvailableServer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'members' | 'joined'>('name')
  const [showAvailable, setShowAvailable] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) return
      
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
        
        // Fetch user's subscribed servers
        const guildsResponse = await axios.get(`${backendUrl}/api/user/guilds/${session.user.id}`)
        setGuildsData(guildsResponse.data)
        
        // Fetch available servers user can claim
        const availableResponse = await axios.get(`${backendUrl}/api/user/${session.user.id}/available-servers`)
        setAvailableServers(availableResponse.data.availableServers || [])
        
      } catch (error) {
        console.error('Error fetching data:', error)
        // Set default data to prevent redirect loops
        setGuildsData({
          guilds: [],
          totalGuilds: 0,
          totalMembers: 0,
          hasSubscription: false,
          message: 'Failed to load subscription data'
        })
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchData()
      // Refresh every 30 seconds
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  const claimServer = async (serverId: string) => {
    if (!session?.user?.id) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.post(`${backendUrl}/api/user/${session.user.id}/claim-server`, {
        guildId: serverId
      })
      
      if (response.data.success) {
        // Refresh data
        window.location.reload()
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to claim server')
    }
  }

  const filteredAndSortedGuilds = guildsData?.guilds
    .filter(guild => 
      guild.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'members':
          return b.memberCount - a.memberCount
        case 'joined':
          return new Date(b.joined).getTime() - new Date(a.joined).getTime()
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    }) || []

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getBoostLevelIcon = (level: number) => {
    switch (level) {
      case 1: return '🥉'
      case 2: return '🥈'
      case 3: return '🥇'
      default: return ''
    }
  }

  if (status === 'loading' || loading) {
    return (
      <>
        <Navigation currentPage="servers" />
        <div className="container" style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <p style={{ fontSize: '1.5rem' }}>{t('common:loading')}</p>
        </div>
      </>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Navigation currentPage="servers" />
      
      <div className="container">
        <header style={{ marginBottom: '3rem', marginTop: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{t('servers:title')}</h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>{t('servers:description')}</p>
          </div>

          {guildsData && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '2rem',
              marginBottom: '2rem'
            }}>
              <div style={{ 
                textAlign: 'center',
                padding: '1rem',
                background: guildsData.hasSubscription ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: `1px solid rgba(${guildsData.hasSubscription ? '59, 130, 246' : '239, 68, 68'}, 0.2)`
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: guildsData.hasSubscription ? '#60a5fa' : '#f87171' }}>
                  {guildsData.totalGuilds.toLocaleString()}
                </div>
                <div style={{ opacity: 0.8 }}>{t('servers:managedServers')}</div>
              </div>
              
              {guildsData.hasSubscription && (
                <div style={{ 
                  textAlign: 'center',
                  padding: '1rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4ade80' }}>
                    {guildsData.totalMembers.toLocaleString()}
                  </div>
                  <div style={{ opacity: 0.8 }}>{t('servers:totalMembers')}</div>
                </div>
              )}
              
              {availableServers.length > 0 && (
                <div style={{ 
                  textAlign: 'center',
                  padding: '1rem',
                  background: 'rgba(255, 193, 7, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 193, 7, 0.2)'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24' }}>
                    {availableServers.length}
                  </div>
                  <div style={{ opacity: 0.8 }}>{t('servers:availableToClaim')}</div>
                </div>
              )}
            </div>
          )}

          {!guildsData?.hasSubscription && guildsData && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginBottom: '2rem'
            }}>
              <h3 style={{ color: '#f87171', marginBottom: '1rem' }}>
                🔒 {t('servers:subscriptionRequired')}
              </h3>
              <p style={{ opacity: 0.9, marginBottom: '1rem' }}>
                {guildsData.message}
              </p>
              <button 
                className="button"
                onClick={() => router.push('/payment')}
                style={{ background: '#059669' }}
              >
                {t('servers:subscribe')}
              </button>
            </div>
          )}
        </header>

        {/* Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            placeholder={t('servers:searchServers')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.95rem'
            }}
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'members' | 'joined')}
            style={{
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.95rem'
            }}
          >
            <option value="name">{t('servers:sortByName')}</option>
            <option value="members">{t('servers:sortByMembers')}</option>
            <option value="joined">{t('servers:sortByJoined')}</option>
          </select>
        </div>

        {/* Server Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {filteredAndSortedGuilds.map((guild) => (
            <div 
              key={guild.id} 
              className="card"
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: selectedGuild === guild.id ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedGuild === guild.id ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.05)'
              }}
              onClick={() => setSelectedGuild(selectedGuild === guild.id ? null : guild.id)}
              onMouseEnter={(e) => {
                if (selectedGuild !== guild.id) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedGuild !== guild.id) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                {guild.icon ? (
                  <img 
                    src={guild.icon}
                    alt={`${guild.name} icon`}
                    style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.2)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    {guild.name.charAt(0)}
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    marginBottom: '0.25rem' 
                  }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '1.2rem',
                      fontWeight: 'bold'
                    }}>
                      {guild.name}
                    </h3>
                    {guild.verified && <span title="Verified Server">✅</span>}
                    {guild.partnered && <span title="Partnered Server">🤝</span>}
                    {guild.boostLevel > 0 && (
                      <span title={`Boost Level ${guild.boostLevel}`}>
                        {getBoostLevelIcon(guild.boostLevel)}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ 
                    fontSize: '0.9rem', 
                    opacity: 0.7,
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <span>👥 {guild.memberCount.toLocaleString()}</span>
                    <span>📅 {formatDate(guild.joined)}</span>
                  </div>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                opacity: 0.8,
                marginBottom: '0.75rem'
              }}>
                <span>📺 {guild.channels.text} text</span>
                <span>🎤 {guild.channels.voice} voice</span>
                <span>🎭 {guild.roles} roles</span>
                <span>😀 {guild.emojis} emojis</span>
              </div>

              {selectedGuild === guild.id && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div><strong>{t('servers:serverId')}:</strong> <code>{guild.id}</code></div>
                    <div><strong>{t('servers:created')}:</strong> {formatDate(guild.createdAt)}</div>
                    <div><strong>{t('servers:totalChannels')}:</strong> {guild.channels.total}</div>
                    {guild.boostCount > 0 && (
                      <div><strong>{t('servers:boosts')}:</strong> {guild.boostCount}</div>
                    )}
                    {guild.features.length > 0 && (
                      <div>
                        <strong>{t('servers:features')}:</strong>
                        <div style={{ marginTop: '0.25rem' }}>
                          {guild.features.map(feature => (
                            <span 
                              key={feature}
                              style={{
                                display: 'inline-block',
                                margin: '0.125rem',
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(59, 130, 246, 0.2)',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                border: '1px solid rgba(59, 130, 246, 0.3)'
                              }}
                            >
                              {feature.replace(/_/g, ' ').toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredAndSortedGuilds.length === 0 && guildsData && guildsData.hasSubscription && (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem',
            opacity: 0.7
          }}>
            <p style={{ fontSize: '1.2rem' }}>
              {searchTerm ? t('servers:noServersFound') : t('servers:noServers')}
            </p>
          </div>
        )}

        {/* Available servers to claim */}
        {availableServers.length > 0 && guildsData?.hasSubscription && (
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{ 
              fontSize: '2rem', 
              marginBottom: '1.5rem',
              textAlign: 'center',
              color: '#fbbf24'
            }}>
              🎯 {t('servers:availableServers')}
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {availableServers.map((server) => (
                <div 
                  key={server.id} 
                  className="card"
                  style={{
                    background: 'rgba(255, 193, 7, 0.05)',
                    border: '1px solid rgba(255, 193, 7, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    {server.icon ? (
                      <img 
                        src={server.icon}
                        alt={`${server.name} icon`}
                        style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '50%',
                          border: '2px solid rgba(255, 193, 7, 0.3)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: 'white'
                      }}>
                        {server.name.charAt(0)}
                      </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{server.name}</h3>
                      <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                        👥 {server.memberCount.toLocaleString()} members
                      </div>
                    </div>
                  </div>
                  
                  <button
                    className="button"
                    onClick={() => claimServer(server.id)}
                    style={{ 
                      width: '100%',
                      background: '#fbbf24',
                      color: '#000'
                    }}
                  >
                    {t('servers:claimServer')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer style={{ 
          textAlign: 'center', 
          marginTop: '4rem', 
          padding: '2rem',
          opacity: 0.7
        }}>
          <p>{t('servers:footer')}</p>
        </footer>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'servers', 'navigation'])),
    },
  }
}