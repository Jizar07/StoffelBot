import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import Navigation from '../components/Navigation'
import axios from 'axios'

// Registration Function Interface
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
  channelPermissions?: {
    channelTopic?: string
    allowedRoles?: string[]
  }
}

// Registration Configuration Interface
interface RegistrationConfig {
  formId: string
  functions: RegistrationFunction[]
  settings: {
    oneTimeOnly: boolean
    requiresVerification: boolean
    welcomeMessage: string
    channelId?: string
    embedColor?: string
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
  steps: {
    step1: {
      modalTitle: string
      nameLabel: string
      namePlaceholder: string
      identifierLabel: string
      identifierPlaceholder: string
    }
    step2: {
      embedTitle: string
      embedDescription: string
      dropdownPlaceholder: string
    }
    step3: {
      embedTitle: string
      embedDescription: string
      dropdownPlaceholder: string
    }
  }
  postRegistration: {
    nicknameFormat: string
    sendDM: boolean
    dmTitle: string
    dmMessage: string
    assignRoles: boolean
    welcomeChannelMessage: boolean
    createChannel: boolean
    channelNameFormat: string
    channelPrefix: string
    channelPostfix: string
    channelWelcomeMessage: string
    channelCategoryId: string | null
    channelCategoryName: string | null
  }
  messages: {
    alreadyRegistered: string
    sessionExpired: string
    registrationSuccess: string
    errorGeneric: string
    permissionDenied: string
  }
}

interface DiscordRole {
  id: string
  name: string
  color: string
  position: number
  memberCount: number
}

interface DiscordCategory {
  id: string
  name: string
  position: number
}

interface Guild {
  id: string
  name: string
  icon?: string
}

interface UserRegistration {
  userId: string
  username: string
  name: string
  identifier: string
  functionId: string
  functionName: string
  invitedBy: string
  invitedById: string
  approved: boolean
  registeredAt: string
  metadata: {
    discordAvatar?: string
    assignedRoles?: string[]
    createdChannel?: string
  }
}

export default function RegistrationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { t } = useTranslation(['registration', 'common'])
  
  // State
  const [config, setConfig] = useState<RegistrationConfig | null>(null)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [selectedGuildId, setSelectedGuildId] = useState<string>('')
  const [discordData, setDiscordData] = useState<{ roles: DiscordRole[], categories: DiscordCategory[] }>({ roles: [], categories: [] })
  const [registrations, setRegistrations] = useState<UserRegistration[]>([])
  const [activeTab, setActiveTab] = useState<'command' | 'display' | 'steps' | 'functions' | 'post-registration' | 'registrations'>('command')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // New function form state
  const [showFunctionForm, setShowFunctionForm] = useState(false)
  const [editingFunction, setEditingFunction] = useState<RegistrationFunction | null>(null)
  const [functionForm, setFunctionForm] = useState<Partial<RegistrationFunction>>({
    displayName: '',
    description: '',
    discordRoleId: '',
    categoryId: '',
    channelEmojiPrefix: '',
    active: true,
    channelPermissions: { channelTopic: '', allowedRoles: [] }
  })

  // Load user's servers and initial data
  useEffect(() => {
    if (session?.user?.id) {
      loadUserServers()
      loadConfig()
      loadRegistrations()
    }
  }, [session])

  // Load Discord data when guild is selected
  useEffect(() => {
    if (selectedGuildId) {
      loadDiscordData(selectedGuildId)
    }
  }, [selectedGuildId])

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'

