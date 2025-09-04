interface FlagProps {
  country: 'US' | 'BR'
  size?: number
  className?: string
}

export default function Flag({ country, size = 24, className = '' }: FlagProps) {
  const flagStyle = {
    width: size,
    height: size * 0.75, // 4:3 aspect ratio for flags
    borderRadius: '2px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
  }

  if (country === 'US') {
    return (
      <svg
        style={flagStyle}
        className={className}
        viewBox="0 0 60 45"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Red stripes */}
        <rect width="60" height="45" fill="#B22234"/>
        
        {/* White stripes */}
        <rect y="3.46" width="60" height="3.46" fill="white"/>
        <rect y="10.38" width="60" height="3.46" fill="white"/>
        <rect y="17.31" width="60" height="3.46" fill="white"/>
        <rect y="24.23" width="60" height="3.46" fill="white"/>
        <rect y="31.15" width="60" height="3.46" fill="white"/>
        <rect y="38.08" width="60" height="3.46" fill="white"/>
        
        {/* Blue canton */}
        <rect width="24" height="24.23" fill="#3C3B6E"/>
        
        {/* Stars - simplified 5x6 grid */}
        <g fill="white">
          <circle cx="3" cy="2.5" r="0.8"/>
          <circle cx="8" cy="2.5" r="0.8"/>
          <circle cx="13" cy="2.5" r="0.8"/>
          <circle cx="18" cy="2.5" r="0.8"/>
          <circle cx="23" cy="2.5" r="0.8"/>
          
          <circle cx="5.5" cy="5.5" r="0.8"/>
          <circle cx="10.5" cy="5.5" r="0.8"/>
          <circle cx="15.5" cy="5.5" r="0.8"/>
          <circle cx="20.5" cy="5.5" r="0.8"/>
          
          <circle cx="3" cy="8.5" r="0.8"/>
          <circle cx="8" cy="8.5" r="0.8"/>
          <circle cx="13" cy="8.5" r="0.8"/>
          <circle cx="18" cy="8.5" r="0.8"/>
          <circle cx="23" cy="8.5" r="0.8"/>
          
          <circle cx="5.5" cy="11.5" r="0.8"/>
          <circle cx="10.5" cy="11.5" r="0.8"/>
          <circle cx="15.5" cy="11.5" r="0.8"/>
          <circle cx="20.5" cy="11.5" r="0.8"/>
          
          <circle cx="3" cy="14.5" r="0.8"/>
          <circle cx="8" cy="14.5" r="0.8"/>
          <circle cx="13" cy="14.5" r="0.8"/>
          <circle cx="18" cy="14.5" r="0.8"/>
          <circle cx="23" cy="14.5" r="0.8"/>
          
          <circle cx="5.5" cy="17.5" r="0.8"/>
          <circle cx="10.5" cy="17.5" r="0.8"/>
          <circle cx="15.5" cy="17.5" r="0.8"/>
          <circle cx="20.5" cy="17.5" r="0.8"/>
          
          <circle cx="3" cy="20.5" r="0.8"/>
          <circle cx="8" cy="20.5" r="0.8"/>
          <circle cx="13" cy="20.5" r="0.8"/>
          <circle cx="18" cy="20.5" r="0.8"/>
          <circle cx="23" cy="20.5" r="0.8"/>
        </g>
      </svg>
    )
  }

  if (country === 'BR') {
    return (
      <svg
        style={flagStyle}
        className={className}
        viewBox="0 0 60 42"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Green background */}
        <rect width="60" height="42" fill="#009739"/>
        
        {/* Yellow diamond */}
        <path
          d="M30 5 L50 21 L30 37 L10 21 Z"
          fill="#FEDD00"
        />
        
        {/* Blue circle */}
        <circle
          cx="30"
          cy="21"
          r="8"
          fill="#012169"
        />
        
        {/* White banner across circle */}
        <path
          d="M22 23 Q30 19 38 23 Q30 27 22 23 Z"
          fill="white"
        />
        
        {/* Stars - simplified representation */}
        <g fill="white">
          <circle cx="26" cy="18" r="0.4"/>
          <circle cx="30" cy="16" r="0.4"/>
          <circle cx="34" cy="18" r="0.4"/>
          <circle cx="28" cy="20" r="0.4"/>
          <circle cx="32" cy="20" r="0.4"/>
          <circle cx="30" cy="26" r="0.4"/>
          <circle cx="25" cy="25" r="0.3"/>
          <circle cx="35" cy="25" r="0.3"/>
        </g>
      </svg>
    )
  }

  return null
}