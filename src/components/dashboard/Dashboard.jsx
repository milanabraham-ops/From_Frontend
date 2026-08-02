import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, API_URL } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import ConfirmDialog from '../common/ConfirmDialog'
import CustomScrollbar from '../common/CustomScrollbar'
import '../form/form.css'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusBadgeClass(status) {
  return `status-badge${(status || '').trim().toUpperCase() === 'ON HOLD' ? ' hold' : ''}`
}

const COLUMNS = [
  { key: 'clientName', label: 'Client' },
  { key: 'locationName', label: 'Location' },
  { key: 'market', label: 'Market' },
  { key: 'poc', label: 'POC' },
  { key: 'createdAt', label: 'Submitted' },
  { key: 'implementationSpecialist', label: 'Specialist' },
  { key: 'configurationStatus', label: 'Status' },
  { key: 'qaAgent', label: 'Reviewed By' },
  { key: 'accountOnboarded', label: 'Onboarded' },
]

export default function Dashboard() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState(null)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load(isBackgroundRefresh) {
      if (!isBackgroundRefresh) setLoading(true)
      try {
        const [subsRes, groupsRes] = await Promise.all([
          fetch(`${API_URL}/submissions`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/groups`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (!subsRes.ok || !groupsRes.ok) throw new Error('Failed to load submissions')
        const subsBody = await subsRes.json()
        const groupsBody = await groupsRes.json()
        if (!cancelled) {
          setSubmissions(Array.isArray(subsBody) ? subsBody : subsBody.submissions || [])
          setGroups(Array.isArray(groupsBody) ? groupsBody : [])
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

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortIndicator = (key) => (sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '')

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`${API_URL}/submissions/${pendingDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete submission')
      setSubmissions((prev) => prev.filter((s) => s._id !== pendingDelete._id))
      setPendingDelete(null)
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete submission')
    } finally {
      setDeleting(false)
    }
  }

  const confirmDeleteGroup = async () => {
    if (!pendingDeleteGroup) return
    setDeletingGroup(true)
    setDeleteError('')
    try {
      const res = await fetch(`${API_URL}/groups/${pendingDeleteGroup._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete group')
      setGroups((prev) => prev.filter((g) => g._id !== pendingDeleteGroup._id))
      setPendingDeleteGroup(null)
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete group')
    } finally {
      setDeletingGroup(false)
    }
  }

  const rows = useMemo(
    () => [
      ...submissions.map((s) => ({ kind: 'submission', ...s })),
      ...groups.map((g) => ({ kind: 'group', ...g })),
    ],
    [submissions, groups],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.clientName, r.locationName, r.market, r.poc, r.implementationSpecialist, r.configurationStatus, r.accountOnboarded].some(
        (v) => (v || '').toLowerCase().includes(q),
      ),
    )
  }, [rows, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const av = (a[sortKey] || '').toString().toLowerCase()
      const bv = (b[sortKey] || '').toString().toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [filtered, sortKey, sortDir])

  const totalLocations = useMemo(
    () => submissions.length + groups.reduce((sum, g) => sum + (g.locationCount || 0), 0),
    [submissions, groups],
  )

  const uniqueAccounts = submissions.length + groups.length

  const thisMonthCount = useMemo(() => {
    const now = new Date()
    const standalone = submissions.filter((s) => {
      if (!s.createdAt) return false
      const d = new Date(s.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const grouped = groups.reduce((sum, g) => sum + (g.locationsThisMonth || 0), 0)
    return standalone + grouped
  }, [submissions, groups])

  const mostRecent = useMemo(() => {
    const dates = [
      ...submissions.map((s) => s.createdAt),
      ...groups.map((g) => g.mostRecentLocationAt),
    ].filter(Boolean)
    if (!dates.length) return null
    return dates.reduce((latest, d) => (new Date(d) > new Date(latest) ? d : latest))
  }, [submissions, groups])

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
        <TopUserBar />
        <div className="dash-main-header">
          <div>
            <h1>Implementation Setup</h1>
            <p>Your submitted and in-progress location requests.</p>
          </div>
        </div>

        <div className="dash-stats-row">
          <div className="stat-tile">
            <div className="stat-value">{totalLocations}</div>
            <div className="stat-label">Total Locations</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{uniqueAccounts}</div>
            <div className="stat-label">Unique Accounts</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{thisMonthCount}</div>
            <div className="stat-label">Submitted This Month</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{mostRecent ? formatDate(mostRecent) : '—'}</div>
            <div className="stat-label">Most Recent Submission</div>
          </div>
        </div>

        {error && (
          <div className="info-box error">
            <i className="ti ti-alert-circle"></i>
            {error}
          </div>
        )}

        {deleteError && (
          <div className="info-box error">
            <i className="ti ti-alert-circle"></i>
            {deleteError}
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
            <div className="dash-count-label">
              {sorted.length} of {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
            </div>
          </div>

          {loading ? (
            <div className="dash-empty">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="dash-empty">
              <i className="ti ti-file-off" style={{ fontSize: 28 }}></i>
              <p>You haven&apos;t submitted any implementation requests yet.</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="dash-empty">
              <p>No submissions match &quot;{search}&quot;.</p>
            </div>
          ) : (
            <CustomScrollbar horizontal className="dash-table-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    {COLUMNS.map((c) => (
                      <th key={c.key} onClick={() => toggleSort(c.key)}>
                        {c.label} {sortIndicator(c.key)}
                      </th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) =>
                    r.kind === 'group' ? (
                      <tr key={r._id}>
                        <td>{r.clientName || 'Untitled'}</td>
                        <td>
                          <span className="group-badge">
                            <i className="ti ti-building-community"></i>
                            Group · {r.locationCount || 0}
                            {r.expectedLocationCount ? ` of ${r.expectedLocationCount}` : ''} location
                            {r.locationCount === 1 && !r.expectedLocationCount ? '' : 's'}
                          </span>
                        </td>
                        <td>{r.markets?.length ? r.markets.join(', ') : '—'}</td>
                        <td>{r.pocs?.length ? r.pocs.join(', ') : '—'}</td>
                        <td>{formatDate(r.mostRecentLocationAt || r.createdAt)}</td>
                        <td>{r.specialists?.length ? r.specialists.join(', ') : '—'}</td>
                        <td>{r.configurationStatus ? <span className={statusBadgeClass(r.configurationStatus)}>{r.configurationStatus}</span> : '—'}</td>
                        <td>{r.qaAgents?.length ? r.qaAgents.join(', ') : '—'}</td>
                        <td>{r.accountOnboarded ? <span className="status-badge">{r.accountOnboarded}</span> : '—'}</td>
                        <td className="dash-table-actions">
                          <button type="button" className="btn-sm" onClick={() => navigate(`/groups/${r._id}`)}>
                            <i className="ti ti-list-details"></i> View Locations
                          </button>
                          <button type="button" className="btn-sm danger" onClick={() => setPendingDeleteGroup(r)}>
                            <i className="ti ti-trash"></i> Delete
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={r._id}>
                        <td>{r.clientName || 'Untitled'}</td>
                        <td>{r.locationName || '—'}</td>
                        <td>{r.market || '—'}</td>
                        <td>{r.poc || '—'}</td>
                        <td>{formatDate(r.createdAt)}</td>
                        <td>{r.implementationSpecialist || '—'}</td>
                        <td>{r.configurationStatus ? <span className={statusBadgeClass(r.configurationStatus)}>{r.configurationStatus}</span> : '—'}</td>
                        <td>{r.qaAgent || '—'}</td>
                        <td>{r.accountOnboarded ? <span className="status-badge">{r.accountOnboarded}</span> : '—'}</td>
                        <td className="dash-table-actions">
                          <Link to={`/submissions/${r._id}`} className="btn-sm">
                            <i className="ti ti-pencil"></i> Edit
                          </Link>
                          <button
                            type="button"
                            className="btn-sm danger"
                            onClick={() => {
                              setDeleteError('')
                              setPendingDelete(r)
                            }}
                          >
                            <i className="ti ti-trash"></i> Delete
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </CustomScrollbar>
          )}
        </div>
      </CustomScrollbar>
      </main>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete submission?"
        message={`Are you sure you want to remove ${pendingDelete?.clientName || 'this submission'}${
          pendingDelete?.locationName ? ` (${pendingDelete.locationName})` : ''
        }? This will also remove it from the Google Sheet and cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={!!pendingDeleteGroup}
        title="Delete group?"
        message={`This will permanently delete "${pendingDeleteGroup?.clientName}" and all ${
          pendingDeleteGroup?.locationCount || 0
        } of its location${pendingDeleteGroup?.locationCount === 1 ? '' : 's'}, from MongoDB and the Google Sheet. This cannot be undone.`}
        confirmLabel="Delete Group"
        danger
        busy={deletingGroup}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setPendingDeleteGroup(null)}
      />
    </div>
  )
}
