import React from 'react'

export default function PieChart({ data, size = 200, title }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const cx = size / 2, cy = size / 2, r = size / 2 - 8, ir = size / 4
  let acc = 0
  const slices = data.map(d => {
    const pct = d.value / total
    const startAngle = acc * 2 * Math.PI - Math.PI / 2
    acc += pct
    const endAngle = acc * 2 * Math.PI - Math.PI / 2
    const largeArc = pct > 0.5 ? 1 : 0
    const x1o = cx + r * Math.cos(startAngle), y1o = cy + r * Math.sin(startAngle)
    const x2o = cx + r * Math.cos(endAngle), y2o = cy + r * Math.sin(endAngle)
    const x1i = cx + ir * Math.cos(endAngle), y1i = cy + ir * Math.sin(endAngle)
    const x2i = cx + ir * Math.cos(startAngle), y2i = cy + ir * Math.sin(startAngle)
    const path = `M${x1o},${y1o} A${r},${r} 0 ${largeArc} 1 ${x2o},${y2o} L${x1i},${y1i} A${ir},${ir} 0 ${largeArc} 0 ${x2i},${y2i} Z`
    return { ...d, path, pct }
  })
  return (
    <div className="card" style={{ padding: 'var(--spacing-md)' }}>
      {title && <h4 style={{ marginBottom: 'var(--spacing-sm)', textAlign: 'center' }}>{title}</h4>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.85} />)}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 'var(--font-xs)' }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: s.color, flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{s.name}</span>
              <span style={{ fontWeight: 700 }}>{s.pct > 0.05 ? `${(s.pct * 100).toFixed(0)}%` : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
