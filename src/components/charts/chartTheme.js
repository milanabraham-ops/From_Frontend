// Validated categorical palette (see dataviz skill) — 8 hues in a fixed, CVD-safe order.
// Only the first 3 slots are used for all-pairs forms (radar) where every series can sit
// next to every other; bar charts here are single-series so they use the app's own accent.
export const CATEGORICAL = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

// Ordinal ramp for the Configuration Status funnel (Not Taken -> Not Started -> In Progress ->
// On Hold -> QA -> Completed) — one hue, monotone lightness, since the order of these buckets
// is meaningful. Steps drawn from the validated sequential ramp (see dataviz skill): light stays
// >= step 250 (2:1 floor), dark stays <= step 600, both requirements for an ordinal ramp.
export const STATUS_ORDINAL = {
  light: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#123a6e', '#08203f'],
  dark: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95'],
}

export function categoricalColor(theme, index) {
  const set = CATEGORICAL[theme] || CATEGORICAL.dark
  return set[index % set.length]
}

export function statusOrdinalColor(theme, index) {
  const set = STATUS_ORDINAL[theme] || STATUS_ORDINAL.dark
  return set[Math.min(index, set.length - 1)]
}

export const STATUS_ORDER = ['Not Taken', 'Not Started', 'In Progress', 'On Hold', 'QA', 'Completed']

export const RANGE_OPTIONS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All time' },
]

export function formatCompact(n) {
  if (n === null || n === undefined) return '—'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}
