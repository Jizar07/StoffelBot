import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'
import AdminLayout from '../../components/AdminLayout'
import ServerSelector from '../../components/ServerSelector'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

interface Role {
  id: string
  name: string
  color: string
  position: number
  permissions: string[]
  mentionable: boolean
  hoisted: boolean
  managed: boolean
  memberCount: number
  createdAt: string
}

interface User {
  id: string
  username: string
  discriminator: string
  avatar: string
  nickname?: string
  roles: string[]
  joinedAt: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
  isBot: boolean
}

interface ServerInfo {
  id: string
  name: string
  icon?: string
  memberCount?: number
  isOnline?: boolean
}

export default function RolesManagement() {
  const { t } = useTranslation(['common', 'admin'])
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'permissions'>('roles')
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    if (selectedServerId) {
      fetchRoles()
      if (activeTab === 'users') {
        fetchUsers()
      }
    }
  }, [selectedServerId, activeTab])

  const fetchRoles = async () => {
    if (!selectedServerId) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/guild/${selectedServerId}/roles`)
      if (response.data.roles) {
        setRoles(response.data.roles)
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    }
    setLoading(false)
  }

  const fetchUsers = async () => {
    if (!selectedServerId) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/guild/${selectedServerId}/members`)
      if (response.data.members) {
        setUsers(response.data.members)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
    setLoading(false)
  }

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.nickname && user.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#43B581'
      case 'idle': return '#FAA61A'
      case 'dnd': return '#F04747'
      default: return '#747F8D'
    }
  }

  const formatPermissions = (permissions: string[]) => {
    return permissions.slice(0, 5).join(', ') + (permissions.length > 5 ? ` +${permissions.length - 5} more` : '')
  }

  return (
    <AdminLayout 
      currentPage="roles"
      title={t('admin:navigation.roles')}
      description={selectedServer ? `Manage roles and users for ${selectedServer.name}` : "Manage server roles, users, and permissions"}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Server Selector */}
        <div style={{ maxWidth: '500px' }}>
          <ServerSelector
            selectedServerId={selectedServerId}
            onServerSelect={(serverId: string, server: ServerInfo) => {
              setSelectedServerId(serverId)
              setSelectedServer(server)
            }}
            showDetails={true}
            compact
          />
        </div>

        {selectedServerId && (
          <>
            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: '1rem'
            }}>
              {[
                { key: 'roles', label: 'Roles', icon: '👥' },
                { key: 'users', label: 'Users', icon: '👤' },
                { key: 'permissions', label: 'Permissions', icon: '🔑' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    padding: '1rem 1.5rem',
                    background: activeTab === tab.key ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid #3B82F6' : '2px solid transparent',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1rem'
            }}>
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
            </div>

            {/* Content Based on Active Tab */}
            {activeTab === 'roles' && (
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
                  <h3 style={{ color: 'white', margin: 0 }}>Server Roles ({filteredRoles.length})</h3>
                  <button style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer'
                  }}>
                    + Create Role
                  </button>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', padding: '2rem' }}>
                    Loading roles...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredRoles.map((role) => (
                      <div
                        key={role.id}
                        onClick={() => setSelectedRole(role)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: role.color || '#99AAB5'
                            }}
                          />
                          <div>
                            <div style={{ 
                              color: role.color || 'white', 
                              fontWeight: 'bold',
                              marginBottom: '0.25rem'
                            }}>
                              {role.name}
                            </div>
                            <div style={{ 
                              fontSize: '0.85rem', 
                              color: 'rgba(255, 255, 255, 0.6)' 
                            }}>
                              {role.memberCount} members • {role.permissions.length} permissions
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {role.hoisted && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(59, 130, 246, 0.2)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#60A5FA'
                            }}>
                              Hoisted
                            </span>
                          )}
                          {role.mentionable && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(34, 197, 94, 0.2)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#4ADE80'
                            }}>
                              Mentionable
                            </span>
                          )}
                          {role.managed && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(156, 163, 175, 0.2)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#9CA3AF'
                            }}>
                              Managed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
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
                  <h3 style={{ color: 'white', margin: 0 }}>Server Members ({filteredUsers.length})</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer'
                    }}>
                      Export List
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold'
                          }}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: getStatusColor(user.status),
                            border: '2px solid rgba(17, 24, 39, 0.95)'
                          }} />
                        </div>
                        
                        <div>
                          <div style={{ 
                            color: 'white', 
                            fontWeight: 'bold',
                            marginBottom: '0.25rem'
                          }}>
                            {user.nickname || user.username}
                            {user.nickname && (
                              <span style={{ 
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontWeight: 'normal',
                                marginLeft: '0.5rem'
                              }}>
                                ({user.username})
                              </span>
                            )}
                          </div>
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: 'rgba(255, 255, 255, 0.6)' 
                          }}>
                            {user.roles.length} roles • Joined {new Date(user.joinedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {user.isBot && (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(88, 101, 242, 0.2)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: '#5865F2'
                          }}>
                            BOT
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.75rem',
                          color: getStatusColor(user.status),
                          textTransform: 'capitalize'
                        }}>
                          {user.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Permission Overview</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  {roles.slice(0, 6).map((role) => (
                    <div
                      key={role.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        padding: '1rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: role.color || '#99AAB5'
                          }}
                        />
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{role.name}</span>
                      </div>
                      
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: 'rgba(255, 255, 255, 0.7)',
                        lineHeight: '1.4'
                      }}>
                        {formatPermissions(role.permissions)}
                      </div>
                      
                      <div style={{ 
                        marginTop: '0.75rem',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}>
                        {role.memberCount} members
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}

export const getStaticProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'admin', 'navigation']))
  }
})