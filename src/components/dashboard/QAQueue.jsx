import { useEffect, useMemo, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import SubmissionDetailModal from './SubmissionDetailModal'
import '../form/form.css'

const ACCOUNT_ONBOARDED_OPTIONS = ['', 'OPEN', 'CLOSED']

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function QAQueue() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [viewing, setViewing] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load(isBackgroundRefresh) {
      if (!isBackgroundRefresh) setLoading(true)
      try {
        const res = await fetch(`${API_URL}/submissions`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error('Failed to load submissions')
        const body = await res.json()
        if (!cancelled) {
          setSubmissions(Array.isArray(body) ? body : [])
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load submissions')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load(false)
    const interval = setInterval(() => load(true), 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [token])

  const saveField = async (submission, field, value) => {
    setSubmissions((prev) => prev.map((s) => (s._id === submission._id ? { ...s, [field]: value } : s)))
    setSavingId(submission._id)
    setError('')
    try {
      const res = await fetch(`${API_URL}/submissions/${submission._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error('Failed to save change')
    } catch (err) {
      setError(err.message || 'Failed to save change')
      setSubmissions((prev) => prev.map((s) => (s._id === submission._id ? { ...s, [field]: submission[field] } : s)))
    } finally {
      setSavingId(null)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return submissions
    return submissions.filter((s) =>
      [s.clientName, s.locationName, s.market, s.implementationSpecialist, s.configurationStatus, s.accountOnboarded].some((v) =>
        (v || '').toLowerCase().includes(q),
      ),
    )
  }, [submissions, search])

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>QA Queue</h1>
              <p>Verify each location&apos;s configuration and sign off on onboarding.</p>
            </div>
          </div>

          {error && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error}
            </div>
          )}

          <div className="dash-table-card">
            <div className="dash-table-toolbar">
              <div className="dash-search">
                <i className="ti ti-search"></i>
                <input
                  type="text"
                  placeholder="Search by client, location, market, specialist…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="dash-count-label">
                {filtered.length} of {submissions.length} entr{submissions.length === 1 ? 'y' : 'ies'}
              </div>
            </div>

            {loading ? (
              <div className="dash-empty">Loading…</div>
            ) : submissions.length === 0 ? (
              <div className="dash-empty">
                <i className="ti ti-file-off" style={{ fontSize: 28 }}></i>
                <p>No implementation requests yet.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="dash-empty">
                <p>No submissions match &quot;{search}&quot;.</p>
              </div>
            ) : (
              <CustomScrollbar horizontal className="dash-table-scroll">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Location</th>
                      <th>Market</th>
                      <th>Submitted</th>
                      <th>Specialist</th>
                      <th>Configuration Status</th>
                      <th>Account Onboarded</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s._id}>
                        <td>{s.clientName || 'Untitled'}</td>
                        <td>{s.locationName || '—'}</td>
                        <td>{s.market || '—'}</td>
                        <td>{formatDate(s.createdAt)}</td>
                        <td>{s.implementationSpecialist || '—'}</td>
                        <td>{s.configurationStatus ? <span className="status-badge">{s.configurationStatus}</span> : '—'}</td>
                        <td>
                          <select
                            className="inline-edit-select"
                            value={s.accountOnboarded || ''}
                            disabled={savingId === s._id}
                            onChange={(e) => saveField(s, 'accountOnboarded', e.target.value)}
                          >
                            {ACCOUNT_ONBOARDED_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt || 'Not set'}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="dash-table-actions">
                          <button type="button" className="btn-sm" onClick={() => setViewing(s)}>
                            <i className="ti ti-eye"></i> View
                          </button>
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

      <SubmissionDetailModal submission={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}
