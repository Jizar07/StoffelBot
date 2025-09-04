import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import AdminLayout from '../../components/AdminLayout'
import ServerSelector from '../../components/ServerSelector'
import axios from 'axios'

interface RegistrationFunction {
  id: string
  displayName: string
  discordRoleId: string
  discordRoleName: string
  description?: string
  order: number
  active: boolean
  categoryId?: string
  categoryName?: string
  channelEmojiPrefix?: string
}

interface RegistrationConfig {
  enabled: boolean
  guildId?: string
  channelId?: string
  functions: RegistrationFunction[]
  settings: {
    oneTimeOnly: boolean
    requiresVerification: boolean
    welcomeMessage: string
    embedColor: string
    serverIP?: string
    serverPort?: string
  }
  command: {
    name: string
    description: string
    permissions: string
  }
  formDisplay: {
    title: string
    description: string
    footerText: string
    embedColor: string
    button: {
      text: string
      emoji: string
      style: string
    }
  }
  postRegistration: {
    nicknameFormat: string
    sendDM: boolean
    dmMessage: string
    assignRoles: boolean
    createChannel: boolean
    channelNameFormat: string
    channelCategoryId?: string
  }
}

interface UserRegistration {
  userId: string
  username: string
  name: string
  identifier: string
  functionId: string
  functionName: string
  approved: boolean
  registeredAt: string
}

interface Role {
  id: string
  name: string
  color: string
}

interface Channel {
  id: string
  name: string
  type: string
}

interface ServerInfo {
  id: string
  name: string
  icon?: string
  memberCount?: number
  isOnline?: boolean
}

