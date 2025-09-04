import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'

interface Server {
  id: string
  name: string
  icon?: string
  memberCount?: number
  isOnline?: boolean
  features?: string[]
  permissions?: string[]
  botJoinedAt?: string
}

interface ServerSelectorProps {
  selectedServerId?: string
  onServerSelect: (serverId: string, server: Server) => void
  showDetails?: boolean
  compact?: boolean
}

export default function ServerSelector({ 
  selectedServerId, 
  onServerSelect, 
  showDetails = true,
  compact = false 
}: ServerSelectorProps) {
  const { data: session } = useSession()
  const { t } = useTranslation(['common', 'admin'])
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedServer = servers.find(s => s.id === selectedServerId)
  const filteredServers = servers.filter(server => 
    server.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (session?.user?.id) {
      fetchServers()
    }
  }, [session])

  const fetchServers = async () => {
    try {
      setLoading(true)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await fetch(`${backendUrl}/api/user/guilds/${session?.user?.id}`)
      
      if (response.ok) {
        const data = await response.json()
        const serversWithDetails = await Promise.all(
          (data.guilds || []).map(async (guild: any) => {
            // Fetch additional server details
            try {
              const detailsResponse = await fetch(`${backendUrl}/api/guild/${guild.id}/details`)
              const details = detailsResponse.ok ? await detailsResponse.json() : {}
              
              return {
                id: guild.id,
                name: guild.name,
                icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : undefined,
                memberCount: details.memberCount || 0,
                isOnline: details.botOnline || false,
                features: details.features || [],
                permissions: details.permissions || [],
                botJoinedAt: details.botJoinedAt
              }
            } catch {
              return {
                id: guild.id,
                name: guild.name,
                icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : undefined,
                memberCount: 0,
                isOnline: false,
                features: [],
                permissions: []
              }
            }
          })
        )
        setServers(serversWithDetails)
        
        // Auto-select first server if none selected
        if (!selectedServerId && serversWithDetails.length > 0) {
          onServerSelect(serversWithDetails[0].id, serversWithDetails[0])
        }
      }
    } catch (error) {
      console.error('Error fetching servers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleServerSelect = (server: Server) => {
    onServerSelect(server.id, server)
    setIsOpen(false)
    setSearchTerm('')
  }

  const getServerStatusColor = (isOnline: boolean) => {
    return isOnline ? '#22C55E' : '#EF4444'
  }

  const formatMemberCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: compact ? '0.5rem' : '1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: 'rgba(255, 255, 255, 0.8)'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderTop: '2px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span>{t('common:loading')}</span>
      </div>
    )
  }

  if (servers.length === 0) {
    return (
      <div style={{
        padding: compact ? '0.5rem' : '1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '0.5rem' }}>🤖</div>
        <div>No servers found</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>
          Invite the bot to your Discord server first
        </div>
      </div>
    )
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Selected Server Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: compact ? '0.5rem 0.75rem' : '1rem',
          background: 'rgba(255, 255, 255, 0.1)',
          border: `1px solid ${isOpen ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(10px)'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
          }
        }}
      >
        {selectedServer ? (
          <>
            <div style={{ position: 'relative' }}>
              {selectedServer.icon ? (
                <img
                  src={selectedServer.icon}
                  alt={selectedServer.name}
                  style={{ 
                    width: compact ? '32px' : '40px', 
                    height: compact ? '32px' : '40px', 
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: compact ? '32px' : '40px',
                  height: compact ? '32px' : '40px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: compact ? '1.2rem' : '1.5rem',
                  fontWeight: 'bold'
                }}>
                  {selectedServer.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: getServerStatusColor(selectedServer.isOnline || false),
                border: '2px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
              }} />
            </div>
            
            <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: compact ? '0.9rem' : '1rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {selectedServer.name}
              </div>
              {showDetails && !compact && (
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.25rem'
                }}>
                  <span>👥 {formatMemberCount(selectedServer.memberCount || 0)}</span>
                  <span>•</span>
                  <span style={{ color: getServerStatusColor(selectedServer.isOnline || false) }}>
                    {selectedServer.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              )}
            </div>
            
            <div style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              fontSize: '1.2rem'
            }}>
              ▼
            </div>
          </>
        ) : (
          <>
            <div style={{
              width: compact ? '32px' : '40px',
              height: compact ? '32px' : '40px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              🏢
            </div>
            <div style={{ flex: 1, textAlign: 'left', opacity: 0.7 }}>
              Select a server...
            </div>
            <div style={{ fontSize: '1.2rem', opacity: 0.7 }}>▼</div>
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '0.5rem',
          background: 'rgba(31, 41, 55, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          zIndex: 1000
        }}>
          {/* Search */}
          {servers.length > 5 && (
            <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <input
                type="text"
                placeholder="Search servers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Server List */}
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {filteredServers.map((server) => (
              <button
                key={server.id}
                onClick={() => handleServerSelect(server)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: selectedServerId === server.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (selectedServerId !== server.id) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedServerId !== server.id) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <div style={{ position: 'relative' }}>
                  {server.icon ? (
                    <img
                      src={server.icon}
                      alt={server.name}
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '8px',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 'bold'
                    }}>
                      {server.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: getServerStatusColor(server.isOnline || false),
                    border: '2px solid rgba(255, 255, 255, 0.8)'
                  }} />
                </div>
                
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '0.95rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {server.name}
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: 'rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.25rem'
                  }}>
                    <span>👥 {formatMemberCount(server.memberCount || 0)}</span>
                    <span>•</span>
                    <span style={{ color: getServerStatusColor(server.isOnline || false) }}>
                      {server.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {selectedServerId === server.id && (
                  <div style={{ color: '#22C55E', fontSize: '1.2rem' }}>
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredServers.length === 0 && (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
              <div>No servers found</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Try adjusting your search terms
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}