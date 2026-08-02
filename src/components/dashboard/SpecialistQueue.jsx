import { useEffect, useMemo, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import SubmissionDetailModal from './SubmissionDetailModal'
import { isMine } from '../../lib/isMine'
import '../form/form.css'

// Every state a specialist can set directly from the dropdown. Picking "QA" here is the
// handoff itself — no separate "Send to QA" action. "Not Taken" and "Completed" aren't in this
// list since they're not something a specialist sets themselves (pre-assignment / QA's call).
const CONFIG_STATUS_OPTIONS = ['Not Started', 'In Progress', 'On Hold', 'QA']

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function normalize(value) {
  return (value || '').trim().toUpperCase()
}

// A location has left the specialist's active queue once it's reached QA/Completed, or is
// paused mid-QA-review (On Hold with statusBeforeHold === 'QA') — a specialist-side hold
// (statusBeforeHold is Not Started/In Progress) stays visible here, since it's still theirs.
function isHandedOffToQA(s) {
  const status = normalize(s.configurationStatus)
  if (status === 'QA' || status === 'COMPLETED') return true
  return status === 'ON HOLD' && normalize(s.statusBeforeHold) === 'QA'
}

export default function SpecialistQueue() {
  const { token, user } = useAuth()
  const { theme } = useTheme()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('all')
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

  const saveFields = async (submission, updates) => {
    setSubmissions((prev) => prev.map((s) => (s._id === submission._id ? { ...s, ...updates } : s)))
    setSavingId(submission._id)
    setError('')
    try {
      const res = await fetch(`${API_URL}/submissions/${submission._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to save change')
    } catch (err) {
      setError(err.message || 'Failed to save change')
      const revert = Object.fromEntries(Object.keys(updates).map((k) => [k, submission[k]]))
      setSubmissions((prev) => prev.map((s) => (s._id === submission._id ? { ...s, ...revert } : s)))
    } finally {
      setSavingId(null)
    }
  }

  const saveField = (submission, field, value) => saveFields(submission, { [field]: value })

  const takeOver = (submission) =>
    saveFields(submission, { implementationSpecialist: user.name, configurationStatus: 'Not Started' })

  // One dropdown drives the whole specialist-side lifecycle, including the QA handoff itself.
  // Picking "On Hold" remembers what it was paused from; picking anything else while paused
  // clears that memory (it's only meaningful while actually on hold).
  const changeStatus = (s, value) => {
    const wasOnHold = normalize(s.configurationStatus) === 'ON HOLD'
    const updates = { configurationStatus: value }
    if (value === 'On Hold') updates.statusBeforeHold = s.configurationStatus
    else if (wasOnHold) updates.statusBeforeHold = ''
    saveFields(s, updates)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    // Show requests that haven't been handed off to QA yet (or paused mid-QA-review)
    let base = submissions.filter((s) => !isHandedOffToQA(s))

    if (scope === 'mine') {
      base = base.filter((s) => isMine(s.implementationSpecialist, user?.name))
    }

    if (!q) return base
    return base.filter((s) =>
      [s.clientName, s.locationName, s.market, s.poc, s.implementationSpecialist, s.configurationStatus, s.qaAgent].some(
        (v) => (v || '').toLowerCase().includes(q),
      ),
    )
  }, [submissions, search, scope, user])

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>Configuration Requests</h1>
              <p>Set who is configuring each location and where they stand.</p>
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
                  placeholder="Search by client, location, market, POC…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="scope-toggle">
                <button
                  type="button"
                  className={`scope-toggle-btn ${scope === 'all' ? 'active' : ''}`}
                  onClick={() => setScope('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`scope-toggle-btn ${scope === 'mine' ? 'active' : ''}`}
                  onClick={() => setScope('mine')}
                >
                  Mine
                </button>
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
                      <th>POC</th>
                      <th>Submitted</th>
                      <th>Specialist</th>
                      <th>Configuration Status</th>
                      <th>QA Agent</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const status = normalize(s.configurationStatus)
                      const onHold = status === 'ON HOLD'
                      return (
                        <tr key={s._id}>
                          <td>{s.clientName || 'Untitled'}</td>
                          <td>{s.locationName || '—'}</td>
                          <td>{s.market || '—'}</td>
                          <td>{s.poc || '—'}</td>
                          <td>{formatDate(s.createdAt)}</td>
                          <td>
                            {!s.implementationSpecialist ? (
                              <button type="button" className="btn-sm" disabled={savingId === s._id} onClick={() => takeOver(s)}>
                                <i className="ti ti-hand-stop"></i> Take Over
                              </button>
                            ) : (
                              <input
                                type="text"
                                className="inline-edit-input"
                                defaultValue={s.implementationSpecialist || ''}
                                disabled={savingId === s._id}
                                placeholder="Unassigned"
                                onBlur={(e) => {
                                  const value = e.target.value.trim()
                                  if (value !== (s.implementationSpecialist || '')) saveField(s, 'implementationSpecialist', value)
                                }}
                              />
                            )}
                          </td>
                          <td>
                            <select
                              className={`inline-edit-select${onHold ? ' hold' : ''}`}
                              value={s.configurationStatus || 'Not Started'}
                              disabled={savingId === s._id || !s.implementationSpecialist}
                              onChange={(e) => changeStatus(s, e.target.value)}
                            >
                              {CONFIG_STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>{s.qaAgent || '—'}</td>
                          <td className="dash-table-actions">
                            <button type="button" className="btn-sm" onClick={() => setViewing(s)}>
                              <i className="ti ti-eye"></i> View
                            </button>
                          </td>
                        </tr>
                      )
                    })}
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
