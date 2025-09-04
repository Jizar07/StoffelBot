import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { GetStaticProps } from 'next'
import Navigation from '../components/Navigation'
import axios from 'axios'

interface Question {
  label: string
  placeholder?: string
  style: 'short' | 'paragraph'
  required: boolean
  minLength?: number
  maxLength?: number
}

interface RegistrationConfig {
  modalTitle: string
  modalDescription: string
  buttonText: string
  embedColor: string
  questions: Question[]
  roles: string[]
  nicknamePrefix: string
  nicknamePostfix: string
  createChannels: boolean
  channelCategory?: string
  channelPrefix: string
  channelPostfix: string
  channelWelcomeMessage: string
  successMessage: string
  logChannel?: string
}

interface Guild {
  id: string
  name: string
  icon?: string
}

interface Channel {
  id: string
  name: string
  type: 'text' | 'category'
}

interface Role {
  id: string
  name: string
  color: string
}

interface GuildInfo {
  guild: Guild
  channels: Channel[]
  roles: Role[]
}

export default function Registration() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation(['registration', 'common'])
  
  const [configs, setConfigs] = useState<Record<string, RegistrationConfig>>({})
  const [currentConfig, setCurrentConfig] = useState<RegistrationConfig>({
    modalTitle: 'Server Registration',
    modalDescription: 'Please fill out the form below to register for this server.',
    buttonText: '📝 Register',
    embedColor: '#0099FF',
    questions: [],
    roles: [],
    nicknamePrefix: '',
    nicknamePostfix: '',
    createChannels: false,
    channelCategory: '',
    channelPrefix: '',
    channelPostfix: '',
    channelWelcomeMessage: '',
    successMessage: 'Thank you for registering! Welcome to the server.',
    logChannel: ''
  })
  const [configName, setConfigName] = useState('')
  const [selectedConfigName, setSelectedConfigName] = useState('')
  const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Mock guild ID - in real app, this would come from user selection or auth
  const guildId = '1234567890123456789'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
        
        // Fetch existing configurations
        const configResponse = await axios.get(`${backendUrl}/api/registration/configs/${guildId}`)
        setConfigs(configResponse.data.configs || {})
        
        // Fetch guild info (channels, roles)
        const guildResponse = await axios.get(`${backendUrl}/api/guild/${guildId}/info`)
        setGuildInfo(guildResponse.data)
        
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchData()
    }
  }, [session, guildId])

  const addQuestion = () => {
    setCurrentConfig(prev => ({
      ...prev,
      questions: [...prev.questions, {
        label: '',
        placeholder: '',
        style: 'short',
        required: true,
        maxLength: 100
      }]
    }))
  }

  const removeQuestion = (index: number) => {
    setCurrentConfig(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }))
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setCurrentConfig(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }))
  }

  const toggleRole = (roleId: string) => {
    setCurrentConfig(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(id => id !== roleId)
        : [...prev.roles, roleId]
    }))
  }

  const saveConfiguration = async () => {
    if (!configName.trim()) {
      alert('Please enter a configuration name')
      return
    }

    setSaving(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      await axios.post(`${backendUrl}/api/registration/configs/${guildId}`, {
        configName: configName.trim(),
        config: currentConfig
      })
      
      // Refresh configs
      const configResponse = await axios.get(`${backendUrl}/api/registration/configs/${guildId}`)
      setConfigs(configResponse.data.configs || {})
      
      alert('Configuration saved successfully!')
      setConfigName('')
    } catch (error) {
      console.error('Error saving configuration:', error)
      alert('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const loadConfiguration = (name: string) => {
    if (configs[name]) {
      setCurrentConfig(configs[name])
      setConfigName(name)
      setSelectedConfigName(name)
    }
  }

  const deleteConfiguration = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3140'
      await axios.delete(`${backendUrl}/api/registration/configs/${guildId}/${name}`)
      
      // Refresh configs
      const configResponse = await axios.get(`${backendUrl}/api/registration/configs/${guildId}`)
      setConfigs(configResponse.data.configs || {})
      
      if (selectedConfigName === name) {
        setSelectedConfigName('')
        setConfigName('')
      }
      
      alert('Configuration deleted successfully!')
    } catch (error) {
      console.error('Error deleting configuration:', error)
      alert('Failed to delete configuration')
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
        <p style={{ fontSize: '1.5rem' }}>{t('common:loading')}</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Navigation currentPage="registration" />
      
      <div className="container">
        <header style={{ marginBottom: '3rem', marginTop: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{t('registration:title')}</h1>
            {guildInfo && (
              <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
                {t('registration:configuring')} <strong>{guildInfo.guild.name}</strong>
              </p>
            )}
          </div>
        </header>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Left Panel - Saved Configurations */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>{t('registration:savedConfigs')}</h2>
          
          {Object.keys(configs).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {Object.entries(configs).map(([name, config]) => (
                <div key={name} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: selectedConfigName === name ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  border: selectedConfigName === name ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {config.questions?.length || 0} questions, {config.roles?.length || 0} roles
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => loadConfiguration(name)}
                      className="button"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    >
                      {t('registration:load')}
                    </button>
                    <button 
                      onClick={() => deleteConfiguration(name)}
                      className="button"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#dc2626' }}
                    >
                      {t('registration:delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.7, marginBottom: '1rem' }}>{t('registration:noConfigs')}</p>
          )}
          
          <div style={{ marginTop: '2rem' }}>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder={t('registration:configName')}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                color: 'white'
              }}
            />
            <button 
              onClick={saveConfiguration}
              disabled={saving || !configName.trim()}
              className="button"
              style={{ width: '100%' }}
            >
              {saving ? t('registration:saving') : t('registration:save')}
            </button>
          </div>
        </div>

        {/* Right Panel - Configuration Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Modal Settings */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>{t('registration:modalSettings')}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:modalTitle')}</label>
                <input
                  type="text"
                  value={currentConfig.modalTitle}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, modalTitle: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:modalDescription')}</label>
                <textarea
                  value={currentConfig.modalDescription}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, modalDescription: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:buttonText')}</label>
                  <input
                    type="text"
                    value={currentConfig.buttonText}
                    onChange={(e) => setCurrentConfig(prev => ({ ...prev, buttonText: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:embedColor')}</label>
                  <input
                    type="color"
                    value={currentConfig.embedColor}
                    onChange={(e) => setCurrentConfig(prev => ({ ...prev, embedColor: e.target.value }))}
                    style={{ width: '80px', height: '40px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>{t('registration:questions')}</h2>
              <button onClick={addQuestion} className="button">
                + {t('registration:addQuestion')}
              </button>
            </div>
            
            {currentConfig.questions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {currentConfig.questions.map((question, index) => (
                  <div key={index} style={{ 
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <strong>{t('registration:question')} {index + 1}</strong>
                      <button 
                        onClick={() => removeQuestion(index)}
                        style={{ 
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder={t('registration:questionLabel')}
                        value={question.label}
                        onChange={(e) => updateQuestion(index, 'label', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          color: 'white'
                        }}
                      />
                      
                      <input
                        type="text"
                        placeholder={t('registration:questionPlaceholder')}
                        value={question.placeholder || ''}
                        onChange={(e) => updateQuestion(index, 'placeholder', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          color: 'white'
                        }}
                      />
                      
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <select
                          value={question.style}
                          onChange={(e) => updateQuestion(index, 'style', e.target.value)}
                          style={{
                            padding: '0.5rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: 'white'
                          }}
                        >
                          <option value="short">{t('registration:shortAnswer')}</option>
                          <option value="paragraph">{t('registration:longAnswer')}</option>
                        </select>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                          />
                          {t('registration:required')}
                        </label>
                        
                        <input
                          type="number"
                          placeholder="Max length"
                          value={question.maxLength || ''}
                          onChange={(e) => updateQuestion(index, 'maxLength', parseInt(e.target.value) || undefined)}
                          style={{
                            width: '100px',
                            padding: '0.5rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: 'white'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }}>
                {t('registration:noQuestions')}
              </p>
            )}
          </div>

          {/* Roles */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>{t('registration:rolesToAssign')}</h2>
            
            {guildInfo?.roles && guildInfo.roles.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {guildInfo.roles.map(role => (
                  <label key={role.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: currentConfig.roles.includes(role.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={currentConfig.roles.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    <div 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: role.color !== '#000000' ? role.color : '#99aab5' 
                      }}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            ) : (
              <p style={{ opacity: 0.7 }}>{t('registration:noRoles')}</p>
            )}
          </div>

          {/* Nickname Settings */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>{t('registration:nicknameSettings')}</h2>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:nicknamePrefix')}</label>
                <input
                  type="text"
                  value={currentConfig.nicknamePrefix}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, nicknamePrefix: e.target.value }))}
                  placeholder="[Member] "
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:nicknamePostfix')}</label>
                <input
                  type="text"
                  value={currentConfig.nicknamePostfix}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, nicknamePostfix: e.target.value }))}
                  placeholder=" | Verified"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Channel Creation */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>{t('registration:channelCreation')}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={currentConfig.createChannels}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, createChannels: e.target.checked }))}
                />
                {t('registration:createPersonalChannels')}
              </label>
              
              {currentConfig.createChannels && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:channelCategory')}</label>
                    <select
                      value={currentConfig.channelCategory}
                      onChange={(e) => setCurrentConfig(prev => ({ ...prev, channelCategory: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white'
                      }}
                    >
                      <option value="">{t('registration:selectCategory')}</option>
                      {guildInfo?.channels
                        .filter(channel => channel.type === 'category')
                        .map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:channelPrefix')}</label>
                      <input
                        type="text"
                        value={currentConfig.channelPrefix}
                        onChange={(e) => setCurrentConfig(prev => ({ ...prev, channelPrefix: e.target.value }))}
                        placeholder="member-"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          color: 'white'
                        }}
                      />
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:channelPostfix')}</label>
                      <input
                        type="text"
                        value={currentConfig.channelPostfix}
                        onChange={(e) => setCurrentConfig(prev => ({ ...prev, channelPostfix: e.target.value }))}
                        placeholder="-chat"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          color: 'white'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:channelWelcomeMessage')}</label>
                    <textarea
                      value={currentConfig.channelWelcomeMessage}
                      onChange={(e) => setCurrentConfig(prev => ({ ...prev, channelWelcomeMessage: e.target.value }))}
                      placeholder="Welcome to your personal channel! Feel free to ask questions here."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>{t('registration:additionalSettings')}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:successMessage')}</label>
                <textarea
                  value={currentConfig.successMessage}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, successMessage: e.target.value }))}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('registration:logChannel')}</label>
                <select
                  value={currentConfig.logChannel}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, logChannel: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                >
                  <option value="">{t('registration:noLogChannel')}</option>
                  {guildInfo?.channels
                    .filter(channel => channel.type === 'text')
                    .map(channel => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ 
        textAlign: 'center', 
        marginTop: '4rem', 
        padding: '2rem',
        opacity: 0.7
      }}>
        <p>{t('registration:footer')}</p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          {t('registration:usage')}: <code>/registration create &lt;config_name&gt;</code>
        </p>
      </footer>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'registration', 'navigation'])),
    },
  }
}