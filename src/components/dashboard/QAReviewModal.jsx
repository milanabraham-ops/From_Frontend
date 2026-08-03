import { useEffect, useState } from 'react'
import SubmissionDetailSections from './SubmissionDetailSections'
import MessageComposeModal from '../common/MessageComposeModal'
import ConfirmDialog from '../common/ConfirmDialog'
import { QA_CHECKLIST_ITEMS } from '../../data/options'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Merges this account's saved checklist against the current shared template — any item added to
// the template since this account was last reviewed shows up here too (blank, ready to review),
// while anything the account already has that's since fallen off the template is still kept
// rather than silently dropping prior QA work.
function buildChecklist(templateItems, existingChecklist) {
  const items = templateItems && templateItems.length ? templateItems : QA_CHECKLIST_ITEMS
  const existingByName = new Map((existingChecklist || []).map((row) => [row.item.toLowerCase(), row]))
  const merged = items.map((item) => {
    const existing = existingByName.get(item.toLowerCase())
    return existing ? { ...existing } : { item, status: '', note: '' }
  })
  for (const row of existingChecklist || []) {
    if (!items.some((t) => t.toLowerCase() === row.item.toLowerCase())) merged.push({ ...row })
  }
  return merged
}

// Mirrors chatService.js's checklistSummary on the backend — used to seed the editable default
// message shown before the QA result actually posts to Chat.
function checklistSummary(checklist) {
  const errors = checklist.filter((row) => row.status === 'error')
  const clarifications = checklist.filter((row) => row.status === 'clarification')
  if (errors.length === 0 && clarifications.length === 0) return 'No errors.'

  const section = (title, items) => `${title}:\n${items.map((i) => `- ${i.item}: ${i.note || 'No detail provided'}`).join('\n')}`
  const parts = []
  if (errors.length > 0) parts.push(section('Errors', errors))
  if (clarifications.length > 0) parts.push(section('Clarifications', clarifications))
  return parts.join('\n\n')
}

