import { useEffect, useMemo, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import '../form/form.css'

const ROLES = ['poc', 'specialist', 'qa', 'admin']
const ROLE_LABELS = { poc: 'POC', specialist: 'Specialist', qa: 'QA', admin: 'Admin' }

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const BLANK_FORM = { name: '', email: '', password: '', role: 'poc' }

export default function AdminUsers() {
  const { token, user: currentUser } = useAuth()
  const { theme } = useTheme()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error('Failed to load users')
        const body = await res.json()
        if (!cancelled) {
          setUsers(Array.isArray(body) ? body : [])
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load users')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const changeRole = async (targetUser, role) => {
    setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role } : u)))
    setSavingId(targetUser.id)
    setError('')
    try {
      const res = await fetch(`${API_URL}/admin/users/${targetUser.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to update role')
    } catch (err) {
      setError(err.message || 'Failed to update role')
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role: targetUser.role } : u)))
    } finally {
      setSavingId(null)
    }
  }

  const addUser = async (e) => {
    e.preventDefault()
    setAdding(true)
    setAddError('')
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to add agent')
      setUsers((prev) => [body, ...prev])
      setForm(BLANK_FORM)
      setAddOpen(false)
    } catch (err) {
      setAddError(err.message || 'Failed to add agent')
    } finally {
      setAdding(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => [u.name, u.email, u.role].some((v) => (v || '').toLowerCase().includes(q)))
  }, [users, search])

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>Manage Access</h1>
              <p>Add agents and assign roles (POC, Specialist, QA, or Admin) to each account.</p>
            </div>
            <button type="button" className="btn-sm" onClick={() => setAddOpen((v) => !v)}>
              <i className="ti ti-user-plus"></i> Add Agent
            </button>
          </div>

          {error && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error}
            </div>
          )}

          {addOpen && (
            <form className="dash-table-card add-user-panel" onSubmit={addUser}>
              {addError && (
                <div className="info-box error">
                  <i className="ti ti-alert-circle"></i>
                  {addError}
                </div>
              )}
              <div className="add-user-fields">
                <input
                  type="text"
                  className="inline-edit-input"
                  placeholder="Full name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  type="email"
                  className="inline-edit-input"
                  placeholder="Email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
                <input
                  type="password"
                  className="inline-edit-input"
                  placeholder="Temporary password (min 8 chars)"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <select
                  className="inline-edit-select"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-sm" disabled={adding}>
                  {adding ? 'Adding…' : 'Add Agent'}
                </button>
                <button type="button" className="btn-sm" onClick={() => setAddOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="dash-table-card">
            <div className="dash-table-toolbar">
              <div className="dash-search">
                <i className="ti ti-search"></i>
                <input
                  type="text"
                  placeholder="Search by name, email, role…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="dash-count-label">
                {filtered.length} of {users.length} user{users.length === 1 ? '' : 's'}
              </div>
            </div>

            {loading ? (
              <div className="dash-empty">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="dash-empty">
                <p>No users match &quot;{search}&quot;.</p>
              </div>
            ) : (
              <CustomScrollbar horizontal className="dash-table-scroll">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td>
                          <select
                            className="inline-edit-select"
                            value={u.role}
                            disabled={savingId === u.id || u.id === currentUser?.id}
                            onChange={(e) => changeRole(u, e.target.value)}
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CustomScrollbar>
            )}
          </div>
        </CustomScrollbar>
      </main>
    </div>
  )
}
