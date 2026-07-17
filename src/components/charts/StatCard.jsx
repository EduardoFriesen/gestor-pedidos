import React from 'react'

export default function StatCard({ label, value, highlight }) {
  const strVal = String(value || '')
  const fontSize = strVal.length > 14 ? 'var(--font-lg)' : strVal.length > 10 ? 'calc(var(--font-xl) * 0.8)' : 'var(--font-xl)'
  return (
    <div className="card" style={{ flex: '1 1 0', textAlign: 'center', padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
      <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: '2px' }}>{label}</p>
      <p style={{ fontSize, fontWeight: 900, color: highlight || 'var(--text)', whiteSpace: 'nowrap' }}>{value}</p>
    </div>
  )
}
