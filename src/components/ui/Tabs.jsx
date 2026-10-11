import React, { useRef } from 'react'

export default function Tabs({ label, tabs, value, onChange, idPrefix, panelId }) {
  const refs = useRef([])

  const handleKeyDown = (e, idx) => {
    const last = tabs.length - 1
    const next = { ArrowRight: idx === last ? 0 : idx + 1, ArrowLeft: idx === 0 ? last : idx - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, idx) => {
        const selected = t.id === value
        return (
          <button
            key={t.id}
            ref={el => { refs.current[idx] = el }}
            id={`${idPrefix}-${t.id}`}
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            className="tab"
            onClick={() => onChange(t.id)}
            onKeyDown={e => handleKeyDown(e, idx)}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
