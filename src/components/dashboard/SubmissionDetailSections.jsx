import { REVIEW_SECTIONS } from '../form/reviewSections'

export default function SubmissionDetailSections({ submission }) {
  return (
    <>
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
    </>
  )
}
