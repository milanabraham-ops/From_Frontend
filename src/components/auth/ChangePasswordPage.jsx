import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleHome } from '../../lib/roles'
import Blobs from '../common/Blobs'
import logoDark from '../../assets/voicestack-logo-dark.svg'
import './auth.css'

// Forced gate — reached only when user.mustChangePassword is true (see ProtectedRoute/RequireRole).
// Once changed, the account behaves like any other and this page is unreachable again.
export default function ChangePasswordPage() {
  const { user, loading, changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.mustChangePassword) return <Navigate to={roleHome(user.role)} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
    } catch (err) {
      setError(err.message || 'Could not change password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <Blobs />

      <div className="auth-card">
        <div className="auth-brand">
          <img src={logoDark} alt="Voicestack" />
        </div>
        <h1>Set a New Password</h1>
        <p className="auth-sub">Your account was created with a default password. Choose your own before continuing.</p>

        {error && (
          <div className="auth-error">
            <i className="ti ti-alert-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              required
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="auth-field">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              required
              minLength={8}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="auth-field">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              required
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="auth-btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
