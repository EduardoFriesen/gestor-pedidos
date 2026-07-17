import React from 'react'

export default function BarChart({ data, labelKey, valueKey, barColor, formatLabel, currentKey, formatValue, scrollable = true }) {
  const max = Math.max(...data.map(x => x[valueKey] || 0), 1)
  const inner = (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 'calc(var(--spacing-sm) * 0.5)',
      height: 'calc(var(--font-body) * 5 + 30px)', padding: 'var(--spacing-sm) var(--spacing-xs)',
      minWidth: `${Math.max(data.length * 95, 200)}px`
    }}>
      {data.map((item) => {
        const val = item[valueKey] || 0
        const p = val / max
        const key = item[labelKey]
        const isCurrent = currentKey === key
        return (
          <div key={key} style={{ flex: '0 0 90px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{
                width: '80%', margin: '0 auto', height: `${Math.max(p * 100, 2)}%`, minHeight: '4px',
                background: isCurrent ? 'var(--accent)' : barColor,
                borderRadius: '2px 2px 0 0', transition: 'height 0.5s ease'
              }} />
            </div>
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2px' }}>
              {formatLabel ? formatLabel(key) : key}
            </span>
          </div>
        )
      })}
    </div>
  )
  return scrollable ? <div style={{ overflowX: 'auto' }}>{inner}</div> : inner
}
