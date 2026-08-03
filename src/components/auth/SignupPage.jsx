import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleHome } from '../../lib/roles'
import GoogleSignInButton from './GoogleSignInButton'
import Blobs from '../common/Blobs'
import logoDark from '../../assets/voicestack-logo-dark.svg'
import './auth.css'

export default function SignupPage() {
  const { user, register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={user.mustChangePassword ? '/change-password' : roleHome(user.role)} replace />

  const destinationFor = (u) => (u.mustChangePassword ? '/change-password' : roleHome(u.role))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const registeredUser = await register(name, email, password)
      navigate(destinationFor(registeredUser), { replace: true })
    } catch (err) {
      setError(err.message || 'Sign up failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleCredential = async (credential) => {
    setError('')
    try {
      const loggedInUser = await loginWithGoogle(credential)
      navigate(destinationFor(loggedInUser), { replace: true })
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
    }
  }

  return (
    <div className="auth-shell">
      <Blobs />

      <div className="auth-card">
        <div className="auth-brand">
          <img src={logoDark} alt="Voicestack" />
        </div>
        <h1>Create your account</h1>
        <p className="auth-sub">Set up access to submit and track implementation requests.</p>

        {error && (
          <div className="auth-error">
            <i className="ti ti-alert-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Full Name</label>
            <input type="text" value={name} required onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Johnson" />
          </div>
          <div className="auth-field">
            <label>Company Email</label>
            <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              required
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <button type="submit" className="auth-btn-primary" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <GoogleSignInButton onCredential={handleGoogleCredential} />

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
