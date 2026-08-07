import { useEffect, useMemo, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import SubmissionDetailModal from './SubmissionDetailModal'
import MessageComposeModal from '../common/MessageComposeModal'
import { useToast } from '../../context/ToastContext'
import { useNotifications } from '../../context/NotificationContext'
import { isMine } from '../../lib/isMine'
import { reassignOptions } from '../../lib/reassignOptions'
import SelectInput from '../common/SelectInput'
import '../form/form.css'

// Every state a specialist can set directly from the dropdown. Picking "QA" here is the
// handoff itself — no separate "Send to QA" action. "Not Taken" and "Completed" aren't in this
// list since they're not something a specialist sets themselves (pre-assignment / QA's call).
const CONFIG_STATUS_OPTIONS = ['Not Started', 'In Progress', 'On Hold', 'QA']

// Account Onboarded belongs to whoever is actually working the account, not just QA — a
// specialist who learns the client's onboarding state while configuring can set it too.
const ACCOUNT_ONBOARDED_OPTIONS = ['', 'Open', 'Closed']

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function normalize(value) {
  return (value || '').trim().toUpperCase()
}

// A location is out of the specialist's hands once it's reached QA/Completed, or is paused
// mid-QA-review (On Hold with statusBeforeHold === 'QA') — a specialist-side hold
// (statusBeforeHold is Not Started/In Progress) is still theirs to edit. Every submission stays
// visible in the table regardless (see all accounts, like admin); this only gates editing.
function isPastSpecialistStage(s) {
  const status = normalize(s.configurationStatus)
  if (status === 'QA' || status === 'COMPLETED') return true
  return status === 'ON HOLD' && normalize(s.statusBeforeHold) === 'QA'
}

export default function SpecialistQueue() {
  const { token, user } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const { unseenIds, markSeen } = useNotifications()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('all')
  const [savingId, setSavingId] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [handoffTarget, setHandoffTarget] = useState(null)
  const [handoffMessage, setHandoffMessage] = useState('')
  const [sendingHandoff, setSendingHandoff] = useState(false)
  // Everyone assignable to QA/configuration work (qa, specialist, admin) — for the reassign
  // dropdown. Refetched on the same poll as submissions, so a newly added agent shows up here
  // without needing a reload.
  const [agentNames, setAgentNames] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load(isBackgroundRefresh) {
      if (!isBackgroundRefresh) setLoading(true)
      try {
        const [subsRes, agentsRes] = await Promise.all([apiFetch(`${API_URL}/submissions`), apiFetch(`${API_URL}/agents`)])
        if (!subsRes.ok) throw new Error('Failed to load submissions')
        const body = await subsRes.json()
        const agentsBody = agentsRes.ok ? await agentsRes.json() : []
        if (!cancelled) {
          setSubmissions(Array.isArray(body) ? body : [])
          if (Array.isArray(agentsBody)) setAgentNames(agentsBody.map((a) => a.name))
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
      const res = await apiFetch(`${API_URL}/submissions/${submission._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to save change')
      showToast('Saved.')
      return true
    } catch (err) {
      const message = err.message || 'Failed to save change'
      setError(message)
      showToast(message, 'error')
      const revert = Object.fromEntries(Object.keys(updates).map((k) => [k, submission[k]]))
      setSubmissions((prev) => prev.map((s) => (s._id === submission._id ? { ...s, ...revert } : s)))
      return false
    } finally {
      setSavingId(null)
    }
  }

  const saveField = (submission, field, value) => saveFields(submission, { [field]: value })

  const takeOver = (submission) => {
    markSeen('newRequest', submission._id)
    return saveFields(submission, { implementationSpecialist: user.name, configurationStatus: 'Not Started' })
  }

  // One dropdown drives the whole specialist-side lifecycle, except the QA handoff itself —
  // picking "QA" opens the message-compose modal instead of saving directly, since that
  // transition always posts a (editable) note to the QA/specialist Chat space.
  const changeStatus = (s, value) => {
    if (value === 'QA') {
      setHandoffTarget(s)
      setHandoffMessage(`<users/all> *${s.clientName || 'Untitled'} (${s.locationName || 'Untitled location'})* has been configured by *${user.name}* and is ready for QA review.`)
      return
    }
    const wasOnHold = normalize(s.configurationStatus) === 'ON HOLD'
    const updates = { configurationStatus: value }
    if (value === 'On Hold') updates.statusBeforeHold = s.configurationStatus
    else if (wasOnHold) updates.statusBeforeHold = ''
    saveFields(s, updates)
  }

  const confirmHandoff = async () => {
    if (!handoffTarget) return
    setSendingHandoff(true)
    const wasOnHold = normalize(handoffTarget.configurationStatus) === 'ON HOLD'
    const updates = { configurationStatus: 'QA', qaHandoffMessage: handoffMessage }
    if (wasOnHold) updates.statusBeforeHold = ''
    const ok = await saveFields(handoffTarget, updates)
    setSendingHandoff(false)
    if (ok) setHandoffTarget(null)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    // "All" shows every account, same as admin. "Mine" is your full history — everything you've
    // ever been the specialist on, active or long since handed off — not just your current queue.
    let base = submissions
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
                      <th>Account Onboarded</th>
                      <th>QA Agent</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const status = normalize(s.configurationStatus)
                      const onHold = status === 'ON HOLD'
                      const pastStage = isPastSpecialistStage(s)
                      const statusOptions = CONFIG_STATUS_OPTIONS.includes(s.configurationStatus)
                        ? CONFIG_STATUS_OPTIONS
                        : [...CONFIG_STATUS_OPTIONS, s.configurationStatus || 'Not Started']
                      return (
                        <tr key={s._id}>
                          <td>
                            {(unseenIds.newRequest.has(s._id) || unseenIds.comment.has(s._id)) && (
                              <span className="row-badges">
                                {unseenIds.newRequest.has(s._id) && <span className="dash-nav-badge" title="New request" />}
                                {unseenIds.comment.has(s._id) && <span className="dash-nav-badge comment" title="New comment" />}
                              </span>
                            )}
                            {s.clientName || 'Untitled'}
                            {s.isTestData && <span className="you-badge">test</span>}
                          </td>
                          <td>{s.locationName || '—'}</td>
                          <td>{s.market || '—'}</td>
                          <td>{s.poc || '—'}</td>
                          <td>{formatDate(s.createdAt)}</td>
                          <td>
                            {!s.implementationSpecialist ? (
                              <button type="button" className="btn-sm" disabled={savingId === s._id} onClick={() => takeOver(s)}>
                                <i className="ti ti-hand-stop"></i> Take Over
                              </button>
                            ) : isMine(s.implementationSpecialist, user?.name) ? (
                              <SelectInput
                                className="inline-edit-select"
                                value={s.implementationSpecialist || ''}
                                disabled={savingId === s._id}
                                onChange={(v) => saveField(s, 'implementationSpecialist', v)}
                                options={reassignOptions(agentNames, s.implementationSpecialist)}
                              />
                            ) : (
                              <span className="review-value">{s.implementationSpecialist}</span>
                            )}
                          </td>
                          <td>
                            <SelectInput
                              className={`inline-edit-select${onHold ? ' hold' : ''}`}
                              value={s.configurationStatus || 'Not Started'}
                              disabled={
                                savingId === s._id ||
                                !s.implementationSpecialist ||
                                pastStage ||
                                !isMine(s.implementationSpecialist, user?.name)
                              }
                              onChange={(v) => changeStatus(s, v)}
                              options={statusOptions}
                            />
                          </td>
                          <td>
                            <SelectInput
                              className="inline-edit-select"
                              value={s.accountOnboarded || ''}
                              disabled={
                                savingId === s._id ||
                                !s.implementationSpecialist ||
                                status === 'COMPLETED' ||
                                !isMine(s.implementationSpecialist, user?.name)
                              }
                              onChange={(v) => saveField(s, 'accountOnboarded', v)}
                              options={ACCOUNT_ONBOARDED_OPTIONS.map((opt) => ({ value: opt, label: opt || 'Not set' }))}
                            />
                          </td>
                          <td>{s.qaAgent || '—'}</td>
                          <td className="dash-table-actions">
                            <button
                              type="button"
                              className="btn-sm"
                              onClick={() => {
                                setViewing(s)
                                markSeen('newRequest', s._id)
                                markSeen('comment', s._id)
                              }}
                            >
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

      <SubmissionDetailModal
        submission={viewing}
        onClose={() => setViewing(null)}
        onCommentPosted={(updated) => {
          setViewing(updated)
          setSubmissions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)))
        }}
      />

      <MessageComposeModal
        open={!!handoffTarget}
        title="Hand Off to QA"
        subtitle={`${handoffTarget?.clientName || 'Untitled'} (${handoffTarget?.locationName || 'Untitled location'}) · posted to the QA/specialist Chat space`}
        message={handoffMessage}
        onMessageChange={setHandoffMessage}
        busy={sendingHandoff}
        confirmLabel="Send & Hand Off"
        onConfirm={confirmHandoff}
        onCancel={() => setHandoffTarget(null)}
      />
    </div>
  )
}
