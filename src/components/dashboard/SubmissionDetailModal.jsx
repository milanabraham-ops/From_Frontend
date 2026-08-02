import SubmissionDetailSections from './SubmissionDetailSections'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function SubmissionDetailModal({ submission, onClose }) {
  if (!submission) return null

  return (
    <div className="confirm-dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-dialog detail-modal" role="dialog" aria-modal="true">
        <div className="detail-modal-header">
          <div>
            <h3 className="confirm-dialog-title">{submission.clientName || 'Untitled'}</h3>
            <p className="detail-modal-sub">
              {submission.locationName || 'Untitled location'} · Submitted {formatDate(submission.createdAt)}
            </p>
          </div>
          <button type="button" className="btn-sm" onClick={onClose}>
            <i className="ti ti-x"></i> Close
          </button>
        </div>

        <div className="detail-modal-body">
          <SubmissionDetailSections submission={submission} />
        </div>
      </div>
    </div>
  )
}
