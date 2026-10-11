export const PRESETS = [
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'quarter', label: 'Este trimestre' },
  { id: 'year', label: 'Este año' },
  { id: 'all', label: 'Todo' },
  { id: 'custom', label: 'Personalizado' }
]

export const TREND_PERIODS = [
  { id: 'weekly', label: 'Semanal', unit: 'semana', key: 'week_start' },
  { id: 'monthly', label: 'Mensual', unit: 'mes', key: 'month' },
  { id: 'quarterly', label: 'Trimestral', unit: 'trimestre', key: 'quarter' },
  { id: 'yearly', label: 'Anual', unit: 'año', key: 'year' }
]

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const QUARTER_ORDINALS = ['1er', '2do', '3er', '4to']

const toKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`

export function isCustomLike(preset) {
  return preset === 'custom' || preset === 'all'
}

export function defaultTrendPeriod(preset) {
  return preset === 'week' || preset === 'month' ? 'weekly' : 'monthly'
}

export function getPresetRange(preset) {
  const now = new Date()
  const today = toKey(now)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  switch (preset) {
    case 'week': {
      const sunday = new Date(now)
      sunday.setDate(now.getDate() - now.getDay())
      const saturday = new Date(sunday)
      saturday.setDate(sunday.getDate() + 6)
      return { startDate: toKey(sunday), endDate: toKey(saturday) }
    }
    case 'month':
      return { startDate: `${y}-${m}-01`, endDate: today }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3 + 1
      return { startDate: `${y}-${String(q).padStart(2, '0')}-01`, endDate: today }
    }
    case 'year':
      return { startDate: `${y}-01-01`, endDate: today }
    default:
      return { startDate: null, endDate: null }
  }
}

export function formatDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

export function fmtNum(n, decimals = 1) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function pct(n) {
  return n !== undefined && n !== null && !Number.isNaN(n) ? `${fmtNum(n)}%` : '—'
}

export function pctChange(n, unit = '%') {
  if (n === undefined || n === null || Number.isNaN(n)) return '—'
  return `${n > 0 ? '+' : ''}${fmtNum(n)}${unit === 'pp' ? ' pp' : '%'}`
}

export function changeOf(oldVal, newVal) {
  if (!oldVal) return null
  return (newVal - oldVal) / Math.abs(oldVal) * 100
}

export function monthLabel(key) {
  const [y, m] = key.split('-')
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`
}

export function monthShortLabel(key) {
  const [y, m] = key.split('-')
  return `${MONTH_NAMES[parseInt(m, 10) - 1].slice(0, 3)} ${y.slice(2)}`
}

export function quarterLabel(key) {
  const [y, q] = key.split('-T')
  return `${QUARTER_ORDINALS[parseInt(q, 10) - 1]} trim. ${y}`
}

export function shortDate(str) {
  if (!str) return '…'
  const [, m, d] = str.split('-')
  return `${parseInt(d, 10)}/${parseInt(m, 10)}`
}

export function rangeLabel(start, end) {
  return `${shortDate(start)} – ${shortDate(end)}`
}

function getQuarterOptions(ft) {
  const quarters = {}
  for (const m of ft.monthly || []) {
    const y = m.month.slice(0, 4)
    const q = Math.ceil(parseInt(m.month.slice(5)) / 3)
    const key = `${y}-T${q}`
    if (quarters[key]) continue
    const sm = (q - 1) * 3 + 1
    const em = q * 3
    quarters[key] = {
      label: quarterLabel(key),
      value: key,
      startDate: `${y}-${String(sm).padStart(2, '0')}-01`,
      endDate: `${y}-${String(em).padStart(2, '0')}-${String(new Date(y, em, 0).getDate()).padStart(2, '0')}`
    }
  }
  return Object.values(quarters).sort((a, b) => a.value.localeCompare(b.value))
}

export function getPeriodOptions(preset, ft) {
  if (!ft) return []
  switch (preset) {
    case 'week':
      return (ft.weekly || []).map(w => {
        const [y, m, d] = w.week_start.split('-').map(Number)
        return { label: `Semana del ${formatDate(w.week_start)}`, value: w.week_start, startDate: w.week_start, endDate: toKey(new Date(y, m - 1, d + 6)) }
      })
    case 'month':
      return (ft.monthly || []).map(m => {
        const [y, mo] = m.month.split('-').map(Number)
        return { label: monthLabel(m.month), value: m.month, startDate: `${m.month}-01`, endDate: `${m.month}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}` }
      })
    case 'quarter':
      return getQuarterOptions(ft)
    case 'year':
      return (ft.yearly || []).map(y => ({ label: y.year, value: y.year, startDate: `${y.year}-01-01`, endDate: `${y.year}-12-31` }))
    default:
      return []
  }
}

export function trendLabelFormatters(periodId) {
  const short = periodId === 'weekly' ? shortDate
    : periodId === 'monthly' ? monthShortLabel
    : periodId === 'quarterly' ? quarterLabel
    : (y) => y
  const long = periodId === 'weekly' ? (w) => `Semana del ${formatDate(w)}`
    : periodId === 'monthly' ? monthLabel
    : short
  return { short, long }
}
