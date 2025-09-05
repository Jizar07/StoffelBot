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
  
  // Modal states
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false)
  const [showEditRoleModal, setShowEditRoleModal] = useState(false)
  const [showUserActionsModal, setShowUserActionsModal] = useState(false)
  
  // Form states
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#99AAB5')
  const [newRoleHoisted, setNewRoleHoisted] = useState(false)
  const [newRoleMentionable, setNewRoleMentionable] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

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

  // Role management functions
  const handleCreateRole = async () => {
    if (!selectedServerId || !newRoleName.trim()) return
    
    setActionLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.post(`${backendUrl}/api/guild/${selectedServerId}/roles`, {
        name: newRoleName.trim(),
        color: newRoleColor,
        hoisted: newRoleHoisted,
        mentionable: newRoleMentionable,
        permissions: []
      })
      
      if (response.data.success) {
        // Refresh roles list
        await fetchRoles()
        // Reset form
        setNewRoleName('')
        setNewRoleColor('#99AAB5')
        setNewRoleHoisted(false)
        setNewRoleMentionable(false)
        setShowCreateRoleModal(false)
        alert('Role created successfully!')
      }
    } catch (error) {
      console.error('Failed to create role:', error)
      alert('Failed to create role. Please try again.')
    }
    setActionLoading(false)
  }

  const handleDeleteRole = async (role: Role) => {
    if (!selectedServerId || !confirm(`Are you sure you want to delete the role "${role.name}"?`)) return
    
    setActionLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      await axios.delete(`${backendUrl}/api/guild/${selectedServerId}/roles/${role.id}`)
      
      // Refresh roles list
      await fetchRoles()
      alert('Role deleted successfully!')
    } catch (error) {
      console.error('Failed to delete role:', error)
      alert('Failed to delete role. Please try again.')
    }
    setActionLoading(false)
  }

  const handleKickUser = async (user: User) => {
    if (!selectedServerId || !confirm(`Are you sure you want to kick ${user.username}?`)) return
    
    setActionLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const reason = prompt('Enter reason for kick (optional):') || 'No reason provided'
      
      await axios.post(`${backendUrl}/api/guild/${selectedServerId}/members/${user.id}/kick`, {
        reason
      })
      
      // Refresh users list
      await fetchUsers()
      alert(`${user.username} has been kicked from the server.`)
    } catch (error) {
      console.error('Failed to kick user:', error)
      alert('Failed to kick user. Please try again.')
    }
    setActionLoading(false)
  }

  const handleBanUser = async (user: User) => {
    if (!selectedServerId || !confirm(`Are you sure you want to ban ${user.username}?`)) return
    
    setActionLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const reason = prompt('Enter reason for ban (optional):') || 'No reason provided'
      
      await axios.post(`${backendUrl}/api/guild/${selectedServerId}/members/${user.id}/ban`, {
        reason,
        deleteMessageDays: 1
      })
      
      // Refresh users list
      await fetchUsers()
      alert(`${user.username} has been banned from the server.`)
    } catch (error) {
      console.error('Failed to ban user:', error)
      alert('Failed to ban user. Please try again.')
    }
    setActionLoading(false)
  }

  const handleTimeoutUser = async (user: User) => {
    if (!selectedServerId) return
    
    const durationOptions = [
      { label: '5 minutes', value: 5 * 60 * 1000 },
      { label: '10 minutes', value: 10 * 60 * 1000 },
      { label: '1 hour', value: 60 * 60 * 1000 },
      { label: '1 day', value: 24 * 60 * 60 * 1000 },
      { label: '1 week', value: 7 * 24 * 60 * 60 * 1000 }
    ]
    
    const choice = prompt(`Select timeout duration for ${user.username}:\n` + 
      durationOptions.map((opt, i) => `${i + 1}. ${opt.label}`).join('\n') + 
      '\nEnter number (1-5):')
    
    const choiceIndex = parseInt(choice || '0') - 1
    if (choiceIndex < 0 || choiceIndex >= durationOptions.length) return
    
    setActionLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const reason = prompt('Enter reason for timeout (optional):') || 'No reason provided'
      
      await axios.post(`${backendUrl}/api/guild/${selectedServerId}/members/${user.id}/timeout`, {
        duration: durationOptions[choiceIndex].value,
        reason
      })
      
      // Refresh users list
      await fetchUsers()
      alert(`${user.username} has been timed out for ${durationOptions[choiceIndex].label}.`)
    } catch (error) {
      console.error('Failed to timeout user:', error)
      alert('Failed to timeout user. Please try again.')
    }
    setActionLoading(false)
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
                  <button 
                    onClick={() => setShowCreateRoleModal(true)}
                    disabled={actionLoading}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      opacity: actionLoading ? 0.5 : 1
                    }}
                  >
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
                          
                          {/* Action Buttons */}
                          <button
                            onClick={() => handleDeleteRole(role)}
                            disabled={role.managed || actionLoading}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: role.managed ? 'rgba(156, 163, 175, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              border: role.managed ? '1px solid rgba(156, 163, 175, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: role.managed ? '#9CA3AF' : '#F87171',
                              cursor: role.managed || actionLoading ? 'not-allowed' : 'pointer',
                              opacity: actionLoading ? 0.5 : 1
                            }}
                          >
                            🗑️ Delete
                          </button>
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
                        
                        {/* Moderation Actions */}
                        {!user.isBot && (
                          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '1rem' }}>
                            <button
                              onClick={() => handleTimeoutUser(user)}
                              disabled={actionLoading}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(251, 191, 36, 0.2)',
                                border: '1px solid rgba(251, 191, 36, 0.4)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                color: '#FCD34D',
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                                opacity: actionLoading ? 0.5 : 1
                              }}
                            >
                              ⏰ Timeout
                            </button>
                            <button
                              onClick={() => handleKickUser(user)}
                              disabled={actionLoading}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(249, 115, 22, 0.2)',
                                border: '1px solid rgba(249, 115, 22, 0.4)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                color: '#FB923C',
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                                opacity: actionLoading ? 0.5 : 1
                              }}
                            >
                              👢 Kick
                            </button>
                            <button
                              onClick={() => handleBanUser(user)}
                              disabled={actionLoading}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                color: '#F87171',
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                                opacity: actionLoading ? 0.5 : 1
                              }}
                            >
                              🔨 Ban
                            </button>
                          </div>
                        )}
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

      {/* Create Role Modal */}
      {showCreateRoleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>Create New Role</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'rgba(255, 255, 255, 0.8)', display: 'block', marginBottom: '0.5rem' }}>
                Role Name
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Enter role name..."
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

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'rgba(255, 255, 255, 0.8)', display: 'block', marginBottom: '0.5rem' }}>
                Role Color
              </label>
              <input
                type="color"
                value={newRoleColor}
                onChange={(e) => setNewRoleColor(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
              <label style={{ color: 'rgba(255, 255, 255, 0.8)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newRoleHoisted}
                  onChange={(e) => setNewRoleHoisted(e.target.checked)}
                />
                Display separately (Hoisted)
              </label>
            </div>

            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
              <label style={{ color: 'rgba(255, 255, 255, 0.8)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newRoleMentionable}
                  onChange={(e) => setNewRoleMentionable(e.target.checked)}
                />
                Allow mentioning
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateRoleModal(false)}
                disabled={actionLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(156, 163, 175, 0.2)',
                  border: '1px solid rgba(156, 163, 175, 0.4)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={actionLoading || !newRoleName.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: !newRoleName.trim() || actionLoading ? 'rgba(156, 163, 175, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                  border: !newRoleName.trim() || actionLoading ? '1px solid rgba(156, 163, 175, 0.4)' : '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '8px',
                  color: !newRoleName.trim() || actionLoading ? '#9CA3AF' : '#4ADE80',
                  cursor: !newRoleName.trim() || actionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem'
                }}
              >
                {actionLoading ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export const getStaticProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'admin', 'navigation']))
  }
})