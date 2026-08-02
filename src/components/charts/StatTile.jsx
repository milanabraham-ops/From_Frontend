import { formatCompact } from './chartTheme'

// Stat tile contract: icon chip (colored by tone) + label + value. The tone/icon give each
// tile a distinct identity at a glance instead of an undifferentiated row of identical gray
// boxes — 'tone' maps directly to the app's existing accent/success/warning/danger tokens so
// it stays consistent with badges and buttons elsewhere.
export default function StatTile({ label, value, suffix = '', icon, tone = 'accent' }) {
  return (
    <div className="stat-tile">
      {icon && (
        <div className={`stat-tile-icon tone-${tone}`}>
          <i className={`ti ${icon}`}></i>
        </div>
      )}
      <div className="stat-tile-body">
        <div className="stat-value">
          {typeof value === 'number' ? formatCompact(value) : value}
          {suffix}
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}
