export default function RadioGroup({ name, options, value, onChange, row = false }) {
  return (
    <div className={row ? 'radio-group row' : 'radio-group'}>
      {options.map((opt) => {
        const optValue = typeof opt === 'string' ? opt : opt.value
        const optLabel = typeof opt === 'string' ? opt : opt.label
        const checked = value === optValue
        return (
          <label key={optValue} className={checked ? 'sel' : ''}>
            <input
              type="radio"
              name={name}
              value={optValue}
              checked={checked}
              onChange={() => onChange(optValue)}
            />
            {optLabel}
          </label>
        )
      })}
    </div>
  )
}
