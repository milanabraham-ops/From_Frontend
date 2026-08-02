import { RANGE_OPTIONS } from './chartTheme'

// One filter row, above everything it scopes — every stat/chart on the page re-renders
// against the same range so the numbers always agree (see dataviz skill: interaction.md).
export default function TimeRangeFilter({ value, onChange }) {
  return (
    <div className="range-filter scope-toggle">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={`scope-toggle-btn ${value === opt.key ? 'active' : ''}`}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
