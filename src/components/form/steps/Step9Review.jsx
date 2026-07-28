import { REVIEW_SECTIONS } from '../reviewSections'

export default function Step9Review({ data, goToStep }) {
  return (
    <div className="section visible">
      <div className="section-title">Review & Submit</div>
      <div className="section-sub">Double-check everything below. Click Edit on any section to jump back and make changes.</div>

      {REVIEW_SECTIONS.map((section) => (
        <div className="review-section" key={section.title}>
          <div className="review-section-header">
            <h3>{section.title}</h3>
            <button type="button" className="btn-sm" onClick={() => goToStep(section.step)}>
              <i className="ti ti-pencil"></i> Edit
            </button>
          </div>
          <div className="review-list">
            {section.fields.map((f) => {
              const value = f.get(data)
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
  )
}
