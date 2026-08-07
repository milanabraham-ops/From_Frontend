import { useEffect, useMemo, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import ConfirmDialog from '../common/ConfirmDialog'
import QAReviewModal from './QAReviewModal'
import MessageComposeModal from '../common/MessageComposeModal'
import { useToast } from '../../context/ToastContext'
import { useNotifications } from '../../context/NotificationContext'
import { isMine } from '../../lib/isMine'
import { reassignOptions } from '../../lib/reassignOptions'
import SelectInput from '../common/SelectInput'
import '../form/form.css'

const ACCOUNT_ONBOARDED_OPTIONS = ['', 'Open', 'Closed']

// Every state a QA reviewer sets directly from the dropdown, once they've taken it over.
// "Not Taken" / "Not Started" / "In Progress" aren't here — those are the specialist's stage.
const CONFIG_STATUS_OPTIONS = ['QA', 'On Hold', 'Completed']

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function normalize(value) {
  return (value || '').trim().toUpperCase()
}

// In the shared QA queue — either actively in QA, or paused mid-review (On Hold with
// statusBeforeHold === 'QA'). A specialist-side hold never reaches this predicate since it
// never carries configurationStatus === 'QA' in the first place.
function isQAEligible(s) {
  const status = normalize(s.configurationStatus)
  if (status === 'QA') return true
  return status === 'ON HOLD' && normalize(s.statusBeforeHold) === 'QA'
}

export default function QAQueue() {
  const { token, user } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const { unseenIds, markSeen } = useNotifications()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('all')
  const [showOwnConfigs, setShowOwnConfigs] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [selfReviewTarget, setSelfReviewTarget] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [templateItems, setTemplateItems] = useState([])
  const [baseItems, setBaseItems] = useState([])
  const [handoverTarget, setHandoverTarget] = useState(null)
  const [handoverMessage, setHandoverMessage] = useState('')
  const [sendingHandover, setSendingHandover] = useState(false)
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

  // The QA checklist template is shared and growable across the whole team. A once-on-mount
  // fetch would go stale for anyone who already had this page open when a teammate added an
  // item, so this re-fetches on load AND every time a review is opened, not just once.
  const loadTemplateItems = () => {
    apiFetch(`${API_URL}/qa-checklist-items`)
      .then((res) => (res.ok ? res.json() : { items: [], baseItems: [] }))
      .then((body) => {
        setTemplateItems(Array.isArray(body.items) ? body.items : [])
        setBaseItems(Array.isArray(body.baseItems) ? body.baseItems : [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadTemplateItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const openReview = (s) => {
    loadTemplateItems()
    setViewing(s)
    markSeen('qaHandoff', s._id)
  }

  const addChecklistTemplateItem = async (name) => {
    const res = await apiFetch(`${API_URL}/qa-checklist-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: name }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Failed to add checklist item')
    setTemplateItems(Array.isArray(body.items) ? body.items : [])
    setBaseItems(Array.isArray(body.baseItems) ? body.baseItems : [])
  }

  // Keeps the review modal's submission in sync with the background refresh poll, so a stale
  // "already complete" state can't linger while it's open.
  useEffect(() => {
    if (!viewing) return
    const fresh = submissions.find((s) => s._id === viewing._id)
    if (fresh && fresh !== viewing) setViewing(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions])

  const saveFields = async (submission, updates, successMessage = 'Saved.') => {
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
      showToast(successMessage)
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

  // With multiple QA members watching the same queue, taking it over is now its own explicit
  // step — no more silently claiming a review on the first unrelated field edit.
  const takeOverQA = (s) => {
    markSeen('qaHandoff', s._id)
    return saveFields(s, { qaAgent: user.name })
  }

  // QA and On Hold are still quick, direct picks from the dropdown. Completing is not — it
  // always goes through the review modal (details + checklist together), so picking "Completed"
  // here just opens that instead of saving anything by itself.
  const changeStatus = (s, value) => {
    if (value === 'Completed') {
      openReview(s)
      return
    }
    const wasOnHold = normalize(s.configurationStatus) === 'ON HOLD'
    const updates = { configurationStatus: value }
    if (value === 'On Hold') updates.statusBeforeHold = 'QA'
    else if (wasOnHold) updates.statusBeforeHold = ''
    saveFields(s, updates)
  }

  const finalizeComplete = async (submission, checklist, message) => {
    setCompleting(true)
    const ok = await saveFields(
      submission,
      { configurationStatus: 'Completed', qaChecklist: checklist, qaResultMessage: message },
      'QA result sent.',
    )
    setCompleting(false)
    if (ok) setViewing(null)
  }

  // Completing work a QA member also configured themselves gets a confirmation step first —
  // this should only happen when the rest of the team is too busy to take it instead. The
  // checklist and message are already filled in by this point, so declining just returns to the
  // review modal with nothing lost.
  const requestMarkComplete = (checklist, message) => {
    if (!viewing) return
    if (isMine(viewing.implementationSpecialist, user?.name)) {
      setSelfReviewTarget({ submission: viewing, checklist, message })
      return
    }
    finalizeComplete(viewing, checklist, message)
  }

  const confirmSelfReview = () => {
    const target = selfReviewTarget
    setSelfReviewTarget(null)
    if (target) finalizeComplete(target.submission, target.checklist, target.message)
  }

  // Reopens a Completed account back to QA so the checklist can be redone — silent (no Chat
  // message), since the specialist already has the original errors/clarifications and doesn't
  // need a duplicate ping just for reopening; the NEXT completion message covers what changed.
  // The checklist itself is left exactly as it was — a recheck only means re-verifying whatever
  // was flagged as an error/clarification, not redoing every already-ok item from scratch, so the
  // first round's answers (and notes) stay visible rather than resetting to blank. Opens straight
  // into the review modal instead of leaving the reviewer to find and click "Review" separately.
  const recheck = (s) => {
    const reopened = { ...s, configurationStatus: 'QA' }
    openReview(reopened)
    saveFields(s, { configurationStatus: 'QA', isRecheck: true }, 'Reopened for recheck.')
  }

  const startHandover = (s) => {
    setHandoverTarget(s)
    setHandoverMessage(
      `<users/all> Hi Team, the implementation for *${s.clientName || 'Untitled'} (${s.locationName || 'Untitled location'})* is complete. Please reach out in case of any questions.`,
    )
  }

  const confirmHandover = async () => {
    if (!handoverTarget) return
    setSendingHandover(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions/${handoverTarget._id}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: handoverMessage }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to send handover')
      setSubmissions((prev) => prev.map((s) => (s._id === handoverTarget._id ? { ...s, pocHandoverAt: body.pocHandoverAt } : s)))
      showToast('Handed over to POC.')
      setHandoverTarget(null)
    } catch (err) {
      showToast(err.message || 'Failed to send handover', 'error')
    } finally {
      setSendingHandover(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    // Nothing here for QA until a specialist actually hands it off — a location still sitting
    // with the specialist (Not Started/In Progress/specialist-side On Hold) has no business
    // showing up in this queue, in either scope.
    let base = submissions.filter((s) => isQAEligible(s) || normalize(s.configurationStatus) === 'COMPLETED')
    if (scope === 'mine') {
      // Full history — active reviews and ones you've already completed, so this is also the
      // one place to look back at what you've reviewed.
      base = base.filter((s) => isMine(s.qaAgent, user?.name))
    } else if (!showOwnConfigs) {
      // A QA member who also configured this one shouldn't default into reviewing their own
      // work — it stays reachable via "Show my own configurations" for when others are busy.
      // Once someone has already taken it over, that risk is gone (someone else is doing the
      // review), so there's no more reason to keep it hidden from the specialist's own view.
      base = base.filter((s) => !(isQAEligible(s) && !s.qaAgent && isMine(s.implementationSpecialist, user?.name)))
    }
    if (!q) return base
    return base.filter((s) =>
      [s.clientName, s.locationName, s.market, s.implementationSpecialist, s.configurationStatus, s.accountOnboarded, s.qaAgent].some(
        (v) => (v || '').toLowerCase().includes(q),
      ),
    )
  }, [submissions, search, scope, showOwnConfigs, user])

  const hiddenOwnConfigCount = useMemo(() => {
    if (scope !== 'all' || showOwnConfigs) return 0
    return submissions.filter((s) => isQAEligible(s) && !s.qaAgent && isMine(s.implementationSpecialist, user?.name)).length
  }, [submissions, scope, showOwnConfigs, user])

  const viewingComplete = viewing && normalize(viewing.configurationStatus) === 'COMPLETED'
  const viewingTaken = Boolean(viewing?.qaAgent)

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>QA Requests</h1>
              <p>Verify each location&apos;s configuration and sign off on onboarding.</p>
            </div>
          </div>

          {error && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error}
            </div>
          )}

          {hiddenOwnConfigCount > 0 && (
            <div className="info-box">
              <i className="ti ti-info-circle"></i>
              {hiddenOwnConfigCount} submission{hiddenOwnConfigCount === 1 ? '' : 's'} you configured{' '}
              {hiddenOwnConfigCount === 1 ? 'is' : 'are'} hidden from this queue so someone else can review{' '}
              {hiddenOwnConfigCount === 1 ? 'it' : 'them'}.{' '}
              <button type="button" className="link-btn" onClick={() => setShowOwnConfigs(true)}>
                Show anyway
              </button>
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
              {scope === 'all' && (
                <label className="show-own-toggle">
                  <input type="checkbox" checked={showOwnConfigs} onChange={(e) => setShowOwnConfigs(e.target.checked)} />
                  Show my own configurations
                </label>
              )}
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
                <p>{scope === 'mine' ? "You haven't reviewed anything yet." : `No submissions match "${search}".`}</p>
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
                      <th>QA Agent</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const status = normalize(s.configurationStatus)
                      const onHold = status === 'ON HOLD'
                      const isComplete = status === 'COMPLETED'
                      const taken = Boolean(s.qaAgent)
                      return (
                        <tr key={s._id}>
                          <td>
                            {unseenIds.qaHandoff.has(s._id) && (
                              <span className="row-badges">
                                <span className="dash-nav-badge" title="New handoff" />
                              </span>
                            )}
                            {s.clientName || 'Untitled'}
                            {s.isTestData && <span className="you-badge">test</span>}
                          </td>
                          <td>{s.locationName || '—'}</td>
                          <td>{s.market || '—'}</td>
                          <td>{formatDate(s.createdAt)}</td>
                          <td>
                            {s.implementationSpecialist || '—'}
                            {isMine(s.implementationSpecialist, user?.name) && <span className="you-badge">you</span>}
                          </td>
                          <td>
                            <SelectInput
                              className={`inline-edit-select${onHold ? ' hold' : ''}`}
                              value={isComplete ? 'Completed' : onHold ? 'On Hold' : 'QA'}
                              disabled={savingId === s._id || !taken || isComplete || !isMine(s.qaAgent, user?.name)}
                              onChange={(v) => changeStatus(s, v)}
                              options={CONFIG_STATUS_OPTIONS}
                            />
                          </td>
                          <td>
                            <SelectInput
                              className="inline-edit-select"
                              value={s.accountOnboarded || ''}
                              disabled={savingId === s._id || isComplete || !taken || !isMine(s.qaAgent, user?.name)}
                              onChange={(v) => saveField(s, 'accountOnboarded', v)}
                              options={ACCOUNT_ONBOARDED_OPTIONS.map((opt) => ({ value: opt, label: opt || 'Not set' }))}
                            />
                          </td>
                          <td>
                            {!taken ? (
                              <button type="button" className="btn-sm" disabled={savingId === s._id} onClick={() => takeOverQA(s)}>
                                <i className="ti ti-hand-stop"></i> Take Over
                              </button>
                            ) : isMine(s.qaAgent, user?.name) ? (
                              <SelectInput
                                className="inline-edit-select"
                                value={s.qaAgent || ''}
                                disabled={savingId === s._id}
                                onChange={(v) => saveField(s, 'qaAgent', v)}
                                options={reassignOptions(agentNames, s.qaAgent)}
                              />
                            ) : (
                              <span className="review-value">{s.qaAgent}</span>
                            )}
                          </td>
                          <td className="dash-table-actions">
                            <button
                              type="button"
                              className="btn-sm"
                              disabled={taken && !isMine(s.qaAgent, user?.name)}
                              title={taken && !isMine(s.qaAgent, user?.name) ? `Taken by ${s.qaAgent}` : undefined}
                              onClick={() => openReview(s)}
                            >
                              <i className="ti ti-eye"></i> Review
                            </button>
                            {isComplete && (
                              <>
                                <button
                                  type="button"
                                  className="btn-sm"
                                  disabled={savingId === s._id || !isMine(s.qaAgent, user?.name)}
                                  title={!isMine(s.qaAgent, user?.name) ? `Taken by ${s.qaAgent}` : undefined}
                                  onClick={() => recheck(s)}
                                >
                                  <i className="ti ti-refresh"></i> Recheck
                                </button>
                                <button
                                  type="button"
                                  className="btn-sm"
                                  disabled={savingId === s._id || !isMine(s.qaAgent, user?.name)}
                                  title={!isMine(s.qaAgent, user?.name) ? `Taken by ${s.qaAgent}` : undefined}
                                  onClick={() => startHandover(s)}
                                >
                                  <i className="ti ti-send"></i> {s.pocHandoverAt ? 'Handover Again' : 'Handover'}
                                </button>
                              </>
                            )}
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

      <QAReviewModal
        submission={viewing}
        taken={viewingTaken}
        alreadyComplete={viewingComplete}
        busy={completing}
        templateItems={templateItems}
        baseItems={baseItems}
        onAddTemplateItem={addChecklistTemplateItem}
        onClose={() => setViewing(null)}
        onMarkComplete={requestMarkComplete}
        onCommentPosted={(updated) => {
          setViewing(updated)
          setSubmissions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)))
        }}
      />

      <ConfirmDialog
        open={!!selfReviewTarget}
        title="Reviewing Your Own Work"
        message={
          selfReviewTarget &&
          `You also configured "${selfReviewTarget.submission.clientName} - ${selfReviewTarget.submission.locationName}" as the specialist. Only QA your own work if the rest of the team is unavailable. Continue?`
        }
        confirmLabel="Yes, Mark Complete"
        cancelLabel="Cancel"
        onConfirm={confirmSelfReview}
        onCancel={() => setSelfReviewTarget(null)}
      />

      <MessageComposeModal
        open={!!handoverTarget}
        title="Handover to POC"
        subtitle={`${handoverTarget?.clientName || 'Untitled'} (${handoverTarget?.locationName || 'Untitled location'}) · posted to the POC Chat space`}
        message={handoverMessage}
        onMessageChange={setHandoverMessage}
        busy={sendingHandover}
        confirmLabel="Send Handover"
        onConfirm={confirmHandover}
        onCancel={() => setHandoverTarget(null)}
      />
    </div>
  )
}
