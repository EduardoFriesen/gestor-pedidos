import React from 'react'

export default function MetricStrip({ items, label }) {
  return (
    <dl className="metric-strip" aria-label={label}>
      {items.map(item => (
        <div key={item.label} className={`metric${item.tone ? ` tone-${item.tone}` : ''}`} title={item.hint}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
