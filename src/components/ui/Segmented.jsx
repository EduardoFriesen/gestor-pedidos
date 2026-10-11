import React, { useRef } from 'react'

export default function Segmented({ label, options, value, onChange, onReselect, size }) {
  const refs = useRef([])
  const selectedIdx = Math.max(0, options.findIndex(o => o.value === value))

  const select = (idx) => {
    const option = options[idx]
    if (option.value === value) onReselect?.(option.value)
    else onChange(option.value)
  }

  const handleKeyDown = (e, idx) => {
    const last = options.length - 1
    const next = {
      ArrowRight: idx === last ? 0 : idx + 1,
      ArrowDown: idx === last ? 0 : idx + 1,
      ArrowLeft: idx === 0 ? last : idx - 1,
      ArrowUp: idx === 0 ? last : idx - 1,
      Home: 0,
      End: last
    }[e.key]
    if (next === undefined) return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div className={`segmented${size === 'lg' ? ' segmented-lg' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((option, idx) => {
        const checked = idx === selectedIdx
        return (
          <button
            key={option.value ?? 'all'}
            ref={el => { refs.current[idx] = el }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="segmented-option"
            onClick={() => select(idx)}
            onKeyDown={e => handleKeyDown(e, idx)}
          >
            {option.label}
            {option.count !== undefined && <span className="segmented-count">{option.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
