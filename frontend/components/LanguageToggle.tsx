import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import Flag from './Flag'

export default function LanguageToggle() {
  const router = useRouter()
  const { t } = useTranslation('common')

  const toggleLanguage = () => {
    const newLocale = router.locale === 'en' ? 'pt' : 'en'
    router.push(router.asPath, router.asPath, { locale: newLocale })
  }

  const currentCountry = router.locale === 'en' ? 'US' : 'BR'
  const nextCountry = router.locale === 'en' ? 'BR' : 'US'
  const tooltipText = router.locale === 'en' ? 'Switch to Portuguese (Brazil)' : 'Mudar para Inglês (EUA)'

  return (
    <button
      onClick={toggleLanguage}
      className="language-toggle"
      title={tooltipText}
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '0.6rem',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        position: 'relative',
        minWidth: '52px',
        minHeight: '40px'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
        e.currentTarget.style.transform = 'scale(1.05)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {/* Main flag */}
      <Flag country={currentCountry} size={32} />
      
      {/* Small preview of next flag in corner */}
      <div style={{
        position: 'absolute',
        bottom: '2px',
        right: '2px',
        opacity: 0.7,
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '2px',
        padding: '1px',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <Flag country={nextCountry} size={12} />
      </div>
    </button>
  )
}