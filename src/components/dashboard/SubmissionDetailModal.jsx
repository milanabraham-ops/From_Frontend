import { REVIEW_SECTIONS } from '../form/reviewSections'

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
          {REVIEW_SECTIONS.map((section) => (
            <div className="review-section" key={section.title}>
              <div className="review-section-header">
                <h3>{section.title}</h3>
              </div>
              <div className="review-list">
                {section.fields.map((f) => {
                  const value = f.get(submission)
                  return (
                    <div className="review-row" key={f.label}>
                      <span className="review-label">{f.label}</span>
                      <span className={`review-value${value ? '' : ' empty'}`}>{value || 'Not provided'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
