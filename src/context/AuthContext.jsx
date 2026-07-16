import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'voicestack.auth'
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      const stored = readStoredAuth()
      if (!stored?.token) {
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${stored.token}` },
        })
        if (!res.ok) throw new Error('Session expired')
        const body = await res.json()
        if (!cancelled) setAuth({ token: stored.token, user: body.user })
      } catch {
        if (!cancelled) {
          setAuth(null)
          localStorage.removeItem(STORAGE_KEY)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = (value) => {
    setAuth(value)
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  }

  const handleAuthResponse = async (resPromise) => {
    const res = await resPromise
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Authentication failed')
    }
    const body = await res.json()
    persist({ token: body.token, user: body.user })
    return body.user
  }

  const register = (name, email, password) =>
    handleAuthResponse(
      fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      }),
    )

  const login = (email, password) =>
    handleAuthResponse(
      fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    )

  const loginWithGoogle = (credential) =>
    handleAuthResponse(
      fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      }),
    )

  const logout = () => persist(null)

  const updateAvatar = async (avatarUrl) => {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth?.token}` },
      body: JSON.stringify({ avatarUrl }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Could not update profile picture')
    }
    const body = await res.json()
    persist({ token: auth?.token, user: body.user })
    return body.user
  }

  return (
    <AuthContext.Provider
      value={{
        user: auth?.user || null,
        token: auth?.token || null,
        loading,
        register,
        login,
        loginWithGoogle,
        logout,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
