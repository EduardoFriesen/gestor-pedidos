export function fmtMoney(n, decimals = 0) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—'
  const abs = Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return `${n < 0 ? '-' : ''}$${abs}`
}

export function fmtUnitCost(n) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—'
  const abs = Math.abs(n)
  const decimals = abs === 0 || abs >= 1 ? 2 : abs >= 0.01 ? 3 : 4
  return fmtMoney(n, decimals)
}

export function formatQty(value, unit) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  let v = value
  let u = unit
  if (u === 'l' && v < 1) { v = v * 1000; u = 'ml' }
  else if (u === 'kg' && v < 1) { v = v * 1000; u = 'g' }
  const rounded = Math.round(v * 100) / 100
  return `${rounded.toLocaleString('es-AR')} ${u}`
}

export function parseDecimal(value) {
  if (typeof value === 'number') return value
  if (value === undefined || value === null) return NaN
  const s = String(value).trim().replace(/\s/g, '')
  if (!s) return NaN
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return parseFloat(normalized)
}

export function formatDate(s) {
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }
  const d = new Date(s.includes(' ') ? s.replace(' ', 'T') : s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatWeekRange(start, end) {
  if (!start) return ''
  const [, sm, sd] = start.split('-')
  if (!end) return `${sd}/${sm}`
  const [ey, em, ed] = end.split('-')
  return `${sd}/${sm} – ${ed}/${em}/${ey}`
}

export const ORDER_STATUS = {
  pending: { label: 'Pendiente', badge: 'badge-warning' },
  confirmed: { label: 'Pendiente', badge: 'badge-warning' },
  assembled: { label: 'Armado', badge: 'badge-info' },
  delivered: { label: 'Entregado', badge: 'badge-success' }
}

export function orderStatus(status) {
  return ORDER_STATUS[status] || ORDER_STATUS.pending
}
