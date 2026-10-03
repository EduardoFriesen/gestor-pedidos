import React, { useState, useEffect, useCallback, useRef } from 'react'
import { SkeletonAnalytics } from '../components/Skeleton'
import ErrorBanner from '../components/ErrorBanner'
import StatCard from '../components/charts/StatCard'
import BarChart from '../components/charts/BarChart'
import GroupedBarChart from '../components/charts/GroupedBarChart'
import PieChart from '../components/charts/PieChart'
import { useHeaderContent } from '../components/HeaderContext'
import { fmtMoney } from '../utils/format'

const PRESETS = [
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'quarter', label: 'Este trimestre' },
  { id: 'year', label: 'Este año' },
  { id: 'all', label: 'Todo' },
  { id: 'custom', label: 'Personalizado' }
]

function getPresetRange(preset) {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const today = `${y}-${m}-${d}`

  const fmt = (dt) => {
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  switch (preset) {
    case 'week': {
      const day = now.getDay()
      const sunday = new Date(now)
      sunday.setDate(now.getDate() - day)
      const saturday = new Date(sunday)
      saturday.setDate(sunday.getDate() + 6)
      return { startDate: fmt(sunday), endDate: fmt(saturday) }
    }
    case 'month': {
      const start = `${y}-${m}-01`
      return { startDate: start, endDate: today }
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3 + 1
      const start = `${y}-${String(q).padStart(2, '0')}-01`
      return { startDate: start, endDate: today }
    }
    case 'year':
      return { startDate: `${y}-01-01`, endDate: today }
    case 'all':
    default:
      return { startDate: null, endDate: null }
  }
}

function formatDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function fmtNum(n, decimals = 1) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function pct(n) {
  return n !== undefined && n !== null && !Number.isNaN(n) ? `${fmtNum(n)}%` : '—'
}

function pctChange(n, unit = '%') {
  if (n === undefined || n === null || Number.isNaN(n)) return '—'
  return `${n > 0 ? '+' : ''}${fmtNum(n)}${unit === 'pp' ? ' pp' : '%'}`
}

function changeOf(oldVal, newVal) {
  if (!oldVal) return null
  return (newVal - oldVal) / Math.abs(oldVal) * 100
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const QUARTER_ORDINALS = ['1er', '2do', '3er', '4to']

function monthLabel(key) {
  const [y, m] = key.split('-')
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`
}

function monthShortLabel(key) {
  const [y, m] = key.split('-')
  return `${MONTH_NAMES[parseInt(m, 10) - 1].slice(0, 3)} ${y.slice(2)}`
}

function quarterLabel(key) {
  const [y, q] = key.split('-T')
  return `${QUARTER_ORDINALS[parseInt(q, 10) - 1]} trim. ${y}`
}

function shortDate(str) {
  if (!str) return '…'
  const [, m, d] = str.split('-')
  return `${parseInt(d, 10)}/${parseInt(m, 10)}`
}

function rangeLabel(start, end) {
  return `${shortDate(start)} – ${shortDate(end)}`
}

const TREND_PERIODS = [
  { id: 'weekly', label: 'Semanal', unit: 'semana', key: 'week_start' },
  { id: 'monthly', label: 'Mensual', unit: 'mes', key: 'month' },
  { id: 'quarterly', label: 'Trimestral', unit: 'trimestre', key: 'quarter' },
  { id: 'yearly', label: 'Anual', unit: 'año', key: 'year' }
]

function defaultTrendPeriod(preset) {
  return preset === 'week' || preset === 'month' ? 'weekly' : 'monthly'
}

const PIE_COLORS = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)', 'var(--danger)', '#8B7B6B', '#6A9A8B', '#7B8FA0', '#9B8B7B', '#C4885C']

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [trends, setTrends] = useState({ weekly: [], monthly: [], quarterly: [], yearly: [] })
  const [fullTrends, setFullTrends] = useState({ weekly: [], monthly: [], quarterly: [], yearly: [] })
  const [comparison, setComparison] = useState(null)
  const [tab, setTab] = useState('top')
  const [trendPeriod, setTrendPeriod] = useState(defaultTrendPeriod('week'))
  const [filterPreset, setFilterPreset] = useState('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [compCustomP1Start, setCompCustomP1Start] = useState('')
  const [compCustomP1End, setCompCustomP1End] = useState('')
  const [compCustomP2Start, setCompCustomP2Start] = useState('')
  const [compCustomP2End, setCompCustomP2End] = useState('')
  const [dishComparison, setDishComparison] = useState({})
  const [dishCompDates, setDishCompDates] = useState({})
  const [searchDish, setSearchDish] = useState('')
  const [searchClient, setSearchClient] = useState('')
  const [expandedDish, setExpandedDish] = useState(null)
  const [expandedClient, setExpandedClient] = useState(null)
  const [dishTimeSeries, setDishTimeSeries] = useState([])
  const [clientTimeSeries, setClientTimeSeries] = useState([])
  const [dishSort, setDishSort] = useState('total')
  const [dishSortDir, setDishSortDir] = useState('desc')
  const [clientSort, setClientSort] = useState('orders')
  const [clientSortDir, setClientSortDir] = useState('desc')
  const [overproduction, setOverproduction] = useState(null)
  const [appliedRange, setAppliedRange] = useState(getPresetRange('week'))
  const [dishLoading, setDishLoading] = useState(false)
  const [clientLoading, setClientLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tablePage, setTablePage] = useState(0)
  const [dishPage, setDishPage] = useState(0)
  const [clientPage, setClientPage] = useState(0)
  const LIST_PAGE_SIZE = 5
  const loadIdRef = useRef(0)
  const compLoadIdRef = useRef(0)
  const { setHeaderContent } = useHeaderContent()

  useEffect(() => {
    setHeaderContent(
      <div style={{ padding: 'var(--spacing-sm)', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-xs)',
          marginBottom: 'var(--spacing-xs)',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, marginRight: 'auto' }}>Análisis</h2>
          {PRESETS.map(p => (
            <button
              key={p.id}
              className={filterPreset === p.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              onClick={() => handleFilterChange(p.id)}
              style={{ fontSize: 'var(--font-sm)' }}
            >
              {p.label}
            </button>
          ))}
          {filterPreset === 'custom' && (
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
              <span style={{ fontSize: 'var(--font-sm)' }}>a</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
              <button className="btn btn-primary btn-sm" onClick={handleCustomFilter}>Filtrar</button>
            </div>
          )}
          <button className="btn btn-outline btn-sm" onClick={handleExcelExport}>↓ Excel</button>
        </div>

        <div style={{
          display: 'flex',
          gap: 'var(--spacing-xs)',
          marginBottom: 'var(--spacing-xs)',
          flexWrap: 'wrap'
        }}>
          <StatCard label="Pedidos" value={analytics?.totalOrders || 0} />
          <StatCard label="Ingresos" value={fmtMoney(analytics?.revenue || 0)} highlight="var(--success)" />
          <StatCard label="Costo total" value={fmtMoney(analytics?.totalCost || 0)} highlight="var(--danger)" />
          <StatCard
            label="Ganancia neta"
            value={fmtMoney(analytics?.totalProfit || 0)}
            highlight={(analytics?.totalProfit || 0) >= 0 ? 'var(--primary)' : 'var(--danger)'}
          />
          {analytics?.revenue > 0 && analytics?.totalCost > 0 && (
            <StatCard
              label="Margen %"
              value={pct((analytics.revenue - analytics.totalCost) / analytics.revenue * 100)}
              highlight="var(--accent)"
            />
          )}
          {overproduction && (
            <StatCard
              label="Desperdicio"
              hint="Costo de lo producido que no se vendió en el período"
              value={fmtMoney(overproduction.totalOverproductionCost)}
              highlight={overproduction.totalOverproductionCost > 0 ? 'var(--danger)' : 'var(--text-secondary)'}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className={tab === t.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          {tab === 'top' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Buscar plato..."
                aria-label="Buscar plato"
                value={searchDish}
                onChange={e => setSearchDish(e.target.value)}
                style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}
              />
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>Ordenar:</span>
              {[
                { id: 'total', label: 'Vendidos' },
                { id: 'totalProfit', label: 'Ganancia' },
                { id: 'margin', label: 'Margen %' },
                { id: 'price', label: 'Precio' }
              ].map(s => (
                <button
                  key={s.id}
                  className={dishSort === s.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  onClick={() => setDishSort(s.id)}
                  style={{ fontSize: 'var(--font-sm)' }}
                >
                  {s.label}
                </button>
              ))}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setDishSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                style={{ fontSize: 'var(--font-sm)', fontWeight: 700, padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                aria-label="Cambiar dirección de orden"
              >
                {dishSortDir === 'desc' ? '↓ Mayor primero' : '↑ Menor primero'}
              </button>
            </div>
          )}
          {tab === 'clients' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Buscar cliente..."
                aria-label="Buscar cliente"
                value={searchClient}
                onChange={e => setSearchClient(e.target.value)}
                style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}
              />
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>Ordenar:</span>
              {[
                { id: 'orders', label: 'Pedidos' },
                { id: 'dishes', label: 'Platos' },
                { id: 'revenue', label: 'Gastado' }
              ].map(s => (
                <button
                  key={s.id}
                  className={clientSort === s.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  onClick={() => setClientSort(s.id)}
                  style={{ fontSize: 'var(--font-sm)' }}
                >
                  {s.label}
                </button>
              ))}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setClientSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                style={{ fontSize: 'var(--font-sm)', fontWeight: 700, padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                aria-label="Cambiar dirección de orden"
              >
                {clientSortDir === 'desc' ? '↓ Mayor primero' : '↑ Menor primero'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
    return () => setHeaderContent(null)
  }, [analytics, tab, filterPreset, customStart, customEnd, overproduction, searchDish, dishSort, dishSortDir, searchClient, clientSort, clientSortDir, appliedRange])

  const loadAll = useCallback(async (preset, start, end) => {
    const id = ++loadIdRef.current
    try {
      const { startDate, endDate } = preset === 'custom'
        ? { startDate: start || null, endDate: end || null }
        : getPresetRange(preset)

      const [a, t, ov] = await Promise.all([
        window.piu?.getAnalyticsFiltered(startDate, endDate) || Promise.resolve(null),
        window.piu?.getTrendsInRange(startDate, endDate) || Promise.resolve(null),
        window.piu?.getOverproductionInRange(startDate, endDate) || Promise.resolve(null)
      ])
      if (id !== loadIdRef.current) return
      setAppliedRange({ startDate, endDate })
      setAnalytics(a)
      setTrends(t || { weekly: [], monthly: [], quarterly: [], yearly: [] })
      setOverproduction(ov || null)
      setError(null)
    } catch (e) {
      if (id !== loadIdRef.current) return
      setError('No se pudieron cargar los datos de analytics.')
    }
  }, [])

  useEffect(() => {
    if (filterPreset !== 'custom') loadAll(filterPreset)
  }, [loadAll, filterPreset])

  useEffect(() => {
    (async () => {
      try {
        const t = await window.piu?.getTrendsInRange(null, null)
        if (t) setFullTrends(t)
      } catch (e) {
        // silent — fullTrends is auxiliary
      }
    })()
  }, [])

  useEffect(() => { setTablePage(0) }, [trendPeriod])
  useEffect(() => { setDishPage(0) }, [dishSort, dishSortDir, searchDish, analytics])
  useEffect(() => { setClientPage(0) }, [clientSort, clientSortDir, searchClient, analytics])
  useEffect(() => {
    setTrendPeriod(defaultTrendPeriod(filterPreset))
    setExpandedDish(null)
    setExpandedClient(null)
  }, [filterPreset])

  const handleFilterChange = (preset) => {
    setFilterPreset(preset)
    if (preset !== 'custom') {
      setCustomStart('')
      setCustomEnd('')
    }
  }

  const handleCustomFilter = () => {
    if (!customStart || !customEnd) {
      setError('Elegí la fecha de inicio y la de fin.')
      return
    }
    if (customStart > customEnd) {
      setError('La fecha de inicio es posterior a la de fin.')
      return
    }
    setExpandedDish(null)
    setExpandedClient(null)
    loadAll('custom', customStart, customEnd)
  }

  const handleExcelExport = async () => {
    try {
      await window.piu?.exportAnalyticsExcel(appliedRange)
    } catch (e) {
      console.error('Excel export error:', e)
    }
  }

  function getPeriodOptions(preset, ft) {
    if (!ft) return []
    switch (preset) {
      case 'week':
        return (ft.weekly || []).map(w => {
          const [y, m, d] = w.week_start.split('-').map(Number)
          const sat = new Date(y, m - 1, d + 6)
          const end = `${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, '0')}-${String(sat.getDate()).padStart(2, '0')}`
          return { label: `Semana del ${formatDate(w.week_start)}`, value: w.week_start, startDate: w.week_start, endDate: end }
        })
      case 'month':
        return (ft.monthly || []).map(m => {
          const [y, mo] = m.month.split('-').map(Number)
          const lastDay = new Date(y, mo, 0).getDate()
          return { label: monthLabel(m.month), value: m.month, startDate: m.month + '-01', endDate: `${m.month}-${String(lastDay).padStart(2, '0')}` }
        })
      case 'quarter':
        return getQuarterOptions(ft)
      case 'year':
        return (ft.yearly || []).map(y => ({
          label: y.year, value: y.year,
          startDate: y.year + '-01-01', endDate: y.year + '-12-31'
        }))
      default: return []
    }
  }

  function getQuarterOptions(ft) {
    const months = ft.monthly || []
    const quarters = {}
    for (const m of months) {
      const y = m.month.slice(0, 4)
      const mo = parseInt(m.month.slice(5))
      const q = Math.ceil(mo / 3)
      const key = `${y}-T${q}`
      if (!quarters[key]) {
        const sm = (q - 1) * 3 + 1
        const em = q * 3
        quarters[key] = {
          label: quarterLabel(key), value: key,
          startDate: `${y}-${String(sm).padStart(2, '0')}-01`,
          endDate: `${y}-${String(em).padStart(2, '0')}-${new Date(y, em, 0).getDate().toString().padStart(2, '0')}`
        }
      }
    }
    return Object.values(quarters).sort((a, b) => a.value.localeCompare(b.value))
  }

  const [compP1Value, setCompP1Value] = useState('')
  const [compP2Value, setCompP2Value] = useState('')

  const runComparison = (p1Val, p2Val) => {
    const id = ++compLoadIdRef.current
    if (filterPreset === 'custom' || filterPreset === 'all') {
      const p1s = compCustomP1Start || null
      const p1e = compCustomP1End || null
      const p2s = compCustomP2Start || null
      const p2e = compCustomP2End || null
      if (!p1s || !p2s) {
        if (p1Val === 'manual') setError('Elegí al menos la fecha de inicio de cada período.')
        return
      }
      if ((p1e && p1s > p1e) || (p2e && p2s > p2e)) {
        setError('En algún período la fecha de inicio es posterior a la de fin.')
        return
      }
      window.piu?.getPeriodComparison(p1s, p1e, p2s, p2e).then(r => {
        if (id === compLoadIdRef.current) setComparison(r)
      }).catch(() => { if (id === compLoadIdRef.current) setError('No se pudo generar la comparación.') })
    } else {
      const opts = getPeriodOptions(filterPreset, fullTrends)
      const opt1 = opts.find(o => o.value === p1Val)
      const opt2 = opts.find(o => o.value === p2Val)
      if (opt1 && opt2) {
        setComparison(null)
        window.piu?.getPeriodComparison(opt1.startDate, opt1.endDate, opt2.startDate, opt2.endDate).then(r => {
          if (id === compLoadIdRef.current) setComparison(r)
        }).catch(() => { if (id === compLoadIdRef.current) setError('No se pudo generar la comparación.') })
      }
    }
  }

  useEffect(() => {
    if (tab === 'comparison') {
      if (filterPreset === 'custom' || filterPreset === 'all') {
        if (compCustomP1Start && compCustomP2Start) {
          runComparison()
        }
      } else {
        const opts = getPeriodOptions(filterPreset, fullTrends)
        if (opts.length >= 2) {
          setCompP1Value(opts[opts.length - 2].value)
          setCompP2Value(opts[opts.length - 1].value)
          runComparison(opts[opts.length - 2].value, opts[opts.length - 1].value)
        }
      }
    }
  }, [tab, filterPreset, fullTrends])

  const tabs = [
    { id: 'top', label: 'Top Platos' },
    { id: 'clients', label: 'Top Clientes' },
    { id: 'trend', label: 'Tendencias' },
    { id: 'comparison', label: 'Comparativa' }
  ]

  if (!analytics) {
    return <SkeletonAnalytics />
  }

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div key={tab} style={{ animation: 'slideUp 250ms var(--ease-out-quart)' }}>
        {tab === 'top' && (() => {
        const getDishVal = (d) => {
          if (dishSort === 'total') return d.total
          if (dishSort === 'totalProfit') return d.totalProfit
          if (dishSort === 'margin') return d.margin ?? 0
          return d.price
        }

        const sortedDishes = analytics.topDishes
          .filter(d => !searchDish || (d.name || '').toLowerCase().includes(searchDish.toLowerCase()))
          .sort((a, b) => (getDishVal(b) - getDishVal(a)) * (dishSortDir === 'desc' ? 1 : -1))

        const dishMaxVal = Math.max(...sortedDishes.map(d => getDishVal(d)), 0)
        const dishTotalPages = Math.max(1, Math.ceil(sortedDishes.length / LIST_PAGE_SIZE))
        const safeDishPage = Math.min(dishPage, dishTotalPages - 1)

        const byUnits = [...sortedDishes].sort((a, b) => b.total - a.total)
        const top10 = byUnits.slice(0, 10).map(d => ({ name: d.name, value: d.total }))
        const restVal = byUnits.slice(10).reduce((s, d) => s + d.total, 0)
        if (restVal > 0) top10.push({ name: 'Otros', value: restVal })
        const dishPieData = top10.map((item, i) => ({
          ...item,
          color: i < PIE_COLORS.length ? PIE_COLORS[i] : 'var(--text-secondary)'
        }))

        return (
          <>
            <div style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 60%', minWidth: 0 }}>
                {analytics.topDishes.length === 0 ? (
                <div className="empty-state card"><p>No hay platos con pedidos en este período. Probá cambiando el filtro de fecha.</p></div>
              ) : (
                <div key={safeDishPage} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', animation: 'slideUp 250ms var(--ease-out-quart)' }}>
                  {sortedDishes.slice(safeDishPage * LIST_PAGE_SIZE, (safeDishPage + 1) * LIST_PAGE_SIZE).map((d, i) => {
                    const globalIdx = safeDishPage * LIST_PAGE_SIZE + i
                    const barPct = dishMaxVal > 0 ? Math.max(0, Math.round(getDishVal(d) / dishMaxVal * 100)) : 0
                    const hasIngredients = d.cost > 0
                    const sumTimeSeries = (arr) => arr.reduce((a, i) => ({ ordered: a.ordered + (i.ordered || 0), produced: a.produced + (i.produced || 0), overproduction: a.overproduction + (i.overproduction || 0) }), { ordered: 0, produced: 0, overproduction: 0 })
                    const isExpanded = expandedDish === d.id
                    const runDishComparison = async (dishId, p1s, p1e, p2s, p2e) => {
                      setDishLoading(true)
                      try {
                        const [prevData, currData] = await Promise.all([
                          window.piu?.getDishTimeSeries(dishId, p1s || null, p1e || null),
                          window.piu?.getDishTimeSeries(dishId, p2s || null, p2e || null)
                        ])
                        setDishComparison(prev => ({ ...prev, [dishId]: { prev: sumTimeSeries(prevData || []), curr: sumTimeSeries(currData || []) } }))
                        const combinedStart = p1s && p2s ? (p1s < p2s ? p1s : p2s) : (p1s || p2s)
                        const combinedEnd = p1e && p2e ? (p1e > p2e ? p1e : p2e) : (p1e || p2e)
                        if (combinedStart && combinedEnd) {
                          const cd = await window.piu?.getDishTimeSeries(dishId, combinedStart, combinedEnd)
                          setDishTimeSeries(cd || [])
                        }
                      } catch (e) {
                        setError('No se pudieron cargar los datos del plato.')
                      } finally {
                        setDishLoading(false)
                      }
                    }
                    const loadTimeSeries = async () => {
                      if (isExpanded) { setExpandedDish(null); return }
                      setExpandedDish(d.id)
                      setDishTimeSeries([])
                      setDishComparison(prev => {
                        const next = { ...prev }
                        delete next[d.id]
                        return next
                      })
                      try {
                        if (filterPreset === 'custom' || filterPreset === 'all') {
                          const { startDate, endDate } = appliedRange
                          setDishLoading(true)
                          const data = await window.piu?.getDishTimeSeries(d.id, startDate, endDate).finally(() => setDishLoading(false))
                          setDishTimeSeries(data || [])
                          setDishCompDates(prev => ({ ...prev, [d.id]: { p1Start: '', p1End: '', p2Start: startDate || '', p2End: endDate || '' } }))
                        } else {
                          const opts = getPeriodOptions(filterPreset, fullTrends)
                          const curOpt = opts[opts.length - 1]
                          const prevOpt = opts.length >= 2 ? opts[opts.length - 2] : opts[0]
                          setDishCompDates(prev => ({ ...prev, [d.id]: { p1: prevOpt?.value || '', p2: curOpt?.value || '' } }))
                          if (prevOpt && curOpt) {
                            runDishComparison(d.id, prevOpt.startDate, prevOpt.endDate, curOpt.startDate, curOpt.endDate)
                          }
                        }
                      } catch (e) {
                        setError('No se pudieron cargar los datos del plato.')
                      }
                    }
                    return (
                      <div key={d.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 900, color: 'var(--primary)', minWidth: '28px' }}>#{globalIdx + 1}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <div>
                                <strong
                                  style={{ fontSize: 'var(--font-sm)', cursor: 'pointer', userSelect: 'none' }}
                                  onClick={loadTimeSeries}
                                >
                                  {isExpanded ? '▾' : '▸'} {d.name}
                                </strong>
                                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginLeft: 'var(--spacing-xs)' }}>
                                  {d.total} vendidos
                                </span>
                              </div>
                            </div>
                            <div style={{ height: 'calc(var(--touch-size) * 0.25)', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden', marginBottom: '2px' }}>
                              <div style={{ width: `${barPct}%`, height: '100%', background: 'var(--primary)', borderRadius: '100px', transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                              <span title="Precio promedio cobrado en el período">Precio prom.: <strong>{fmtMoney(d.price, 2)}</strong></span>
                              {hasIngredients ? (
                                <>
                                  <span title="Costo promedio en el período">Costo prom.: <strong>{fmtMoney(d.cost, 2)}</strong></span>
                                  <span>Ganancia/ud: <strong style={{ color: d.profit > 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtMoney(d.profit, 2)}</strong></span>
                                  <span>Margen: <strong style={{ color: (d.margin ?? 0) > 0 ? 'var(--success)' : 'var(--danger)' }}>{pct(d.margin)}</strong></span>
                                  <span>Ganancia total: <strong style={{ color: d.totalProfit > 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtMoney(d.totalProfit)}</strong></span>
                                </>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin ingredientes cargados</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          maxHeight: isExpanded ? '2500px' : '0',
                          opacity: isExpanded ? 1 : 0,
                          overflow: 'hidden',
                          transition: 'max-height 500ms ease-out, opacity 300ms ease-out'
                        }}>
                          {isExpanded && (
                          <div style={{
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            background: 'var(--bg)',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            fontSize: 'var(--font-sm)'
                          }}>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                              {(filterPreset === 'custom' || filterPreset === 'all') ? (
                                <>
                                  <div className="card" style={{ flex: '1 1 auto', padding: 'var(--spacing-sm)', minWidth: '200px' }}>
                                    <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Periodo A</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <input type="date" value={dishCompDates[d.id]?.p1Start || ''} onChange={e => setDishCompDates(prev => ({ ...prev, [d.id]: { ...prev[d.id], p1Start: e.target.value } }))} style={{ width: '140px', fontSize: 'var(--font-xs)' }} />
                                      <input type="date" value={dishCompDates[d.id]?.p1End || ''} onChange={e => setDishCompDates(prev => ({ ...prev, [d.id]: { ...prev[d.id], p1End: e.target.value } }))} style={{ width: '140px', fontSize: 'var(--font-xs)' }} />
                                    </div>
                                  </div>
                                  <div className="card" style={{ flex: '1 1 auto', padding: 'var(--spacing-sm)', minWidth: '200px' }}>
                                    <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Periodo B</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <input type="date" value={dishCompDates[d.id]?.p2Start || ''} onChange={e => setDishCompDates(prev => ({ ...prev, [d.id]: { ...prev[d.id], p2Start: e.target.value } }))} style={{ width: '140px', fontSize: 'var(--font-xs)' }} />
                                      <input type="date" value={dishCompDates[d.id]?.p2End || ''} onChange={e => setDishCompDates(prev => ({ ...prev, [d.id]: { ...prev[d.id], p2End: e.target.value } }))} style={{ width: '140px', fontSize: 'var(--font-xs)' }} />
                                    </div>
                                  </div>
                                  <button className="btn btn-primary btn-sm" onClick={() => { const dcd = dishCompDates[d.id] || {}; runDishComparison(d.id, dcd.p1Start, dcd.p1End, dcd.p2Start, dcd.p2End) }}>
                                    Comparar
                                  </button>
                                </>
                              ) : (() => {
                                const opts = getPeriodOptions(filterPreset, fullTrends)
                                const dcd = dishCompDates[d.id] || {}
                                return (
                                  <>
                                    <div className="card" style={{ flex: '1 1 auto', padding: 'var(--spacing-sm)', minWidth: '200px' }}>
                                      <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Periodo A</span>
                                      <select value={dcd.p1 || ''} onChange={e => {
                                        const v = e.target.value
                                        setDishCompDates(prev => ({ ...prev, [d.id]: { ...prev[d.id], p1: v } }))
                                        const opt = opts.find(o => o.value === v)
                                        const opt2 = opts.find(o => o.value === dcd.p2)
                                        if (opt && opt2) runDishComparison(d.id, opt.startDate, opt.endDate, opt2.startDate, opt2.endDate)
                                      }} style={{ width: '100%', fontSize: 'var(--font-xs)' }}>
                                        <option value="">— Seleccionar —</option>
                                        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                      </select>
                                    </div>
                                    <div className="card" style={{ flex: '1 1 auto', padding: 'var(--spacing-sm)', minWidth: '200px' }}>
                                      <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Periodo B</span>
                                      <select value={dcd.p2 || ''} onChange={e => {
                                        const v = e.target.value
                                        setDishCompDates(prev => ({ ...prev, [d.id]: { ...prev[d.id], p2: v } }))
                                        const opt = opts.find(o => o.value === v)
                                        const opt1 = opts.find(o => o.value === dcd.p1)
                                        if (opt && opt1) runDishComparison(d.id, opt1.startDate, opt1.endDate, opt.startDate, opt.endDate)
                                      }} style={{ width: '100%', fontSize: 'var(--font-xs)' }}>
                                        <option value="">— Seleccionar —</option>
                                        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                      </select>
                                    </div>
                                  </>
                                )
                              })()}
                            </div>

                            {dishLoading && (
                              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 'var(--spacing-sm)' }}>Cargando…</p>
                            )}

                            {dishComparison[d.id] && (
                              <div style={{
                                display: 'flex', gap: 'var(--spacing-md)',
                                marginBottom: filterPreset !== 'week' && dishTimeSeries.length > 0 ? 'var(--spacing-sm)' : '0'
                              }}>
                                <div className="card" style={{ flex: 1, textAlign: 'center', padding: 'var(--spacing-md)' }}>
                                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Período A</p>
                                  <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900 }}>{dishComparison[d.id].prev.ordered}</p>
                                  <p style={{ fontSize: 'var(--font-xs)' }}>veces pedido</p>
                                  <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900 }}>{dishComparison[d.id].prev.produced}</p>
                                  <p style={{ fontSize: 'var(--font-xs)' }}>producidos</p>
                                  {dishComparison[d.id].prev.overproduction > 0 && (
                                    <>
                                      <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--danger)' }}>{dishComparison[d.id].prev.overproduction}</p>
                                      <p style={{ fontSize: 'var(--font-xs)' }}>sobra</p>
                                    </>
                                  )}
                                </div>
                                <div className="card" style={{ flex: 1, textAlign: 'center', padding: 'var(--spacing-md)' }}>
                                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Período B</p>
                                  <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900 }}>{dishComparison[d.id].curr.ordered}</p>
                                  <p style={{ fontSize: 'var(--font-xs)' }}>veces pedido</p>
                                  <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900 }}>{dishComparison[d.id].curr.produced}</p>
                                  <p style={{ fontSize: 'var(--font-xs)' }}>producidos</p>
                                  {dishComparison[d.id].curr.overproduction > 0 && (
                                    <>
                                      <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--danger)' }}>{dishComparison[d.id].curr.overproduction}</p>
                                      <p style={{ fontSize: 'var(--font-xs)' }}>sobra</p>
                                    </>
                                  )}
                                </div>
                                <div className="card" style={{ flex: 1, textAlign: 'center', padding: 'var(--spacing-md)' }}>
                                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Cambio</p>
                                  {(() => {
                                    const { prev, curr } = dishComparison[d.id]
                                    const rows = [
                                      { label: 'veces pedido', change: changeOf(prev.ordered, curr.ordered), upIsGood: true },
                                      { label: 'producción', change: changeOf(prev.produced, curr.produced), upIsGood: true },
                                      { label: 'sobra', change: changeOf(prev.overproduction, curr.overproduction), upIsGood: false }
                                    ]
                                    return rows.map(r => (
                                      <React.Fragment key={r.label}>
                                        <p style={{
                                          fontSize: 'var(--font-lg)', fontWeight: 900,
                                          color: r.change === null || r.change === 0 ? 'var(--text-secondary)' : (r.change > 0) === r.upIsGood ? 'var(--success)' : 'var(--danger)'
                                        }}>
                                          {pctChange(r.change)}
                                        </p>
                                        <p style={{ fontSize: 'var(--font-xs)' }}>{r.label}</p>
                                      </React.Fragment>
                                    ))
                                  })()}
                                </div>
                              </div>
                            )}

                            {filterPreset !== 'week' && dishTimeSeries.length > 0 && (
                              <>
                                <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', color: 'var(--text)' }}>
                                  Pedidos por semana
                                </div>
                                <BarChart
                                  data={dishTimeSeries}
                                  labelKey="period"
                                  valueKey="ordered"
                                  barColor="var(--primary)"
                                  formatLabel={formatDate}
                                />
                                <div style={{ fontWeight: 600, margin: 'var(--spacing-sm) 0 var(--spacing-xs)', color: 'var(--text)' }}>
                                  Producido por semana
                                </div>
                                <BarChart
                                  data={dishTimeSeries}
                                  labelKey="period"
                                  valueKey="produced"
                                  barColor="var(--success)"
                                  formatLabel={formatDate}
                                />
                                <div style={{ fontWeight: 600, margin: 'var(--spacing-sm) 0 var(--spacing-xs)', color: 'var(--text)' }}>
                                  Sobreproducción por semana
                                </div>
                                <BarChart
                                  data={dishTimeSeries}
                                  labelKey="period"
                                  valueKey="overproduction"
                                  barColor="var(--danger)"
                                  formatLabel={formatDate}
                                />
                              </>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {sortedDishes.length > LIST_PAGE_SIZE && (() => {
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-sm)', padding: '0 var(--spacing-xs)' }}>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      Mostrando {safeDishPage * LIST_PAGE_SIZE + 1}–{Math.min((safeDishPage + 1) * LIST_PAGE_SIZE, sortedDishes.length)} de {sortedDishes.length}
                    </span>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                      <button className="btn btn-ghost btn-sm" disabled={safeDishPage === 0} onClick={() => setDishPage(safeDishPage - 1)}>Anterior</button>
                      <button className="btn btn-ghost btn-sm" disabled={safeDishPage >= dishTotalPages - 1} onClick={() => setDishPage(safeDishPage + 1)}>Siguiente</button>
                    </div>
                  </div>
                )
              })()}
              </div>
              <div style={{ flex: '0 0 360px' }}>
                {sortedDishes.length > 0 && <PieChart data={dishPieData} title="Reparto de unidades vendidas" size={260} />}
              </div>
            </div>
          </>
        )
      })()}

      {tab === 'clients' && (() => {
        const getClientVal = (c) => {
          if (clientSort === 'orders') return c.order_count
          if (clientSort === 'dishes') return c.total_dishes
          return c.totalRevenue || 0
        }

        const sortedClients = analytics.topClients
          .filter(c => !searchClient || `${c.name} ${c.last_name}`.toLowerCase().includes(searchClient.toLowerCase()))
          .sort((a, b) => (getClientVal(b) - getClientVal(a)) * (clientSortDir === 'desc' ? 1 : -1))

        const clientMaxVal = Math.max(...sortedClients.map(c => getClientVal(c)), 0)
        const clientTotalPages = Math.max(1, Math.ceil(sortedClients.length / LIST_PAGE_SIZE))
        const safeClientPage = Math.min(clientPage, clientTotalPages - 1)

        const byOrders = [...sortedClients].sort((a, b) => b.order_count - a.order_count)
        const top10 = byOrders.slice(0, 10).map(c => ({ name: `${c.name} ${c.last_name}`, value: c.order_count }))
        const restVal = byOrders.slice(10).reduce((s, c) => s + c.order_count, 0)
        if (restVal > 0) top10.push({ name: 'Otros', value: restVal })
        const clientPieData = top10.map((item, i) => ({
          ...item,
          color: i < PIE_COLORS.length ? PIE_COLORS[i] : 'var(--text-secondary)'
        }))

        return (
          <>
            <div style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 60%', minWidth: 0 }}>
                {analytics.topClients.length === 0 ? (
                <div className="empty-state card"><p>No hay clientes con pedidos en este período. Probá cambiando el filtro de fecha.</p></div>
              ) : (
                <div key={safeClientPage} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', animation: 'fadeIn 200ms ease-out' }}>
                  {sortedClients.slice(safeClientPage * LIST_PAGE_SIZE, (safeClientPage + 1) * LIST_PAGE_SIZE).map((c, i) => {
                    const globalIdx = safeClientPage * LIST_PAGE_SIZE + i
                    const barPct = clientMaxVal > 0 ? Math.max(0, Math.round(getClientVal(c) / clientMaxVal * 100)) : 0
                    const cKey = `${c.clientId}`
                    const isExpanded = expandedClient === cKey
                    const loadTimeSeries = async () => {
                      if (isExpanded) { setExpandedClient(null); return }
                      setExpandedClient(cKey)
                      setClientTimeSeries([])
                      setClientLoading(true)
                      try {
                        const { startDate, endDate } = appliedRange
                        const data = await window.piu?.getClientTimeSeries(c.clientId, startDate, endDate)
                        setClientTimeSeries(data || [])
                      } catch (e) {
                        setError('No se pudieron cargar los datos del cliente.')
                      } finally {
                        setClientLoading(false)
                      }
                    }
                    return (
                      <div key={cKey} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 900, color: 'var(--primary)', minWidth: '28px' }}>#{globalIdx + 1}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <strong
                                style={{ fontSize: 'var(--font-sm)', cursor: 'pointer', userSelect: 'none' }}
                                onClick={loadTimeSeries}
                              >
                                {isExpanded ? '▾' : '▸'} {c.name} {c.last_name}
                              </strong>
                              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>
                                {clientSort === 'dishes' ? c.total_dishes : clientSort === 'revenue' ? fmtMoney(c.totalRevenue) : c.order_count}
                              </span>
                            </div>
                            <div style={{ height: 'calc(var(--touch-size) * 0.25)', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                              <div style={{ width: `${barPct}%`, height: '100%', background: 'var(--accent)', borderRadius: '100px', transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: '2px', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                              <span>{c.order_count} pedidos</span>
                              <span>{c.total_dishes} platos</span>
                              {c.totalRevenue > 0 && <span>Gastó: <strong>{fmtMoney(c.totalRevenue)}</strong></span>}
                              {c.favorite_dish && <span>Plato favorito: <strong>{c.favorite_dish}</strong></span>}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          maxHeight: isExpanded ? '2000px' : '0',
                          opacity: isExpanded ? 1 : 0,
                          overflow: 'hidden',
                          transition: 'max-height 500ms ease-out, opacity 300ms ease-out'
                        }}>
                          {isExpanded && clientLoading && (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 'var(--spacing-sm)' }}>Cargando…</p>
                          )}
                          {isExpanded && !clientLoading && clientTimeSeries.length > 0 && (
                          filterPreset === 'week' ? (
                            <div style={{
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              background: 'var(--bg)',
                              borderRadius: 'var(--radius)',
                              border: '1px solid var(--border)',
                              fontSize: 'var(--font-sm)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                <div>
                                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Pedidos esta semana</p>
                                  <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900, color: 'var(--accent)' }}>
                                    {clientTimeSeries[0]?.orders || 0}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              background: 'var(--bg)',
                              borderRadius: 'var(--radius)',
                              border: '1px solid var(--border)',
                              fontSize: 'var(--font-sm)'
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', color: 'var(--text)' }}>
                                Pedidos por semana
                              </div>
                              <BarChart
                                data={clientTimeSeries}
                                labelKey="period"
                                valueKey="orders"
                                barColor="var(--accent)"
                                formatLabel={formatDate}
                              />
                            </div>
                          )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {sortedClients.length > LIST_PAGE_SIZE && (() => {
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-sm)', padding: '0 var(--spacing-xs)' }}>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      Mostrando {safeClientPage * LIST_PAGE_SIZE + 1}–{Math.min((safeClientPage + 1) * LIST_PAGE_SIZE, sortedClients.length)} de {sortedClients.length}
                    </span>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                      <button className="btn btn-ghost btn-sm" disabled={safeClientPage === 0} onClick={() => setClientPage(safeClientPage - 1)}>Anterior</button>
                      <button className="btn btn-ghost btn-sm" disabled={safeClientPage >= clientTotalPages - 1} onClick={() => setClientPage(safeClientPage + 1)}>Siguiente</button>
                    </div>
                  </div>
                )
              })()}
              </div>
              <div style={{ flex: '0 0 360px' }}>
                {sortedClients.length > 0 && <PieChart data={clientPieData} title="Reparto de pedidos" size={260} />}
              </div>
            </div>
          </>
        )
      })()}

      {tab === 'trend' && (
        <div>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
            {TREND_PERIODS.map(p => (
              <button
                key={p.id}
                className={trendPeriod === p.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                onClick={() => setTrendPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {(() => {
            const periodDef = TREND_PERIODS.find(p => p.id === trendPeriod) || TREND_PERIODS[1]
            const data = trends[periodDef.id] || []
            const labelKey = periodDef.key
            const fmtLabel = periodDef.id === 'weekly' ? shortDate
              : periodDef.id === 'monthly' ? monthShortLabel
              : periodDef.id === 'quarterly' ? quarterLabel
              : (y) => y
            const fmtRowLabel = periodDef.id === 'weekly' ? (w) => `Semana del ${formatDate(w)}`
              : periodDef.id === 'monthly' ? monthLabel
              : fmtLabel

            if (data.length === 0) return <div className="empty-state card"><p>No hay tendencias para este período. Probá con un rango de fechas más amplio.</p></div>

            const PAGE_SIZE = 12
            const totalPages = Math.ceil(data.length / PAGE_SIZE)
            const safePage = Math.min(tablePage, totalPages - 1)
            const pageData = data.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

            return (
              <>
                <div className="tendencias-layout" style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', alignItems: 'stretch', flexWrap: 'wrap' }}>
                  <div className="card" style={{ flex: '1 1 55%', padding: 'var(--spacing-md)', overflowX: 'auto', minWidth: 0 }}>
                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <h4 style={{ marginBottom: 'var(--spacing-xs)' }}>Ingresos</h4>
                      <BarChart data={data} labelKey={labelKey} valueKey="revenue" barColor="var(--success)" formatLabel={fmtLabel} formatValue={fmtMoney} scrollable={false} />
                    </div>
                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <h4 style={{ marginBottom: 'var(--spacing-xs)' }}>Costos</h4>
                      <BarChart data={data} labelKey={labelKey} valueKey="cost" barColor="var(--danger)" formatLabel={fmtLabel} formatValue={fmtMoney} scrollable={false} />
                    </div>
                    <div>
                      <h4 style={{ marginBottom: 'var(--spacing-xs)' }}>Ganancias</h4>
                      <BarChart data={data} labelKey={labelKey} valueKey="profit" barColor="var(--primary)" formatLabel={fmtLabel} formatValue={fmtMoney} scrollable={false} />
                    </div>
                  </div>
                  <div style={{ flex: '1 1 35%', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div className="card" style={{ flex: 1, padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Pedidos por {periodDef.unit}</h4>
                      <div style={{ flex: 1 }}><BarChart data={data} labelKey={labelKey} valueKey="order_count" barColor="var(--accent)" formatLabel={fmtLabel} /></div>
                    </div>
                    {analytics.dayOfWeek && analytics.dayOfWeek.some(d => d.count > 0) && (
                      <div className="card" style={{ flex: 1, padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Pedidos por día de la semana</h4>
                        <div style={{ flex: 1 }}><BarChart
                          data={analytics.dayOfWeek}
                          labelKey="name"
                          valueKey="count"
                          barColor="var(--accent)"
                        /></div>
                      </div>
                    )}
                  </div>
                </div>

                <h3 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-md)' }}>Datos por período</h3>
                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-sm)' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card)' }}>
                        <th scope="col" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Período</th>
                        <th scope="col" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Ingresos</th>
                        <th scope="col" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Costos</th>
                        <th scope="col" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Ganancia</th>
                        <th scope="col" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Margen</th>
                        <th scope="col" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Pedidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map((row) => {
                        const label = row[labelKey]
                        const margin = row.revenue > 0 ? (row.profit / row.revenue * 100) : null
                        return (
                          <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 600 }}>
                              {fmtRowLabel(label)}
                            </td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right', color: 'var(--success)' }}>
                              {fmtMoney(row.revenue)}
                            </td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right', color: 'var(--danger)' }}>
                              {fmtMoney(row.cost)}
                            </td>
                            <td style={{
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: row.profit >= 0 ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {fmtMoney(row.profit)}
                            </td>
                            <td style={{
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              textAlign: 'right',
                              color: margin === null ? 'var(--text-secondary)' : margin >= 30 ? 'var(--success)' : margin >= 10 ? 'var(--accent)' : 'var(--danger)'
                            }}>
                              {pct(margin)}
                            </td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>
                              {row.order_count}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-sm)', padding: '0 var(--spacing-xs)' }}>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      Mostrando {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, data.length)} de {data.length}
                    </span>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                      <button className="btn btn-ghost btn-sm" disabled={safePage === 0} onClick={() => setTablePage(p => p - 1)}>Anterior</button>
                      <button className="btn btn-ghost btn-sm" disabled={safePage >= totalPages - 1} onClick={() => setTablePage(p => p + 1)}>Siguiente</button>
                    </div>
                  </div>
                )}

              </>
            )
          })()}
        </div>
      )}

      {tab === 'comparison' && (
        <div>
          {(filterPreset === 'custom' || filterPreset === 'all') ? (
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="card" style={{ padding: 'var(--spacing-sm)', display: 'flex', gap: '4px', alignItems: 'center', flex: '1 1 auto' }}>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600 }}>P1:</span>
                <input type="date" value={compCustomP1Start} onChange={e => setCompCustomP1Start(e.target.value)} style={{ width: 130, fontSize: 'var(--font-sm)' }} />
                <span style={{ fontSize: 'var(--font-xs)' }}>—</span>
                <input type="date" value={compCustomP1End} onChange={e => setCompCustomP1End(e.target.value)} style={{ width: 130, fontSize: 'var(--font-sm)' }} />
              </div>
              <div className="card" style={{ padding: 'var(--spacing-sm)', display: 'flex', gap: '4px', alignItems: 'center', flex: '1 1 auto' }}>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600 }}>P2:</span>
                <input type="date" value={compCustomP2Start} onChange={e => setCompCustomP2Start(e.target.value)} style={{ width: 130, fontSize: 'var(--font-sm)' }} />
                <span style={{ fontSize: 'var(--font-xs)' }}>—</span>
                <input type="date" value={compCustomP2End} onChange={e => setCompCustomP2End(e.target.value)} style={{ width: 130, fontSize: 'var(--font-sm)' }} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => runComparison('manual')}>Comparar</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {(() => {
                const opts = getPeriodOptions(filterPreset, fullTrends)
                return (
                  <>
                    <div className="card" style={{ padding: 'var(--spacing-sm)', flex: '1 1 auto', minWidth: '200px' }}>
                      <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Periodo A</span>
                      <select value={compP1Value} onChange={e => { setCompP1Value(e.target.value); runComparison(e.target.value, compP2Value) }} style={{ width: '100%', fontSize: 'var(--font-sm)' }}>
                        <option value="">— Seleccionar —</option>
                        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-sm)', flex: '1 1 auto', minWidth: '200px' }}>
                      <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Periodo B</span>
                      <select value={compP2Value} onChange={e => { setCompP2Value(e.target.value); runComparison(compP1Value, e.target.value) }} style={{ width: '100%', fontSize: 'var(--font-sm)' }}>
                        <option value="">— Seleccionar —</option>
                        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {comparison && (() => {
            const chartData = [
              { label: 'Ingresos', p1: comparison.period1.revenue, p2: comparison.period2.revenue },
              { label: 'Costos', p1: comparison.period1.cost, p2: comparison.period2.cost },
              { label: 'Ganancia', p1: comparison.period1.profit, p2: comparison.period2.profit },
            ]
            const marginData = [
              { label: 'Margen %', p1: comparison.period1.margin, p2: comparison.period2.margin },
            ]
            const avg = (p, key) => p.orders > 0 ? p[key] / p.orders : null
            const perOrder = [
              { label: 'Ticket promedio', hint: 'Ingresos por pedido', p1: avg(comparison.period1, 'revenue'), p2: avg(comparison.period2, 'revenue'), upIsGood: true },
              { label: 'Costo promedio por pedido', hint: 'Sube si los pedidos traen más platos o si aumentaron los ingredientes', p1: avg(comparison.period1, 'cost'), p2: avg(comparison.period2, 'cost'), upIsGood: false }
            ]
            const compOpts = getPeriodOptions(filterPreset, fullTrends)
            const p1Opt = compOpts.find(o => o.value === compP1Value)
            const p2Opt = compOpts.find(o => o.value === compP2Value)
            const isCustomComp = filterPreset === 'custom' || filterPreset === 'all'
            const p1Label = isCustomComp ? rangeLabel(compCustomP1Start, compCustomP1End) : (p1Opt?.label || 'Período A')
            const p2Label = isCustomComp ? rangeLabel(compCustomP2Start, compCustomP2End) : (p2Opt?.label || 'Período B')
            return (
              <>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                  <div className="card" style={{ flex: '1 1 250px', textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{p1Label}</p>
                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900 }}>{comparison.period1.orders}</p>
                    <p>pedidos</p>
                    <p>Ingresos: <strong style={{ color: 'var(--success)' }}>{fmtMoney(comparison.period1.revenue)}</strong></p>
                    <p>Costos: <strong style={{ color: 'var(--danger)' }}>{fmtMoney(comparison.period1.cost)}</strong></p>
                    <p>Ganancia: <strong style={{ color: comparison.period1.profit >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{fmtMoney(comparison.period1.profit)}</strong></p>
                  </div>
                  <div className="card" style={{ flex: '1 1 250px', textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{p2Label}</p>
                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900 }}>{comparison.period2.orders}</p>
                    <p>pedidos</p>
                    <p>Ingresos: <strong style={{ color: 'var(--success)' }}>{fmtMoney(comparison.period2.revenue)}</strong></p>
                    <p>Costos: <strong style={{ color: 'var(--danger)' }}>{fmtMoney(comparison.period2.cost)}</strong></p>
                    <p>Ganancia: <strong style={{ color: comparison.period2.profit >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{fmtMoney(comparison.period2.profit)}</strong></p>
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)' }}>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xl)', flexWrap: 'wrap', alignItems: 'stretch' }}>
                    <div style={{ flex: '1 1 300px' }}>
                      <h4 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', textAlign: 'center' }}>Ingresos / Costos / Ganancia</h4>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <GroupedBarChart
                          data={chartData}
                          labelKey="label"
                          series={[
                            { key: 'p1', label: p1Label, color: 'var(--primary)' },
                            { key: 'p2', label: p2Label, color: 'var(--accent)' }
                          ]}
                          formatValue={(v) => typeof v === 'number' ? fmtMoney(v) : v}
                          scrollable={false}
                        />
                      </div>
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <h4 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', textAlign: 'center' }}>Margen %</h4>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <GroupedBarChart
                          data={marginData}
                          labelKey="label"
                          series={[
                            { key: 'p1', label: p1Label, color: 'var(--primary)' },
                            { key: 'p2', label: p2Label, color: 'var(--accent)' }
                          ]}
                          formatValue={(v) => typeof v === 'number' ? pct(v) : v}
                          scrollable={false}
                        />
                      </div>
                    </div>
                    <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--spacing-md)' }}>
                      {perOrder.map(m => {
                        const ch = m.p1 !== null && m.p2 !== null ? changeOf(m.p1, m.p2) : null
                        return (
                          <div key={m.label} title={m.hint} style={{ textAlign: 'center' }}>
                            <h4 style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{m.label}</h4>
                            <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: ch === null || ch === 0 ? 'var(--text)' : (ch > 0) === m.upIsGood ? 'var(--success)' : 'var(--danger)' }}>
                              {pctChange(ch)}
                            </p>
                            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                              {fmtMoney(m.p1)} → {fmtMoney(m.p2)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-body)' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card)' }}>
                        <th scope="col" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Métrica</th>
                        <th scope="col" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>{p1Label}</th>
                        <th scope="col" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>{p2Label}</th>
                        <th scope="col" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Cambio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'orders', label: 'Pedidos', fmt: (v) => v },
                        { key: 'revenue', label: 'Ingresos', fmt: fmtMoney },
                        { key: 'cost', label: 'Costos', fmt: fmtMoney },
                        { key: 'profit', label: 'Ganancia', fmt: fmtMoney },
                        { key: 'margin', label: 'Margen %', fmt: (v) => pct(v), unit: 'pp' }
                      ].map(row => {
                        const p1 = comparison.period1?.[row.key]
                        const p2 = comparison.period2?.[row.key]
                        const change = comparison.changes?.[row.key]
                        const isPositive = row.key === 'cost' ? (change < 0) : (change > 0)
                        const isNew = (change === null || change === undefined) && !p1 && p2 > 0
                        return (
                          <tr key={row.key} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 600 }}>{row.label}</td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>{row.fmt(p1)}</td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right', fontWeight: 700 }}>{row.fmt(p2)}</td>
                            <td style={{
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: change === null || change === undefined || change === 0 ? 'var(--text-secondary)' : isPositive ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {isNew ? 'nuevo' : change !== undefined && change !== null ? (change > 0 ? '↑ ' : change < 0 ? '↓ ' : '') + pctChange(change, row.unit) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          })()}
        </div>
      )}
      </div>

    </div>
  )
}
