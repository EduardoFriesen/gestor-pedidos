import React from 'react'

export default function GroupedBarChart({ data, labelKey, series, formatLabel, currentKey, formatValue, scrollable = true }) {
  const maxVal = Math.max(...data.flatMap(item => series.map(s => Math.abs(item[s.key] || 0))), 1)
  const inner = (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-md)',
      height: 'calc(var(--font-body) * 7 + 50px)', padding: 'var(--spacing-md)',
      minWidth: `${Math.max(data.length * 120, 300)}px`
    }}>
      {data.map((item) => {
        const key = item[labelKey]
        const isCurrent = currentKey === key
        return (
          <div key={key} style={{ flex: '0 0 100px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '3px' }}>
              {series.map(s => {
                const raw = item[s.key]
                const val = raw || 0
                const pct = Math.abs(val) / maxVal * 100
                return (
                  <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, lineHeight: 1, marginBottom: '2px', whiteSpace: 'nowrap' }}>
                      {raw === null || raw === undefined ? '—' : formatValue ? formatValue(val) : val}
                    </span>
                    <div style={{
                      width: '100%', height: `${val === 0 ? 0 : Math.max(pct, 2)}%`, minHeight: val === 0 ? 0 : '4px',
                      background: val < 0 ? 'var(--danger)' : s.color, borderRadius: '3px 3px 0 0', transition: 'height 0.5s ease',
                      opacity: isCurrent ? 1 : 0.8
                    }} />
                  </div>
                )
              })}
            </div>
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', fontWeight: isCurrent ? 700 : 400, textAlign: 'center', marginTop: '2px' }}>
              {formatLabel ? formatLabel(key) : key}{isCurrent ? ' *' : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
  const legend = (
    <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', justifyContent: 'center', fontSize: 'var(--font-xs)' }}>
      {series.map(s => (
        <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
  const content = <>{legend}{inner}</>
  return scrollable ? <div className="card" style={{ overflowX: 'auto' }}>{content}</div> : <div>{content}</div>
}