// The single place a QA reviewer works from: the account's full configuration (read-only,
// same sections as the plain detail view) plus the QA checklist, so completing an account
// never requires switching between a "view details" modal and a separate "checklist" modal.
export default function QAReviewModal({ submission, taken, alreadyComplete, busy, templateItems, onAddTemplateItem, onClose, onMarkComplete }) {
  const [checklist, setChecklist] = useState(() => buildChecklist(templateItems, submission?.qaChecklist))
  const [newItem, setNewItem] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [addItemError, setAddItemError] = useState('')
  const [composingResult, setComposingResult] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState(null)

  useEffect(() => {
    if (submission) setChecklist(buildChecklist(templateItems, submission.qaChecklist))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission?._id])

  if (!submission) return null

  const setStatus = (index, status) => {
    setChecklist((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const nextStatus = row.status === status ? '' : status
        const nextNote = nextStatus === 'error' || nextStatus === 'clarification' ? row.note : ''
        return { ...row, status: nextStatus, note: nextNote }
      }),
    )
  }

  const setNote = (index, note) => setChecklist((prev) => prev.map((row, i) => (i === index ? { ...row, note } : row)))

  const confirmRemoveItem = () => {
    setChecklist((prev) => prev.filter((_, i) => i !== pendingRemoveIndex))
    setPendingRemoveIndex(null)
  }

  const addItem = async () => {
    const name = newItem.trim()
    if (!name) return
    if (checklist.some((row) => row.item.toLowerCase() === name.toLowerCase())) {
      setAddItemError('That item is already on the checklist.')
      return
    }
    setAddingItem(true)
    setAddItemError('')
    try {
      await onAddTemplateItem(name)
      setChecklist((prev) => [...prev, { item: name, status: '', note: '' }])
      setNewItem('')
    } catch (err) {
      setAddItemError(err.message || 'Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  const reviewedCount = checklist.filter((row) => row.status).length
  const allReviewed = reviewedCount === checklist.length
  const missingNotes = checklist.some((row) => (row.status === 'error' || row.status === 'clarification') && !row.note.trim())
  const locked = alreadyComplete || busy

  const label = `${submission.clientName || 'Untitled'} (${submission.locationName || 'Untitled location'})`

  const startComposeResult = () => {
    setResultMessage(`<users/all> QA review for *${label}* complete.\n\n${checklistSummary(checklist)}`)
    setComposingResult(true)
  }

  const confirmSendResult = () => {
    onMarkComplete(checklist, resultMessage)
  }

  return (
    <div className="confirm-dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="confirm-dialog detail-modal" role="dialog" aria-modal="true">
        <div className="detail-modal-header">
          <div>
            <h3 className="confirm-dialog-title">{submission.clientName || 'Untitled'}</h3>
            <p className="detail-modal-sub">
              {submission.locationName || 'Untitled location'} · Submitted {formatDate(submission.createdAt)}
            </p>
          </div>
          <button type="button" className="btn-sm" onClick={onClose} disabled={busy}>
            <i className="ti ti-x"></i> Close
          </button>
        </div>

        <div className="detail-modal-body">
          <SubmissionDetailSections submission={submission} />

          <div className="review-section">
            <div className="review-section-header">
              <h3>QA Checklist</h3>
              <span className="hint" style={{ margin: 0 }}>
                {reviewedCount} of {checklist.length} reviewed
              </span>
            </div>
            {checklist.map((row, i) => (
              <div className="qa-checklist-row" key={row.item}>
                <div className="qa-checklist-item-name">{row.item}</div>
                <div className="qa-checklist-choices">
                  <button
                    type="button"
                    className={`qa-checklist-choice ok${row.status === 'ok' ? ' active' : ''}`}
                    title="No error"
                    disabled={locked}
                    onClick={() => setStatus(i, 'ok')}
                  >
                    <i className="ti ti-check"></i>
                  </button>
                  <button
                    type="button"
                    className={`qa-checklist-choice clarification${row.status === 'clarification' ? ' active' : ''}`}
                    title="Clarification needed"
                    disabled={locked}
                    onClick={() => setStatus(i, 'clarification')}
                  >
                    <i className="ti ti-help-circle"></i>
                  </button>
                  <button
                    type="button"
                    className={`qa-checklist-choice error${row.status === 'error' ? ' active' : ''}`}
                    title="Error"
                    disabled={locked}
                    onClick={() => setStatus(i, 'error')}
                  >
                    <i className="ti ti-x"></i>
                  </button>
                  <button
                    type="button"
                    className={`qa-checklist-choice na${row.status === 'na' ? ' active' : ''}`}
                    title="Not applicable"
                    disabled={locked}
                    onClick={() => setStatus(i, 'na')}
                  >
                    <i className="ti ti-minus"></i>
                  </button>
                  <button
                    type="button"
                    className="btn-sm danger"
                    title="Remove this item from the checklist"
                    disabled={locked}
                    onClick={() => setPendingRemoveIndex(i)}
                  >
                    <i className="ti ti-trash"></i>
                  </button>
                </div>
                {(row.status === 'error' || row.status === 'clarification') && (
                  <textarea
                    className="qa-checklist-note"
                    value={row.note}
                    disabled={locked}
                    placeholder={row.status === 'error' ? 'What exactly is wrong?' : 'What needs clarifying?'}
                    onChange={(e) => setNote(i, e.target.value)}
                  />
                )}
              </div>
            ))}

            <div className="qa-checklist-add-row">
              <input
                type="text"
                className="inline-edit-input"
                placeholder="Add a checklist item for this and future reviews…"
                value={newItem}
                disabled={locked || addingItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
              />
              <button type="button" className="btn-sm" disabled={locked || addingItem || !newItem.trim()} onClick={addItem}>
                <i className="ti ti-plus"></i> {addingItem ? 'Adding…' : 'Add Item'}
              </button>
            </div>
            {addItemError && <div className="hint">{addItemError}</div>}
          </div>
        </div>

        <div style={{ marginTop: 12, flexShrink: 0 }}>
          {alreadyComplete ? (
            <div className="info-box">
              <i className="ti ti-circle-check"></i>
              This account has already been marked Completed.
            </div>
          ) : !taken ? (
            <div className="hint">Take over this review from the queue before marking it complete.</div>
          ) : (
            <>
              {!allReviewed && (
                <div className="hint">Mark every checklist item before completing ({checklist.length - reviewedCount} left).</div>
              )}
              {allReviewed && missingNotes && <div className="hint">Add a note for every error/clarification item.</div>}
            </>
          )}
          <div className="confirm-dialog-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Close
            </button>
            {!alreadyComplete && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !taken || !allReviewed || missingNotes}
                onClick={startComposeResult}
              >
                {busy ? 'Completing…' : 'Mark Complete'}
              </button>
            )}
          </div>
        </div>
      </div>

      <MessageComposeModal
        open={composingResult}
        title="QA Result"
        subtitle={`${label} · posted to the QA/specialist Chat space`}
        message={resultMessage}
        onMessageChange={setResultMessage}
        busy={busy}
        confirmLabel="Send & Complete"
        onConfirm={confirmSendResult}
        onCancel={() => setComposingResult(false)}
      />

      <ConfirmDialog
        open={pendingRemoveIndex !== null}
        title="Remove item?"
        message="Are you sure about that?"
        confirmLabel="Remove"
        danger
        onConfirm={confirmRemoveItem}
        onCancel={() => setPendingRemoveIndex(null)}
      />
    </div>
  )
}
