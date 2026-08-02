import { useRef, useState } from 'react'
import { formatCompact } from './chartTheme'

const SIZE = 200
const STROKE = 26
const R = (SIZE - STROKE) / 2
const CX = SIZE / 2
const CY = SIZE / 2
const GAP_DEG = 2 // small surface-color gap between segments

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const start = polarToCartesian(cx, cy, r, endDeg)
  const end = polarToCartesian(cx, cy, r, startDeg)
  const largeArc = endDeg - startDeg <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

// Part-to-whole donut for an ORDINAL breakdown (status funnel) — one hue, monotone lightness,
// since the segment order (Not Taken -> ... -> Completed) carries meaning. Centered total
// doubles as the headline number so the chart isn't the only place the total lives.
export default function DonutChart({ segments, centerLabel = 'Total' }) {
  const [hover, setHover] = useState(null)
  const containerRef = useRef(null)
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  if (total === 0) {
    return <div className="chart-empty">No data for this period.</div>
  }

  let cursor = 0
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const sweep = (seg.value / total) * 360
      const startDeg = cursor + GAP_DEG / 2
      const endDeg = cursor + sweep - GAP_DEG / 2
      cursor += sweep
      return { ...seg, startDeg: Math.max(startDeg, cursor - sweep), endDeg: Math.max(endDeg, startDeg + 0.01) }
    })

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label="Status breakdown donut chart">
        {arcs.map((seg) => (
          <path
            key={seg.label}
            className="chart-donut-seg"
            d={arcPath(CX, CY, R, seg.startDeg, seg.endDeg)}
            fill="none"
            stroke={seg.color}
            strokeWidth={STROKE}
            onMouseMove={(e) => {
              const rect = containerRef.current.getBoundingClientRect()
              setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: seg.label, value: seg.value })
            }}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <text x={CX} y={CY - 4} textAnchor="middle" className="chart-donut-center-value">
          {formatCompact(total)}
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" className="chart-donut-center-label">
          {centerLabel}
        </text>
      </svg>

      <div className="chart-legend" style={{ flexDirection: 'column', marginTop: 0 }}>
        {segments.map((seg) => (
          <div className="chart-legend-item" key={seg.label}>
            <span className="chart-legend-swatch" style={{ background: seg.color }}></span>
            {seg.label}: {formatCompact(seg.value)}
          </div>
        ))}
      </div>

      {hover && (
        <div className="chart-tooltip" style={{ left: hover.x + 12, top: hover.y - 10 }}>
          <div className="chart-tooltip-value">{formatCompact(hover.value)}</div>
          <div className="chart-tooltip-label">{hover.label}</div>
        </div>
      )}
    </div>
  )
}
