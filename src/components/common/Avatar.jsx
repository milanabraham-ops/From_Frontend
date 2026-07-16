import { useEffect, useState } from 'react'
import { gravatarUrl } from '../../utils/gravatar'

export default function Avatar({ name, email, avatarUrl, size = 28 }) {
  const [src, setSrc] = useState(avatarUrl || (email ? gravatarUrl(email, size * 2) : ''))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(avatarUrl || (email ? gravatarUrl(email, size * 2) : ''))
    setFailed(false)
  }, [avatarUrl, email, size])

  if (src && !failed) {
    return (
      <img
        className="avatar-img"
        src={src}
        alt={name || 'Account'}
        width={size}
        height={size}
        onError={() => setFailed(true)}
      />
    )
  }

  const initial = (name || email || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {initial}
    </div>
  )
}