export default function RegistrationManagement() {
  const { data: session } = useSession()
  const { t } = useTranslation(['common', 'admin', 'registration'])
  
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null)
  const [config, setConfig] = useState<RegistrationConfig>({
    enabled: false,
    functions: [],
    settings: {
      oneTimeOnly: true,
      requiresVerification: false,
      welcomeMessage: 'Welcome to the server! Please complete registration.',
      embedColor: '#3B82F6'
    },
    command: {
      name: 'register',
      description: 'Register for server functions',
      permissions: 'everyone'
    },
    formDisplay: {
      title: 'Server Registration',
      description: 'Please select your function to complete registration.',
      footerText: 'Select carefully - this cannot be changed later.',
      embedColor: '#3B82F6',
      button: {
        text: 'Register Now',
        emoji: '📝',
        style: 'primary'
      }
    },
    postRegistration: {
      nicknameFormat: '[{function}] {name}',
      sendDM: true,
      dmMessage: 'Welcome! Your registration has been approved.',
      assignRoles: true,
      createChannel: false,
      channelNameFormat: '{function}-{name}'
    }
  })
  const [roles, setRoles] = useState<Role[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [registrations, setRegistrations] = useState<UserRegistration[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'functions' | 'display' | 'registrations'>('settings')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Function form state
  const [showFunctionForm, setShowFunctionForm] = useState(false)
  const [editingFunction, setEditingFunction] = useState<RegistrationFunction | null>(null)
  const [functionForm, setFunctionForm] = useState<Partial<RegistrationFunction>>({
    displayName: '',
    description: '',
    discordRoleId: '',
    active: true
  })

  useEffect(() => {
    if (selectedServerId) {
      fetchConfig()
      fetchRoles()
      fetchChannels()
      fetchRegistrations()
    }
  }, [selectedServerId])

  const fetchConfig = async () => {
    if (!selectedServerId) return
    
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/admin/registration/${selectedServerId}`)
      if (response.data.config) {
        setConfig({ ...config, ...response.data.config })
      }
    } catch (error) {
      console.error('Error fetching registration config:', error)
      setMessage({ type: 'error', text: 'Failed to load registration configuration' })
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

  const fetchRegistrations = async () => {
    if (!selectedServerId) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      const response = await axios.get(`${backendUrl}/api/admin/registration/${selectedServerId}/registrations`)
      if (response.data.registrations) {
        setRegistrations(response.data.registrations)
      }
    } catch (error) {
      console.error('Error fetching registrations:', error)
    }
  }

  const saveConfig = async () => {
    if (!selectedServerId) return
    
    setSaving(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      await axios.post(`${backendUrl}/api/admin/registration/${selectedServerId}`, {
        config: config,
        userId: session?.user?.id,
        userName: session?.user?.name
      })
      
      setMessage({ type: 'success', text: 'Registration configuration saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving registration config:', error)
      setMessage({ type: 'error', text: 'Failed to save registration configuration' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const addFunction = () => {
    if (!functionForm.displayName || !functionForm.discordRoleId) {
      setMessage({ type: 'error', text: 'Display name and Discord role are required' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const selectedRole = roles.find(r => r.id === functionForm.discordRoleId)
    const newFunction: RegistrationFunction = {
      id: editingFunction?.id || `func_${Date.now()}`,
      displayName: functionForm.displayName!,
      discordRoleId: functionForm.discordRoleId!,
      discordRoleName: selectedRole?.name || '',
      description: functionForm.description || '',
      order: editingFunction?.order || config.functions.length,
      active: functionForm.active !== undefined ? functionForm.active : true,
      categoryId: functionForm.categoryId,
      channelEmojiPrefix: functionForm.channelEmojiPrefix
    }

    if (editingFunction) {
      setConfig(prev => ({
        ...prev,
        functions: prev.functions.map(f => f.id === editingFunction.id ? newFunction : f)
      }))
      setMessage({ type: 'success', text: 'Function updated!' })
    } else {
      setConfig(prev => ({
        ...prev,
        functions: [...prev.functions, newFunction]
      }))
      setMessage({ type: 'success', text: 'Function added!' })
    }

    setShowFunctionForm(false)
    setEditingFunction(null)
    setFunctionForm({ displayName: '', description: '', discordRoleId: '', active: true })
    setTimeout(() => setMessage(null), 3000)
  }

  const deleteFunction = (functionId: string) => {
    if (!confirm('Are you sure you want to delete this function?')) return

    setConfig(prev => ({
      ...prev,
      functions: prev.functions.filter(f => f.id !== functionId)
    }))
    setMessage({ type: 'success', text: 'Function deleted!' })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleServerSelect = (serverId: string, server: ServerInfo) => {
    setSelectedServerId(serverId)
    setSelectedServer(server)
  }

  const updateConfig = <K extends keyof RegistrationConfig>(key: K, value: RegistrationConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const updateSettings = <K extends keyof RegistrationConfig['settings']>(key: K, value: RegistrationConfig['settings'][K]) => {
    setConfig(prev => ({ 
      ...prev, 
      settings: { ...prev.settings, [key]: value }
    }))
  }

  const updateFormDisplay = <K extends keyof RegistrationConfig['formDisplay']>(key: K, value: RegistrationConfig['formDisplay'][K]) => {
    setConfig(prev => ({ 
      ...prev, 
      formDisplay: { ...prev.formDisplay, [key]: value }
    }))
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

  if (!selectedServerId) {
    return (
      <AdminLayout 
        currentPage="registration"
        title="📝 Registration System"
        description="Configure server registration and role assignment"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          padding: '4rem 2rem'
        }}>
          <div style={{ fontSize: '4rem' }}>📝</div>
          <div style={{
            textAlign: 'center',
            color: 'white'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Select a Server
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
              Choose a server to configure its registration system
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
      currentPage="registration"
      title="📝 Registration System"
      description={`Configure registration for ${selectedServer?.name}`}
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
          <TabButton tab="settings" label="Settings" icon="⚙️" />
          <TabButton tab="functions" label="Functions" icon="🎭" />
          <TabButton tab="display" label="Display" icon="🎨" />
          <TabButton tab="registrations" label="Registrations" icon="📊" />
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
            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <ConfigSection 
                  title="Registration System"
                  description="Enable or disable the registration system for this server"
                >
                  <ToggleSwitch
                    checked={config.enabled}
                    onChange={(checked) => updateConfig('enabled', checked)}
                    label="Enable Registration System"
                    description="Allow users to register for server functions and roles"
                  />
                </ConfigSection>

                <ConfigSection 
                  title="Registration Channel"
                  description="Choose where registration commands should work"
                >
                  <div>
                    <select
                      value={config.channelId || ''}
                      onChange={(e) => updateConfig('channelId', e.target.value || undefined)}
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
                      <option value="">All channels</option>
                      {channels.map(channel => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </ConfigSection>

                <ConfigSection 
                  title="Registration Options"
                  description="Configure how the registration system behaves"
                >
                  <ToggleSwitch
                    checked={config.settings.oneTimeOnly}
                    onChange={(checked) => updateSettings('oneTimeOnly', checked)}
                    label="One-Time Registration Only"
                    description="Prevent users from registering multiple times"
                  />

                  <ToggleSwitch
                    checked={config.settings.requiresVerification}
                    onChange={(checked) => updateSettings('requiresVerification', checked)}
                    label="Require Verification"
                    description="Require manual approval for registrations"
                  />

                  <ToggleSwitch
                    checked={config.postRegistration.assignRoles}
                    onChange={(checked) => setConfig(prev => ({
                      ...prev,
                      postRegistration: { ...prev.postRegistration, assignRoles: checked }
                    }))}
                    label="Auto-Assign Roles"
                    description="Automatically assign roles upon registration"
                  />

                  <ToggleSwitch
                    checked={config.postRegistration.sendDM}
                    onChange={(checked) => setConfig(prev => ({
                      ...prev,
                      postRegistration: { ...prev.postRegistration, sendDM: checked }
                    }))}
                    label="Send Welcome DM"
                    description="Send a direct message to users after registration"
                  />

                  <ToggleSwitch
                    checked={config.postRegistration.createChannel}
                    onChange={(checked) => setConfig(prev => ({
                      ...prev,
                      postRegistration: { ...prev.postRegistration, createChannel: checked }
                    }))}
                    label="Create Personal Channel"
                    description="Create a private channel for each registered user"
                  />
                </ConfigSection>
              </div>
            )}

            {/* Functions Tab */}
            {activeTab === 'functions' && (
              <div>
                <ConfigSection 
                  title="Registration Functions"
                  description="Define the roles and functions users can register for"
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>
                      Functions ({config.functions.length})
                    </span>
                    <button
                      onClick={() => setShowFunctionForm(true)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      + Add Function
                    </button>
                  </div>

                  {config.functions.map((func, index) => (
                    <div
                      key={func.id}
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
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: roles.find(r => r.id === func.discordRoleId)?.color || '#99AAB5'
                        }} />
                        <div>
                          <div style={{ color: 'white', fontWeight: 'bold' }}>
                            {func.displayName}
                          </div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                            Role: {func.discordRoleName} {func.description && `• ${func.description}`}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {!func.active && (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(156, 163, 175, 0.2)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: '#9CA3AF'
                          }}>
                            Inactive
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditingFunction(func)
                            setFunctionForm(func)
                            setShowFunctionForm(true)
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteFunction(func.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {config.functions.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.6)',
                      padding: '3rem 1rem'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎭</div>
                      <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No functions configured</div>
                      <div style={{ fontSize: '0.9rem' }}>
                        Add functions to allow users to register for different roles
                      </div>
                    </div>
                  )}
                </ConfigSection>

                {/* Function Form Modal */}
                {showFunctionForm && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                  }}>
                    <div style={{
                      background: 'rgba(31, 41, 55, 0.95)',
                      borderRadius: '12px',
                      padding: '2rem',
                      maxWidth: '500px',
                      width: '90%',
                      maxHeight: '80vh',
                      overflow: 'auto'
                    }}>
                      <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>
                        {editingFunction ? 'Edit Function' : 'Add New Function'}
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                            Display Name *
                          </label>
                          <input
                            type="text"
                            value={functionForm.displayName || ''}
                            onChange={(e) => setFunctionForm(prev => ({ ...prev, displayName: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px',
                              color: 'white'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                            Discord Role *
                          </label>
                          <select
                            value={functionForm.discordRoleId || ''}
                            onChange={(e) => setFunctionForm(prev => ({ ...prev, discordRoleId: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px',
                              color: 'white'
                            }}
                          >
                            <option value="">Select a role...</option>
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                            Description
                          </label>
                          <textarea
                            value={functionForm.description || ''}
                            onChange={(e) => setFunctionForm(prev => ({ ...prev, description: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px',
                              color: 'white',
                              resize: 'vertical',
                              minHeight: '80px'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ color: 'white' }}>Active Function</label>
                          <button
                            onClick={() => setFunctionForm(prev => ({ ...prev, active: !prev.active }))}
                            style={{
                              width: '48px',
                              height: '24px',
                              borderRadius: '12px',
                              border: 'none',
                              background: functionForm.active ? '#22C55E' : 'rgba(255, 255, 255, 0.2)',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'white',
                              position: 'absolute',
                              top: '2px',
                              left: functionForm.active ? '26px' : '2px',
                              transition: 'left 0.2s ease',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                            }} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                          onClick={() => {
                            setShowFunctionForm(false)
                            setEditingFunction(null)
                            setFunctionForm({ displayName: '', description: '', discordRoleId: '', active: true })
                          }}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: 'rgba(156, 163, 175, 0.2)',
                            border: '1px solid rgba(156, 163, 175, 0.4)',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addFunction}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: 'rgba(34, 197, 94, 0.8)',
                            border: '1px solid rgba(34, 197, 94, 0.6)',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          {editingFunction ? 'Update Function' : 'Add Function'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Display Tab */}
            {activeTab === 'display' && (
              <div>
                <ConfigSection 
                  title="Registration Form Display"
                  description="Customize how the registration form appears to users"
                >
                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                      Form Title
                    </label>
                    <input
                      type="text"
                      value={config.formDisplay.title}
                      onChange={(e) => updateFormDisplay('title', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                      Description
                    </label>
                    <textarea
                      value={config.formDisplay.description}
                      onChange={(e) => updateFormDisplay('description', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        resize: 'vertical',
                        minHeight: '80px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                      Welcome Message
                    </label>
                    <textarea
                      value={config.settings.welcomeMessage}
                      onChange={(e) => updateSettings('welcomeMessage', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        resize: 'vertical',
                        minHeight: '80px'
                      }}
                    />
                  </div>
                </ConfigSection>
              </div>
            )}

            {/* Registrations Tab */}
            {activeTab === 'registrations' && (
              <div>
                <ConfigSection 
                  title="User Registrations"
                  description="View and manage user registrations for this server"
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>
                      Total Registrations: {registrations.length}
                    </span>
                  </div>

                  {registrations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {registrations.slice(0, 10).map((registration) => (
                        <div
                          key={registration.userId}
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
                          <div>
                            <div style={{ color: 'white', fontWeight: 'bold' }}>
                              {registration.name} ({registration.username})
                            </div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                              Function: {registration.functionName} • {new Date(registration.registeredAt).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: registration.approved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: registration.approved ? '#4ADE80' : '#FCD34D'
                            }}>
                              {registration.approved ? 'Approved' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.6)',
                      padding: '3rem 1rem'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                      <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No registrations yet</div>
                      <div style={{ fontSize: '0.9rem' }}>
                        Registrations will appear here once users start registering
                      </div>
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
            onClick={saveConfig}
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
                <span>📝</span>
                <span>Save Registration Settings</span>
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
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'registration', 'navigation'])),
    },
  }
}