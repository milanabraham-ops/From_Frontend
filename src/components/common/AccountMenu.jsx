import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, API_URL } from '../../context/AuthContext'
import Avatar from './Avatar'

export default function AccountMenu() {
  const { user, token, logout, updateAvatar } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const menuRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickAway = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [open])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const pickPhoto = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return

    setUploading(true)
    setPhotoError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_URL}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Upload failed')
      }
      const { url } = await res.json()
      await updateAvatar(url)
    } catch (err) {
      setPhotoError(err.message || 'Could not upload photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="account-menu" ref={menuRef}>
      <button type="button" className="account-menu-trigger" onClick={() => setOpen((o) => !o)}>
        <Avatar name={user?.name} email={user?.email} avatarUrl={user?.avatarUrl} size={28} />
      </button>

      {open && (
        <div className="account-menu-panel">
          <div className="account-menu-header">
            <div className="account-menu-avatar-wrap">
              <Avatar name={user?.name} email={user?.email} avatarUrl={user?.avatarUrl} size={56} />
              <button
                type="button"
                className="account-menu-avatar-edit"
                onClick={pickPhoto}
                disabled={uploading}
                title="Change photo"
              >
                <i className={`ti ${uploading ? 'ti-loader-2' : 'ti-camera'}`}></i>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
            <div className="account-menu-greeting">Hi, {user?.name}</div>
            <div className="account-menu-email">{user?.email}</div>
            {photoError && <div className="account-menu-error">{photoError}</div>}
          </div>

          <div className="account-menu-divider"></div>

          <button type="button" className="account-menu-item danger" onClick={handleLogout}>
            <i className="ti ti-logout"></i> Log out
          </button>
        </div>
      )}
    </div>
  )
}
