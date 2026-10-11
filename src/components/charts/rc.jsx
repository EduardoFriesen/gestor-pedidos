import React from 'react'
import { ResponsiveContainer } from 'recharts'
import { fmtMoney } from '../../utils/format'

export const COLORS = {
  primary: 'var(--primary)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--section-1)',
  muted: 'var(--text-secondary)',
  grid: 'var(--border)'
}

export const PALETTE = ['var(--primary)', 'var(--accent)', 'var(--section-1)', 'var(--warning)', 'var(--section-5)', 'var(--section-4)', 'var(--danger)', 'var(--section-3)', 'var(--success)']

export const axisProps = {
  tick: { fill: 'var(--text-secondary)', fontSize: 12 },
  axisLine: false,
  tickLine: false
}

export const gridProps = { stroke: 'var(--border)', strokeDasharray: '3 4', vertical: false }

export function fmtCompact(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return ''
  const abs = Math.abs(n)
  if (abs >= 1e6) return `$${(n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`
  if (abs >= 1e3) return `$${(n / 1e3).toLocaleString('es-AR', { maximumFractionDigits: 1 })} k`
  return `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}

export function ChartFrame({ label, height = 260, className = '', children }) {
  return (
    <div className={`chart-frame ${className}`} role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  )
}

export function Gradient({ id, color, from = 0.45, to = 0.02 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={from} />
      <stop offset="100%" stopColor={color} stopOpacity={to} />
    </linearGradient>
  )
}

function TooltipCard({ active, payload, label, formatValue, formatLabel }) {
  if (!active || !payload || payload.length === 0) return null
  const title = formatLabel ? formatLabel(label, payload) : label
  return (
    <div className="chart-tooltip">
      {title !== undefined && title !== null && title !== '' && <p className="chart-tooltip-title">{title}</p>}
      <ul>
        {payload.filter(p => p.value !== undefined && p.value !== null).map(p => (
          <li key={`${p.dataKey}-${p.name}`}>
            <span className="chart-tooltip-dot" style={{ background: p.color || p.payload?.fill }} aria-hidden="true" />
            <span>{p.name}</span>
            <strong>{formatValue ? formatValue(p.value, p) : fmtMoney(p.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function tooltipProps({ formatValue, formatLabel, cursor = true } = {}) {
  return {
    content: <TooltipCard formatValue={formatValue} formatLabel={formatLabel} />,
    cursor: cursor ? { fill: 'var(--bg-sunken)', stroke: 'var(--border)', strokeOpacity: 0.6 } : false,
    wrapperStyle: { outline: 'none', zIndex: 5 },
    isAnimationActive: false
  }
}

export function ChartLegend({ items }) {
  return (
    <ul className="chart-legend">
      {items.map((i, idx) => (
        <li key={`${idx}-${i.label}`}>
          <span className="chart-tooltip-dot" style={{ background: i.color }} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
