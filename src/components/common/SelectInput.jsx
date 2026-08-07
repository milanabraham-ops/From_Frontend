import { createPortal } from 'react-dom'
import { useDropdown } from '../../hooks/useDropdown'

// Custom-built replacement for a native <select> — a native select's open popup is rendered
// entirely by the browser/OS, so no page CSS can touch its position or corners (the same
// limitation that made the native <datalist> unfixable). This one is real HTML/CSS, so it opens
// with a gap below the field and rounded corners consistently everywhere it's used, and is
// portaled to document.body so it isn't clipped by a scrolling table wrapper either.
//
// options accepts either plain strings or { value, label } objects — the latter for cases where
// the stored value and its displayed label differ (e.g. an empty string shown as "Not set").
export default function SelectInput({ value, onChange, options, placeholder = 'Select…', disabled = false, className = '' }) {
  const { open, setOpen, anchorRef, menuRef, style } = useDropdown()

  const normalized = options.map((o) => (typeof o === 'object' && o !== null ? o : { value: o, label: o }))
  const current = normalized.find((o) => o.value === value)

  return (
    <div className="combobox select-input">
      <button
        ref={anchorRef}
        type="button"
        className={`combobox-input select-input-trigger ${className}`}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={current ? '' : 'select-input-placeholder'}>{current ? current.label : placeholder}</span>
      </button>
      {open &&
        createPortal(
          <div className="combobox-menu" ref={menuRef} style={style}>
            {normalized.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`combobox-option${option.value === value ? ' active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>,
          // Portaled inside the nearest .voicestack-form rather than document.body — that's
          // where the theme's CSS custom properties (--surface, --border, etc.) are actually
          // defined, so the menu still picks up the right colors; it's still high enough above
          // the table's own scrolling wrapper to escape its clipping.
          anchorRef.current?.closest('.voicestack-form') || document.body,
        )}
    </div>
  )
}
