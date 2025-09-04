import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import AdminLayout from '../../components/AdminLayout'
import ServerSelector from '../../components/ServerSelector'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

interface CustomCommand {
  id: string
  name: string
  description: string
  type: 'text' | 'embed' | 'role' | 'reaction' | 'advanced'
  enabled: boolean
  permissions: string[]
  response: {
    content?: string
    embed?: {
      title?: string
      description?: string
      color?: string
      thumbnail?: string
      image?: string
      fields?: Array<{ name: string; value: string; inline?: boolean }>
    }
    actions?: Array<{
      type: 'add_role' | 'remove_role' | 'send_dm' | 'timeout'
      target: string
      value: string
    }>
  }
  cooldown: number
  usageCount: number
  createdAt: string
  lastUsed?: string
}

interface ServerInfo {
  id: string
  name: string
  icon?: string
  memberCount?: number
  isOnline?: boolean
}

export default function CustomCommands() {
  const { data: session } = useSession()
  const { t } = useTranslation(['common', 'admin'])
  const router = useRouter()
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null)
  const [commands, setCommands] = useState<CustomCommand[]>([])
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'templates'>('list')
  const [loading, setLoading] = useState(false)
  const [selectedCommand, setSelectedCommand] = useState<CustomCommand | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form state for creating/editing commands
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'text' as const,
    enabled: true,
    permissions: [],
    response: {
      content: '',
      embed: {
        title: '',
        description: '',
        color: '#5865F2',
        fields: []
      },
      actions: []
    },
    cooldown: 0
  })

  useEffect(() => {
    if (selectedServerId) {
      fetchCommands()
    }
  }, [selectedServerId])

  const fetchCommands = async () => {
    if (!selectedServerId) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/admin/commands/${selectedServerId}`)
      if (response.data.commands) {
        setCommands(response.data.commands)
      }
    } catch (error) {
      console.error('Failed to fetch commands:', error)
    }
    setLoading(false)
  }

  const handleCreateCommand = async () => {
    if (!selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      await axios.post(`${backendUrl}/api/admin/commands/${selectedServerId}`, {
        command: formData,
        userId: session?.user?.id,
        userName: session?.user?.name
      })
      
      fetchCommands() // Refresh the list
      setFormData({
        name: '',
        description: '',
        type: 'text',
        enabled: true,
        permissions: [],
        response: {
          content: '',
          embed: {
            title: '',
            description: '',
            color: '#5865F2',
            fields: []
          },
          actions: []
        },
        cooldown: 0
      })
      setActiveTab('list')
    } catch (error) {
      console.error('Failed to create command:', error)
    }
  }

  const handleDeleteCommand = async (commandId: string) => {
    if (confirm('Are you sure you want to delete this command?')) {
      setCommands(commands.filter(cmd => cmd.id !== commandId))
    }
  }

  const commandTemplates = [
    {
      name: 'Welcome Message',
      description: 'Send a welcoming embed to new members',
      type: 'embed' as const,
      template: {
        name: 'welcome',
        description: 'Send a welcome message',
        response: {
          embed: {
            title: '👋 Welcome!',
            description: 'Welcome to **{{server_name}}**! We\'re glad to have you here.',
            color: '#00FF00',
            fields: [
              { name: '📋 Rules', value: 'Please read our rules in #rules', inline: true },
              { name: '💬 Chat', value: 'Join the conversation in #general', inline: true }
            ]
          }
        }
      }
    },
    {
      name: 'Server Info',
      description: 'Display server statistics and information',
      type: 'embed' as const,
      template: {
        name: 'serverinfo',
        description: 'Display server information',
        response: {
          embed: {
            title: '🏠 Server Information',
            description: 'Information about **{{server_name}}**',
            color: '#5865F2',
            fields: [
              { name: '👥 Members', value: '{{member_count}}', inline: true },
              { name: '📅 Created', value: '{{server_created}}', inline: true },
              { name: '👑 Owner', value: '{{server_owner}}', inline: true }
            ]
          }
        }
      }
    },
    {
      name: 'Give Role',
      description: 'Give a role to the user who runs the command',
      type: 'role' as const,
      template: {
        name: 'getrole',
        description: 'Get a specific role',
        response: {
          content: 'Role added successfully!',
          actions: [
            { type: 'add_role', target: 'user', value: 'role_id_here' }
          ]
        }
      }
    }
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '💬'
      case 'embed': return '📋'
      case 'role': return '👥'
      case 'reaction': return '🎭'
      case 'advanced': return '⚙️'
      default: return '📄'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text': return '#10B981'
      case 'embed': return '#3B82F6'
      case 'role': return '#F59E0B'
      case 'reaction': return '#EF4444'
      case 'advanced': return '#8B5CF6'
      default: return '#6B7280'
    }
  }

  const handleServerSelect = (serverId: string, server: ServerInfo) => {
    setSelectedServerId(serverId)
    setSelectedServer(server)
  }

  return (
    <AdminLayout 
      currentPage="commands"
      title="Custom Commands"
      description="Create and manage custom slash commands for your server"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Server Selector */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>
            Select Server
          </h3>
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '1rem'
            }}
          >
            <option value="">Select a server...</option>
            <option value="guild1">Test Server #1</option>
            <option value="guild2">Test Server #2</option>
          </select>
        </div>

        {selectedServer && (
          <>
            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: '1rem'
            }}>
              {[
                { key: 'list', label: 'Commands', icon: '📋' },
                { key: 'create', label: 'Create New', icon: '➕' },
                { key: 'templates', label: 'Templates', icon: '🔖' }
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

            {/* Commands List Tab */}
            {activeTab === 'list' && (
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
                    Custom Commands ({commands.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('create')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    + Create Command
                  </button>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', padding: '2rem' }}>
                    Loading commands...
                  </div>
                ) : commands.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', padding: '2rem' }}>
                    <p>No custom commands created yet.</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        marginTop: '1rem'
                      }}
                    >
                      Create Your First Command
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {commands.map((command) => (
                      <div
                        key={command.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            fontSize: '1.5rem',
                            background: getTypeColor(command.type),
                            padding: '0.5rem',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px'
                          }}>
                            {getTypeIcon(command.type)}
                          </div>
                          
                          <div>
                            <div style={{
                              color: 'white',
                              fontWeight: 'bold',
                              marginBottom: '0.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              /{command.name}
                              {!command.enabled && (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  color: '#F87171'
                                }}>
                                  Disabled
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontSize: '0.85rem',
                              color: 'rgba(255, 255, 255, 0.7)',
                              marginBottom: '0.25rem'
                            }}>
                              {command.description}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'rgba(255, 255, 255, 0.5)'
                            }}>
                              Used {command.usageCount} times • 
                              {command.lastUsed ? ` Last used ${new Date(command.lastUsed).toLocaleDateString()}` : ' Never used'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(59, 130, 246, 0.2)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              borderRadius: '4px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                            onClick={() => {
                              setSelectedCommand(command)
                              setIsEditing(true)
                              setActiveTab('create')
                            }}
                          >
                            Edit
                          </button>
                          <button
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '4px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                            onClick={() => handleDeleteCommand(command.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create/Edit Command Tab */}
            {activeTab === 'create' && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>
                  {isEditing ? 'Edit Command' : 'Create New Command'}
                </h3>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {/* Basic Information */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                        Command Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="welcome"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'white'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                        Command Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'white'
                        }}
                      >
                        <option value="text">💬 Simple Text</option>
                        <option value="embed">📋 Rich Embed</option>
                        <option value="role">👥 Role Management</option>
                        <option value="reaction">🎭 Reaction Role</option>
                        <option value="advanced">⚙️ Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                      Description *
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Send a welcome message to new members"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white'
                      }}
                    />
                  </div>

                  {/* Response Configuration */}
                  {formData.type === 'text' && (
                    <div>
                      <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                        Response Message *
                      </label>
                      <textarea
                        value={formData.response.content}
                        onChange={(e) => setFormData({
                          ...formData,
                          response: { ...formData.response, content: e.target.value }
                        })}
                        placeholder="Enter the message to send when this command is used..."
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}

                  {formData.type === 'embed' && (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                            Embed Title
                          </label>
                          <input
                            type="text"
                            value={formData.response.embed?.title || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              response: {
                                ...formData.response,
                                embed: { ...formData.response.embed, title: e.target.value }
                              }
                            })}
                            placeholder="Welcome to the server!"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: 'white'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                            Color
                          </label>
                          <input
                            type="color"
                            value={formData.response.embed?.color || '#5865F2'}
                            onChange={(e) => setFormData({
                              ...formData,
                              response: {
                                ...formData.response,
                                embed: { ...formData.response.embed, color: e.target.value }
                              }
                            })}
                            style={{
                              width: '100%',
                              height: '42px',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.1)'
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                          Embed Description
                        </label>
                        <textarea
                          value={formData.response.embed?.description || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            response: {
                              ...formData.response,
                              embed: { ...formData.response.embed, description: e.target.value }
                            }
                          })}
                          placeholder="Welcome message description..."
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Settings */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                        Cooldown (seconds)
                      </label>
                      <input
                        type="number"
                        value={formData.cooldown}
                        onChange={(e) => setFormData({ ...formData, cooldown: parseInt(e.target.value) || 0 })}
                        min="0"
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'white'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.enabled}
                          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                          style={{ marginRight: '0.5rem' }}
                        />
                        Command Enabled
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      onClick={() => {
                        setActiveTab('list')
                        setIsEditing(false)
                        setSelectedCommand(null)
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(156, 163, 175, 0.2)',
                        border: '1px solid rgba(156, 163, 175, 0.4)',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleCreateCommand}
                      disabled={!formData.name || !formData.description}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: formData.name && formData.description 
                          ? 'rgba(34, 197, 94, 0.2)' 
                          : 'rgba(156, 163, 175, 0.2)',
                        border: `1px solid ${formData.name && formData.description 
                          ? 'rgba(34, 197, 94, 0.4)' 
                          : 'rgba(156, 163, 175, 0.4)'}`,
                        borderRadius: '6px',
                        color: 'white',
                        cursor: formData.name && formData.description ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {isEditing ? 'Update Command' : 'Create Command'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Command Templates</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  {commandTemplates.map((template, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        padding: '1.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                      onClick={() => {
                        setFormData({
                          ...template.template,
                          type: template.type,
                          enabled: true,
                          permissions: [],
                          cooldown: 0
                        })
                        setActiveTab('create')
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          fontSize: '1.5rem',
                          background: getTypeColor(template.type),
                          padding: '0.5rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '40px',
                          height: '40px'
                        }}>
                          {getTypeIcon(template.type)}
                        </div>
                        <div>
                          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {template.name}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {template.description}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          borderRadius: '6px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Use This Template
                      </button>
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