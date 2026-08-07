import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import './form.css'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import ConfirmDialog from '../common/ConfirmDialog'
import SelectInput from '../common/SelectInput'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusBadgeClass(status) {
  return `status-badge${(status || '').trim().toUpperCase() === 'ON HOLD' ? ' hold' : ''}`
}

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const scrollRef = useRef(null)

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [cloneFrom, setCloneFrom] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [editingCount, setEditingCount] = useState(false)
  const [countDraft, setCountDraft] = useState('')
  const [pendingDeleteLocation, setPendingDeleteLocation] = useState(null)
  const [deletingLocation, setDeletingLocation] = useState(false)
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = async (isBackgroundRefresh) => {
    if (!isBackgroundRefresh) setLoading(true)
    setError('')
    try {
      const res = await apiFetch(`${API_URL}/groups/${id}`)
      if (!res.ok) throw new Error('Could not load this group')
      const body = await res.json()
      setGroup(body)
    } catch (err) {
      setError(err.message || 'Could not load this group')
    } finally {
      if (!isBackgroundRefresh) setLoading(false)
    }
  }

  useEffect(() => {
    load(false)
    // Keeps Configuration Status / Account Onboarded fresh if edited directly in the Sheet while
    // this page is open, same background-refresh pattern as the Dashboard.
    const interval = setInterval(() => load(true), 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  const startRename = () => {
    setNameDraft(group.clientName)
    setRenaming(true)
  }

  const saveRename = async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === group.clientName) {
      setRenaming(false)
      return
    }
    try {
      const res = await apiFetch(`${API_URL}/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: trimmed }),
      })
      if (!res.ok) throw new Error('Could not rename group')
      const updated = await res.json()
      setGroup((prev) => ({ ...prev, clientName: updated.clientName }))
      showToast('Renamed.')
    } catch (err) {
      const message = err.message || 'Could not rename group'
      setActionError(message)
      showToast(message, 'error')
    } finally {
      setRenaming(false)
    }
  }

  const startEditCount = () => {
    setCountDraft(group.expectedLocationCount ?? '')
    setEditingCount(true)
  }

  const saveCount = async () => {
    const trimmed = String(countDraft).trim()
    const value = trimmed === '' ? null : Number(trimmed)
    if (value === (group.expectedLocationCount ?? null)) {
      setEditingCount(false)
      return
    }
    try {
      const res = await apiFetch(`${API_URL}/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedLocationCount: value }),
      })
      const updated = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(updated.error || 'Could not update expected location count')
      setGroup((prev) => ({ ...prev, expectedLocationCount: updated.expectedLocationCount }))
      showToast('Saved.')
    } catch (err) {
      const message = err.message || 'Could not update expected location count'
      setActionError(message)
      showToast(message, 'error')
    } finally {
      setEditingCount(false)
    }
  }

  const confirmDeleteLocation = async () => {
    if (!pendingDeleteLocation) return
    setDeletingLocation(true)
    setActionError('')
    try {
      const res = await apiFetch(`${API_URL}/submissions/${pendingDeleteLocation._id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete location')
      setGroup((prev) => ({ ...prev, locations: prev.locations.filter((l) => l._id !== pendingDeleteLocation._id) }))
      showToast('Location deleted.')
      setPendingDeleteLocation(null)
    } catch (err) {
      const message = err.message || 'Failed to delete location'
      setActionError(message)
      showToast(message, 'error')
    } finally {
      setDeletingLocation(false)
    }
  }

  const confirmDeleteGroup = async () => {
    setDeletingGroup(true)
    setActionError('')
    try {
      const res = await apiFetch(`${API_URL}/groups/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete group')
      showToast('Group deleted.')
      navigate('/')
    } catch (err) {
      const message = err.message || 'Failed to delete group'
      setActionError(message)
      showToast(message, 'error')
      setDeletingGroup(false)
    }
  }

  if (loading) {
    return (
      <div className="voicestack-form dash-shell" data-theme={theme}>
        <Sidebar />
        <main className="dash-main">
          <CustomScrollbar vertical className="dash-main-scroll" ref={scrollRef}>
            <TopUserBar />
            <div className="dash-empty">Loading group…</div>
          </CustomScrollbar>
        </main>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="voicestack-form dash-shell" data-theme={theme}>
        <Sidebar />
        <main className="dash-main">
          <CustomScrollbar vertical className="dash-main-scroll" ref={scrollRef}>
            <TopUserBar />
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error || 'Group not found'}
            </div>
            <button type="button" className="btn" onClick={() => navigate('/')}>
              Back to Dashboard
            </button>
          </CustomScrollbar>
        </main>
      </div>
    )
  }

  const locations = group.locations || []

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />
      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll" ref={scrollRef}>
          <TopUserBar />

          <div className="dash-main-header">
            <div>
              <Link to="/" className="btn-sm" style={{ marginBottom: 10, display: 'inline-flex' }}>
                <i className="ti ti-arrow-left"></i> Back to Dashboard
              </Link>
              {renaming ? (
                <input
                  type="text"
                  value={nameDraft}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename()
                    if (e.key === 'Escape') setRenaming(false)
                  }}
                  style={{ fontSize: 22, fontWeight: 600, maxWidth: 420 }}
                />
              ) : (
                <h1 onClick={startRename} title="Click to rename" style={{ cursor: 'pointer' }}>
                  {group.clientName} <i className="ti ti-pencil" style={{ fontSize: 15, color: 'var(--text3)' }}></i>
                  {group.isTestData && <span className="you-badge">test</span>}
                </h1>
              )}
              <p>
                Multi-location group ·{' '}
                {editingCount ? (
                  <input
                    type="number"
                    min="1"
                    value={countDraft}
                    autoFocus
                    onChange={(e) => setCountDraft(e.target.value)}
                    onBlur={saveCount}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveCount()
                      if (e.key === 'Escape') setEditingCount(false)
                    }}
                    style={{ width: 60 }}
                  />
                ) : (
                  <>
                    {locations.length}
                    {group.expectedLocationCount ? ` of ${group.expectedLocationCount}` : ''} location
                    {locations.length === 1 && !group.expectedLocationCount ? '' : 's'}{' '}
                    <i
                      className="ti ti-pencil"
                      onClick={startEditCount}
                      title="Edit expected location count"
                      style={{ fontSize: 13, color: 'var(--text3)', cursor: 'pointer' }}
                    ></i>
                  </>
                )}
              </p>
            </div>
            <button type="button" className="btn-sm danger" onClick={() => setPendingDeleteGroup(true)}>
              <i className="ti ti-trash"></i> Delete Group
            </button>
          </div>

          {actionError && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {actionError}
            </div>
          )}

          <div className="dash-table-card">
            <div className="dash-table-toolbar">
              <div className="dash-count-label">Locations in this group</div>
              {!addOpen ? (
                <button
                  type="button"
                  className="btn-sm"
                  onClick={() => (locations.length === 0 ? navigate(`/groups/${id}/new`) : setAddOpen(true))}
                >
                  <i className="ti ti-plus"></i> Add Location
                </button>
              ) : (
                <div className="add-location-panel">
                  <Link to={`/groups/${id}/new`} className="btn-sm">
                    <i className="ti ti-file-plus"></i> Start Blank
                  </Link>
                  <SelectInput
                    value={cloneFrom}
                    onChange={setCloneFrom}
                    placeholder="Clone from…"
                    options={locations.map((l) => ({ value: l._id, label: l.locationName || 'Untitled' }))}
                  />
                  <Link
                    to={cloneFrom ? `/groups/${id}/new?cloneFrom=${cloneFrom}` : '#'}
                    className={`btn-sm ${!cloneFrom ? 'disabled' : ''}`}
                    onClick={(e) => !cloneFrom && e.preventDefault()}
                  >
                    Clone
                  </Link>
                  <button type="button" className="btn-sm" onClick={() => setAddOpen(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {locations.length === 0 ? (
              <div className="dash-empty">
                <i className="ti ti-map-pin-off" style={{ fontSize: 28 }}></i>
                <p>No locations added yet. Click &quot;Add Location&quot; to get started.</p>
              </div>
            ) : (
              <CustomScrollbar horizontal className="dash-table-scroll">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>Market</th>
                      <th>POC</th>
                      <th>Submitted</th>
                      <th>Specialist</th>
                      <th>Status</th>
                      <th>Account Onboarded</th>
                      <th>Reviewed By</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((l) => (
                      <tr key={l._id}>
                        <td>
                          {l.locationName || 'Untitled'}
                          {l.isTestData && <span className="you-badge">test</span>}
                        </td>
                        <td>{l.market || '—'}</td>
                        <td>{l.poc || '—'}</td>
                        <td>{formatDate(l.createdAt)}</td>
                        <td>{l.implementationSpecialist || '—'}</td>
                        <td>{l.configurationStatus ? <span className={statusBadgeClass(l.configurationStatus)}>{l.configurationStatus}</span> : '—'}</td>
                        <td>{l.accountOnboarded ? <span className="status-badge">{l.accountOnboarded}</span> : '—'}</td>
                        <td>{l.qaAgent || '—'}</td>
                        <td className="dash-table-actions">
                          <Link to={`/submissions/${l._id}`} className="btn-sm">
                            <i className="ti ti-pencil"></i> Edit
                          </Link>
                          <button type="button" className="btn-sm danger" onClick={() => setPendingDeleteLocation(l)}>
                            <i className="ti ti-trash"></i> Delete
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

      <ConfirmDialog
        open={!!pendingDeleteLocation}
        title="Delete location?"
        message="Are you sure about that?"
        confirmLabel="Delete"
        danger
        busy={deletingLocation}
        onConfirm={confirmDeleteLocation}
        onCancel={() => setPendingDeleteLocation(null)}
      />

      <ConfirmDialog
        open={pendingDeleteGroup}
        title="Delete group?"
        message="Are you sure about that?"
        confirmLabel="Delete Group"
        danger
        busy={deletingGroup}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setPendingDeleteGroup(false)}
      />
    </div>
  )
}
