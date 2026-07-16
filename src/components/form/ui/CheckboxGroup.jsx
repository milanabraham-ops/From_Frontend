export default function CheckboxGroup({ options, value, onChange }) {
  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
  }

  return (
    <div className="check-group">
      {options.map((opt) => {
        const checked = value.includes(opt)
        return (
          <label key={opt} className={checked ? 'sel' : ''}>
            <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
            {opt}
          </label>
        )
      })}
    </div>
  )
}
