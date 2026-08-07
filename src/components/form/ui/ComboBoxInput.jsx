import { createPortal } from 'react-dom'
import { useDropdown } from '../../../hooks/useDropdown'

// A free-text input with a suggestion menu — unlike a native <datalist>, this always shows every
// option when opened (browsers filter datalist suggestions against whatever's already typed,
// which makes picking a different option require clearing the field first), is positioned with
// plain CSS below the input instead of the browser's own unpredictable popup placement, and is
// portaled to document.body so it isn't clipped if ever used inside a scrolling container.
export default function ComboBoxInput({ value, onChange, options, placeholder, disabled = false }) {
  const { open, setOpen, anchorRef, menuRef, style } = useDropdown()

  return (
    <div className="combobox">
      <input
        ref={anchorRef}
        type="text"
        className="combobox-input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => !disabled && setOpen(true)}
        onClick={() => !disabled && setOpen(true)}
      />
      {open &&
        createPortal(
          <div className="combobox-menu" ref={menuRef} style={style}>
            {options.map((option) => (
              <button
                type="button"
                key={option}
                className={`combobox-option${option === value ? ' active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                {option}
              </button>
            ))}
          </div>,
          // See SelectInput.jsx for why this portals into .voicestack-form rather than
          // document.body — that's where the theme's CSS variables are actually defined.
          anchorRef.current?.closest('.voicestack-form') || document.body,
        )}
    </div>
  )
}