  const loadUserServers = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/user/guilds/${session?.user?.id}`)
      if (response.data.guilds) {
        setGuilds(response.data.guilds)
        if (response.data.guilds.length > 0 && !selectedGuildId) {
          setSelectedGuildId(response.data.guilds[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading servers:', error)
    }
  }

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/registration/config`)
      setConfig(response.data)
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDiscordData = async (guildId: string) => {
    try {
      const response = await axios.get(`${backendUrl}/api/registration/discord/${guildId}`)
      setDiscordData(response.data)
    } catch (error) {
      console.error('Error loading Discord data:', error)
    }
  }

  const loadRegistrations = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/registration/registrations`)
      setRegistrations(response.data)
    } catch (error) {
      console.error('Error loading registrations:', error)
    }
  }

  const saveConfig = async (updates: Partial<RegistrationConfig>) => {
    setSaving(true)
    try {
      const response = await axios.post(`${backendUrl}/api/registration/config`, updates)
      setConfig(response.data.config)
      showMessage('success', 'Configuration saved successfully!')
    } catch (error) {
      console.error('Error saving config:', error)
      showMessage('error', 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const addFunction = async () => {
    if (!functionForm.displayName || !functionForm.discordRoleId) {
      showMessage('error', 'Display name and Discord role are required')
      return
    }

    try {
      const newFunction: RegistrationFunction = {
        id: editingFunction?.id || `func_${Date.now()}`,
        displayName: functionForm.displayName!,
        discordRoleId: functionForm.discordRoleId!,
        discordRoleName: discordData.roles.find(r => r.id === functionForm.discordRoleId)?.name || '',
        description: functionForm.description || '',
        order: editingFunction?.order || (config?.functions.length || 0),
        active: functionForm.active !== undefined ? functionForm.active : true,
        categoryId: functionForm.categoryId || undefined,
        categoryName: discordData.categories.find(c => c.id === functionForm.categoryId)?.name || undefined,
        channelEmojiPrefix: functionForm.channelEmojiPrefix || undefined,
        channelPermissions: functionForm.channelPermissions || { channelTopic: '', allowedRoles: [] }
      }

      const response = await axios.post(`${backendUrl}/api/registration/functions`, newFunction)
      setConfig(response.data.config)
      setShowFunctionForm(false)
      setEditingFunction(null)
      setFunctionForm({
        displayName: '',
        description: '',
        discordRoleId: '',
        categoryId: '',
        channelEmojiPrefix: '',
        active: true,
        channelPermissions: { channelTopic: '', allowedRoles: [] }
      })
      showMessage('success', editingFunction ? 'Function updated!' : 'Function added!')
    } catch (error) {
      console.error('Error adding function:', error)
      showMessage('error', 'Failed to add function')
    }
  }

  const deleteFunction = async (functionId: string) => {
    if (!confirm('Are you sure you want to delete this function?')) return

    try {
      const response = await axios.delete(`${backendUrl}/api/registration/functions/${functionId}`)
      setConfig(response.data.config)
      showMessage('success', 'Function deleted!')
    } catch (error) {
      console.error('Error deleting function:', error)
      showMessage('error', 'Failed to delete function')
    }
  }

  const toggleFunction = async (functionId: string) => {
    try {
      const response = await axios.patch(`${backendUrl}/api/registration/functions/${functionId}/toggle`)
      setConfig(response.data.config)
    } catch (error) {
      console.error('Error toggling function:', error)
      showMessage('error', 'Failed to toggle function')
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const editFunction = (func: RegistrationFunction) => {
    setEditingFunction(func)
    setFunctionForm(func)
    setShowFunctionForm(true)
  }

  if (!session) {
    return <div>Please log in to access registration settings.</div>
  }

  if (loading) {
    return (
      <div>
        <Navigation />
        <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Loading registration settings...</h1>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navigation />
      
      <div className="container" style={{ padding: '2rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            📝 Registration System
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>
            {t('registration:description')}
          </p>
          
          {guilds.length > 1 && (
            <div style={{ marginTop: '1rem' }}>
              <label>Server: </label>
              <select 
                value={selectedGuildId} 
                onChange={(e) => setSelectedGuildId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px' }}
              >
                {guilds.map(guild => (
                  <option key={guild.id} value={guild.id}>{guild.name}</option>
                ))}
              </select>
            </div>
          )}
        </header>

        {message && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            background: message.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white'
          }}>
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ borderBottom: '2px solid #374151', marginBottom: '2rem' }}>
          <nav style={{ display: 'flex', gap: '2rem' }}>
            {[
              { key: 'command', label: '⚙️ Command', desc: 'Basic settings' },
              { key: 'display', label: '🎨 Display', desc: 'Visual appearance' },
              { key: 'steps', label: '📋 Steps', desc: 'Wizard configuration' },
              { key: 'functions', label: '👥 Functions', desc: 'Roles & permissions' },
              { key: 'post-registration', label: '🎯 Post-Registration', desc: 'Actions after signup' },
              { key: 'registrations', label: '📊 Registrations', desc: 'View submissions' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '1rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                  color: activeTab === tab.key ? '#3b82f6' : 'inherit'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{tab.label}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{tab.desc}</div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: '400px' }}>
          
          {/* Command Tab */}
          {activeTab === 'command' && config && (
            <div className="card">
              <h2>Command Configuration</h2>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Command Name
                  </label>
                  <input
                    type="text"
                    value={config.command.name}
                    onChange={(e) => setConfig({
                      ...config,
                      command: { ...config.command, name: e.target.value }
                    })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={config.command.description}
                    onChange={(e) => setConfig({
                      ...config,
                      command: { ...config.command, description: e.target.value }
                    })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Required Permissions
                  </label>
                  <select
                    value={config.command.permissions}
                    onChange={(e) => setConfig({
                      ...config,
                      command: { ...config.command, permissions: e.target.value }
                    })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="ManageGuild">Manage Server</option>
                    <option value="ManageChannels">Manage Channels</option>
                  </select>
                </div>
                <button
                  onClick={() => saveConfig({ command: config.command })}
                  disabled={saving}
                  className="button"
                  style={{ background: '#3b82f6', width: 'fit-content' }}
                >
                  {saving ? 'Saving...' : 'Save Command Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && config && (
            <div className="card">
              <h2>Form Display Settings</h2>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    {t('registration:formTitle')}
                  </label>
                  <input
                    type="text"
                    value={config.formDisplay.title}
                    onChange={(e) => setConfig({
                      ...config,
                      formDisplay: { ...config.formDisplay, title: e.target.value }
                    })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    {t('registration:formDescription')}
                  </label>
                  <textarea
                    value={config.formDisplay.description}
                    onChange={(e) => setConfig({
                      ...config,
                      formDisplay: { ...config.formDisplay, description: e.target.value }
                    })}
                    rows={6}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={config.formDisplay.button.text}
                    onChange={(e) => setConfig({
                      ...config,
                      formDisplay: { 
                        ...config.formDisplay, 
                        button: { ...config.formDisplay.button, text: e.target.value }
                      }
                    })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Button Emoji
                  </label>
                  <input
                    type="text"
                    value={config.formDisplay.button.emoji}
                    onChange={(e) => setConfig({
                      ...config,
                      formDisplay: { 
                        ...config.formDisplay, 
                        button: { ...config.formDisplay.button, emoji: e.target.value }
                      }
                    })}
                    placeholder="📝"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Embed Color
                  </label>
                  <input
                    type="color"
                    value={config.formDisplay.embedColor}
                    onChange={(e) => setConfig({
                      ...config,
                      formDisplay: { ...config.formDisplay, embedColor: e.target.value }
                    })}
                    style={{ width: '100px', height: '40px', borderRadius: '4px', border: '1px solid #374151' }}
                  />
                </div>
                <button
                  onClick={() => saveConfig({ formDisplay: config.formDisplay })}
                  disabled={saving}
                  className="button"
                  style={{ background: '#3b82f6', width: 'fit-content' }}
                >
                  {saving ? 'Saving...' : 'Save Display Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Functions Tab */}
          {activeTab === 'functions' && config && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Registration Functions</h2>
                <button
                  onClick={() => setShowFunctionForm(true)}
                  className="button"
                  style={{ background: '#10b981' }}
                >
                  ➕ Add Function
                </button>
              </div>

              {/* Functions List */}
              <div style={{ display: 'grid', gap: '1rem' }}>
                {config.functions.map((func, index) => (
                  <div 
                    key={func.id}
                    className="card"
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      opacity: func.active ? 1 : 0.6 
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {func.channelEmojiPrefix} {func.displayName}
                        {!func.active && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>(Inactive)</span>}
                      </h3>
                      <p style={{ margin: '0.5rem 0', opacity: 0.8 }}>{func.description}</p>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        Role: {func.discordRoleName} | Order: {func.order}
                        {func.categoryName && ` | Category: ${func.categoryName}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => toggleFunction(func.id)}
                        className="button"
                        style={{ 
                          background: func.active ? '#ef4444' : '#10b981',
                          padding: '0.5rem 1rem' 
                        }}
                      >
                        {func.active ? '❌ Disable' : '✅ Enable'}
                      </button>
                      <button
                        onClick={() => editFunction(func)}
                        className="button"
                        style={{ background: '#3b82f6', padding: '0.5rem 1rem' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteFunction(func.id)}
                        className="button"
                        style={{ background: '#ef4444', padding: '0.5rem 1rem' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}

                {config.functions.length === 0 && (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h3>No functions configured</h3>
                    <p>Add your first registration function to get started!</p>
                    <button
                      onClick={() => setShowFunctionForm(true)}
                      className="button"
                      style={{ background: '#10b981' }}
                    >
                      ➕ Add Function
                    </button>
                  </div>
                )}
              </div>

              {/* Function Form Modal */}
              {showFunctionForm && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div className="card" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
                    <h3>{editingFunction ? 'Edit Function' : 'Add New Function'}</h3>
                    
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Display Name *
                        </label>
                        <input
                          type="text"
                          value={functionForm.displayName || ''}
                          onChange={(e) => setFunctionForm({ ...functionForm, displayName: e.target.value })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Discord Role *
                        </label>
                        <select
                          value={functionForm.discordRoleId || ''}
                          onChange={(e) => setFunctionForm({ ...functionForm, discordRoleId: e.target.value })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        >
                          <option value="">Select a role...</option>
                          {discordData.roles.map(role => (
                            <option key={role.id} value={role.id}>
                              {role.name} ({role.memberCount} members)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Description
                        </label>
                        <input
                          type="text"
                          value={functionForm.description || ''}
                          onChange={(e) => setFunctionForm({ ...functionForm, description: e.target.value })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Category (Optional)
                        </label>
                        <select
                          value={functionForm.categoryId || ''}
                          onChange={(e) => setFunctionForm({ ...functionForm, categoryId: e.target.value })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        >
                          <option value="">No category</option>
                          {discordData.categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Channel Emoji Prefix
                        </label>
                        <input
                          type="text"
                          value={functionForm.channelEmojiPrefix || ''}
                          onChange={(e) => setFunctionForm({ ...functionForm, channelEmojiPrefix: e.target.value })}
                          placeholder="👤"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        />
                      </div>

                      <div style={{ display: 'flex', align: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          id="active"
                          checked={functionForm.active || false}
                          onChange={(e) => setFunctionForm({ ...functionForm, active: e.target.checked })}
                        />
                        <label htmlFor="active">Active (users can select this function)</label>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setShowFunctionForm(false)
                            setEditingFunction(null)
                            setFunctionForm({
                              displayName: '',
                              description: '',
                              discordRoleId: '',
                              categoryId: '',
                              channelEmojiPrefix: '',
                              active: true,
                              channelPermissions: { channelTopic: '', allowedRoles: [] }
                            })
                          }}
                          className="button"
                          style={{ background: '#6b7280' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addFunction}
                          className="button"
                          style={{ background: '#3b82f6' }}
                        >
                          {editingFunction ? 'Update Function' : 'Add Function'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Steps Tab */}
          {activeTab === 'steps' && config && (
            <div className="card">
              <h2>Registration Steps Configuration</h2>
              <div style={{ display: 'grid', gap: '2rem' }}>
                
                {/* Step 1 */}
                <div>
                  <h3>Step 1: User Information</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Modal Title
                      </label>
                      <input
                        type="text"
                        value={config.steps.step1.modalTitle}
                        onChange={(e) => setConfig({
                          ...config,
                          steps: { 
                            ...config.steps, 
                            step1: { ...config.steps.step1, modalTitle: e.target.value }
                          }
                        })}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Name Label
                        </label>
                        <input
                          type="text"
                          value={config.steps.step1.nameLabel}
                          onChange={(e) => setConfig({
                            ...config,
                            steps: { 
                              ...config.steps, 
                              step1: { ...config.steps.step1, nameLabel: e.target.value }
                            }
                          })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Name Placeholder
                        </label>
                        <input
                          type="text"
                          value={config.steps.step1.namePlaceholder}
                          onChange={(e) => setConfig({
                            ...config,
                            steps: { 
                              ...config.steps, 
                              step1: { ...config.steps.step1, namePlaceholder: e.target.value }
                            }
                          })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Identifier Label
                        </label>
                        <input
                          type="text"
                          value={config.steps.step1.identifierLabel}
                          onChange={(e) => setConfig({
                            ...config,
                            steps: { 
                              ...config.steps, 
                              step1: { ...config.steps.step1, identifierLabel: e.target.value }
                            }
                          })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Identifier Placeholder
                        </label>
                        <input
                          type="text"
                          value={config.steps.step1.identifierPlaceholder}
                          onChange={(e) => setConfig({
                            ...config,
                            steps: { 
                              ...config.steps, 
                              step1: { ...config.steps.step1, identifierPlaceholder: e.target.value }
                            }
                          })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div>
                  <h3>Step 2: Function Selection</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Embed Title
                      </label>
                      <input
                        type="text"
                        value={config.steps.step2.embedTitle}
                        onChange={(e) => setConfig({
                          ...config,
                          steps: { 
                            ...config.steps, 
                            step2: { ...config.steps.step2, embedTitle: e.target.value }
                          }
                        })}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Description
                      </label>
                      <textarea
                        value={config.steps.step2.embedDescription}
                        onChange={(e) => setConfig({
                          ...config,
                          steps: { 
                            ...config.steps, 
                            step2: { ...config.steps.step2, embedDescription: e.target.value }
                          }
                        })}
                        rows={3}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div>
                  <h3>Step 3: Inviter Selection</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Embed Title
                      </label>
                      <input
                        type="text"
                        value={config.steps.step3.embedTitle}
                        onChange={(e) => setConfig({
                          ...config,
                          steps: { 
                            ...config.steps, 
                            step3: { ...config.steps.step3, embedTitle: e.target.value }
                          }
                        })}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Description
                      </label>
                      <textarea
                        value={config.steps.step3.embedDescription}
                        onChange={(e) => setConfig({
                          ...config,
                          steps: { 
                            ...config.steps, 
                            step3: { ...config.steps.step3, embedDescription: e.target.value }
                          }
                        })}
                        rows={4}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => saveConfig({ steps: config.steps })}
                  disabled={saving}
                  className="button"
                  style={{ background: '#3b82f6', width: 'fit-content' }}
                >
                  {saving ? 'Saving...' : 'Save Steps Configuration'}
                </button>
              </div>
            </div>
          )}

          {/* Post-Registration Tab */}
          {activeTab === 'post-registration' && config && (
            <div className="card">
              <h2>Post-Registration Actions</h2>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={config.postRegistration.assignRoles}
                      onChange={(e) => setConfig({
                        ...config,
                        postRegistration: { ...config.postRegistration, assignRoles: e.target.checked }
                      })}
                    />
                    <span style={{ fontWeight: 'bold' }}>Assign Discord roles automatically</span>
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Nickname Format (use {'{name}'} and {'{identifier}'})
                  </label>
                  <input
                    type="text"
                    value={config.postRegistration.nicknameFormat}
                    onChange={(e) => setConfig({
                      ...config,
                      postRegistration: { ...config.postRegistration, nicknameFormat: e.target.value }
                    })}
                    placeholder="{name}"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={config.postRegistration.sendDM}
                      onChange={(e) => setConfig({
                        ...config,
                        postRegistration: { ...config.postRegistration, sendDM: e.target.checked }
                      })}
                    />
                    <span style={{ fontWeight: 'bold' }}>Send welcome DM to new members</span>
                  </label>
                </div>

                {config.postRegistration.sendDM && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        DM Title
                      </label>
                      <input
                        type="text"
                        value={config.postRegistration.dmTitle}
                        onChange={(e) => setConfig({
                          ...config,
                          postRegistration: { ...config.postRegistration, dmTitle: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        DM Message (use {'{name}'}, {'{functionName}'}, {'{identifier}'})
                      </label>
                      <textarea
                        value={config.postRegistration.dmMessage}
                        onChange={(e) => setConfig({
                          ...config,
                          postRegistration: { ...config.postRegistration, dmMessage: e.target.value }
                        })}
                        rows={6}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={config.postRegistration.createChannel}
                      onChange={(e) => setConfig({
                        ...config,
                        postRegistration: { ...config.postRegistration, createChannel: e.target.checked }
                      })}
                    />
                    <span style={{ fontWeight: 'bold' }}>Create personal channels</span>
                  </label>
                </div>

                {config.postRegistration.createChannel && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Channel Name Format (use {'{name}'}, {'{identifier}'}, {'{functionName}'})
                      </label>
                      <input
                        type="text"
                        value={config.postRegistration.channelNameFormat}
                        onChange={(e) => setConfig({
                          ...config,
                          postRegistration: { ...config.postRegistration, channelNameFormat: e.target.value }
                        })}
                        placeholder="{name}"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Default Category for Personal Channels
                      </label>
                      <select
                        value={config.postRegistration.channelCategoryId || ''}
                        onChange={(e) => {
                          const categoryId = e.target.value || null;
                          const categoryName = categoryId ? discordData.categories.find(c => c.id === categoryId)?.name || null : null;
                          setConfig({
                            ...config,
                            postRegistration: { 
                              ...config.postRegistration, 
                              channelCategoryId: categoryId,
                              channelCategoryName: categoryName
                            }
                          });
                        }}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                      >
                        <option value="">Select a category (optional)</option>
                        {discordData.categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
                        If not selected, channels will be created in the function-specific category
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Channel Prefix (optional)
                        </label>
                        <input
                          type="text"
                          value={config.postRegistration.channelPrefix || ''}
                          onChange={(e) => setConfig({
                            ...config,
                            postRegistration: { ...config.postRegistration, channelPrefix: e.target.value }
                          })}
                          placeholder="team-"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Channel Postfix (optional)
                        </label>
                        <input
                          type="text"
                          value={config.postRegistration.channelPostfix || ''}
                          onChange={(e) => setConfig({
                            ...config,
                            postRegistration: { ...config.postRegistration, channelPostfix: e.target.value }
                          })}
                          placeholder="-private"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={config.postRegistration.welcomeChannelMessage}
                          onChange={(e) => setConfig({
                            ...config,
                            postRegistration: { ...config.postRegistration, welcomeChannelMessage: e.target.checked }
                          })}
                        />
                        <span style={{ fontWeight: 'bold' }}>Send welcome message to created channel</span>
                      </label>
                    </div>
                    {config.postRegistration.welcomeChannelMessage && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Channel Welcome Message
                        </label>
                        <textarea
                          value={config.postRegistration.channelWelcomeMessage || ''}
                          onChange={(e) => setConfig({
                            ...config,
                            postRegistration: { ...config.postRegistration, channelWelcomeMessage: e.target.value }
                          })}
                          placeholder="Welcome to your personal channel!"
                          rows={3}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #374151' }}
                        />
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={() => saveConfig({ postRegistration: config.postRegistration })}
                  disabled={saving}
                  className="button"
                  style={{ background: '#3b82f6', width: 'fit-content' }}
                >
                  {saving ? 'Saving...' : 'Save Post-Registration Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Registrations Tab */}
          {activeTab === 'registrations' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Registration Submissions</h2>
                <button
                  onClick={loadRegistrations}
                  className="button"
                  style={{ background: '#3b82f6' }}
                >
                  🔄 Refresh
                </button>
              </div>

              {registrations.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {registrations.map((reg) => (
                    <div key={reg.userId} className="card" style={{ background: '#374151' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {reg.metadata.discordAvatar && (
                              <img 
                                src={reg.metadata.discordAvatar} 
                                alt={reg.username}
                                style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                              />
                            )}
                            {reg.name} ({reg.username})
                          </h3>
                          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>
                            <p><strong>ID:</strong> {reg.identifier}</p>
                            <p><strong>Function:</strong> {reg.functionName}</p>
                            <p><strong>Invited by:</strong> {reg.invitedBy}</p>
                            <p><strong>Registered:</strong> {new Date(reg.registeredAt).toLocaleString()}</p>
                            {reg.metadata.assignedRoles && reg.metadata.assignedRoles.length > 0 && (
                              <p><strong>Assigned Roles:</strong> {reg.metadata.assignedRoles.length}</p>
                            )}
                          </div>
                        </div>
                        <div style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '12px',
                          background: reg.approved ? '#10b981' : '#ef4444',
                          color: 'white',
                          fontSize: '0.8rem'
                        }}>
                          {reg.approved ? 'Approved' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <h3>No registrations yet</h3>
                  <p>Registration submissions will appear here once users start registering.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="card" style={{ marginTop: '2rem', background: '#1f2937' }}>
          <h3>🚀 How to Deploy Registration</h3>
          <ol>
            <li>Configure at least one function in the <strong>Functions</strong> tab</li>
            <li>Customize the appearance in <strong>Display</strong> and <strong>Steps</strong> tabs</li>
            <li>Use the command <code>/register-setup #channel</code> in Discord to deploy</li>
            <li>Users can then click the Register button to start the 3-step wizard</li>
          </ol>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>
            The registration wizard includes: Modal for user info → Role selection → Inviter selection with autocomplete
          </p>
        </div>
      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'registration'])),
    },
  }
}