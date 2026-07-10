import React, { useState, useEffect, useCallback } from 'react'
import PdfViewer from '../components/PdfViewer'
import { generarHojaProduccion, generarListaCompras } from '../utils/pdf'

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

function fmtMoney(n) {
  return n !== undefined && n !== null ? `$${(n).toFixed(2)}` : '—'
}

function pct(n) {
  return n !== undefined && n !== null ? `${(n).toFixed(1)}%` : '—'
}

function pctChange(n) {
  if (n === undefined || n === null) return '—'
  const val = parseFloat(n)
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [trends, setTrends] = useState({ weekly: [], monthly: [], yearly: [] })
  const [fullTrends, setFullTrends] = useState({ weekly: [], monthly: [], yearly: [] })
  const [dashboard, setDashboard] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [comparison, setComparison] = useState(null)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [tab, setTab] = useState('top')
  const [trendPeriod, setTrendPeriod] = useState('weekly')
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

  const loadAll = useCallback((preset, start, end) => {
    const { startDate, endDate } = preset === 'custom'
      ? { startDate: start || null, endDate: end || null }
      : getPresetRange(preset)

    Promise.all([
      window.piu?.getAnalyticsFiltered(startDate, endDate),
      window.piu?.getTrendsInRange(startDate, endDate),
      window.piu?.getDashboard(),
      window.piu?.getIngredientsList()
    ]).then(([a, t, d, i]) => {
      setAnalytics(a)
      setTrends(t || { weekly: [], monthly: [], yearly: [] })
      setDashboard(d)
      setIngredients(i || [])
    })
  }, [])

  useEffect(() => { loadAll(filterPreset, customStart, customEnd) }, [loadAll, filterPreset, customStart, customEnd])

  useEffect(() => {
    window.piu?.getTrendsInRange(null, null).then(t => {
      if (t) setFullTrends(t)
    })
  }, [])

  const handleFilterChange = (preset) => {
    setFilterPreset(preset)
    if (preset !== 'custom') {
      setCustomStart('')
      setCustomEnd('')
    }
  }

  const handleCustomFilter = () => {
    if (customStart && customEnd) {
      loadAll('custom', customStart, customEnd)
    }
  }

  function getPeriodOptions(preset, ft) {
    if (!ft) return []
    switch (preset) {
      case 'week':
        return (ft.weekly || []).map(w => ({
          label: `Semana del ${formatDate(w.week_start)}`,
          value: w.week_start, startDate: w.week_start, endDate: w.week_start
        }))
      case 'month':
        return (ft.monthly || []).map(m => ({
          label: m.month, value: m.month,
          startDate: m.month + '-01', endDate: m.month + '-31'
        }))
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
          label: key, value: key,
          startDate: `${y}-${String(sm).padStart(2, '0')}-01`,
          endDate: `${y}-${String(em).padStart(2, '0')}-31`
        }
      }
    }
    return Object.values(quarters).sort((a, b) => a.value.localeCompare(b.value))
  }

  function getPreviousPeriodRange(preset) {
    const { startDate, endDate } = getPresetRange(preset)
    const s = new Date(startDate)
    const e = new Date(endDate)
    const dur = e.getTime() - s.getTime()
    const prevS = new Date(s.getTime() - dur - 86400000)
    const prevE = new Date(s.getTime() - 86400000)
    return {
      p1Start: prevS.toISOString().slice(0, 10),
      p1End: prevE.toISOString().slice(0, 10),
      p2Start: startDate,
      p2End: endDate
    }
  }

  const [compP1Value, setCompP1Value] = useState('')
  const [compP2Value, setCompP2Value] = useState('')

  const runComparison = (p1Val, p2Val) => {
    if (filterPreset === 'custom' || filterPreset === 'all') {
      const p1s = compCustomP1Start || null
      const p1e = compCustomP1End || null
      const p2s = compCustomP2Start || null
      const p2e = compCustomP2End || null
      if (p1s && p2s) {
        window.piu?.getPeriodComparison(p1s, p1e, p2s, p2e).then(setComparison)
      }
    } else {
      const opts = getPeriodOptions(filterPreset, fullTrends)
      const opt1 = opts.find(o => o.value === p1Val)
      const opt2 = opts.find(o => o.value === p2Val)
      if (opt1 && opt2) {
        setComparison(null)
        window.piu?.getPeriodComparison(opt1.startDate, opt1.endDate, opt2.startDate, opt2.endDate).then(setComparison)
      }
    }
  }

  useEffect(() => {
    if (tab === 'comparison' && filterPreset !== 'custom' && filterPreset !== 'all') {
      const opts = getPeriodOptions(filterPreset, fullTrends)
      if (opts.length >= 2) {
        setCompP1Value(opts[opts.length - 2].value)
        setCompP2Value(opts[opts.length - 1].value)
        runComparison(opts[opts.length - 2].value, opts[opts.length - 1].value)
      }
    }
  }, [tab, filterPreset, fullTrends])

  const handlePrintProduction = () => {
    if (!dashboard) return
    const doc = generarHojaProduccion(dashboard)
    setPdfPreview({ doc, title: `produccion-piu-${dashboard.week.week_start}` })
  }

  const handlePrintShopping = () => {
    if (ingredients.length === 0) {
      alert('No hay ingredientes configurados en los platos para generar la lista de compras.')
      return
    }
    const doc = generarListaCompras(ingredients)
    setPdfPreview({ doc, title: `compras-piu-${dashboard?.week?.week_start || 'semana'}` })
  }

  if (!analytics) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', fontSize: 'var(--font-lg)' }}>Cargando...</div>
  }

  const tabs = [
    { id: 'top', label: 'Top Platos' },
    { id: 'clients', label: 'Top Clientes' },
    { id: 'trend', label: 'Tendencias' },
    { id: 'comparison', label: 'Comparativa' },
    { id: 'profitability', label: 'Rentabilidad' }
  ]

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-md)'
      }}>
        <h2>Análisis</h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button className="btn btn-outline btn-sm" onClick={handlePrintShopping}>
            📋 Lista Compras
          </button>
          <button className="btn btn-outline btn-sm" onClick={handlePrintProduction}>
            🖨️ Hoja Producción
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 'var(--spacing-xs)',
        marginBottom: 'var(--spacing-md)',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--text-secondary)', marginRight: 'var(--spacing-sm)' }}>
          Período:
        </span>
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
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center', marginLeft: 'var(--spacing-sm)' }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
            <span style={{ fontSize: 'var(--font-sm)' }}>a</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
            <button className="btn btn-primary btn-sm" onClick={handleCustomFilter}>Filtrar</button>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-lg)',
        flexWrap: 'wrap'
      }}>
        <StatCard label="Pedidos" value={analytics.totalOrders} />
        <StatCard label="Ingresos" value={fmtMoney(analytics.revenue)} highlight="var(--success)" />
        <StatCard label="Costo total" value={fmtMoney(analytics.totalCost)} highlight="var(--danger)" />
        <StatCard
          label="Ganancia neta"
          value={fmtMoney(analytics.totalProfit)}
          highlight={(analytics.totalProfit || 0) >= 0 ? 'var(--primary)' : 'var(--danger)'}
        />
        {analytics.revenue > 0 && analytics.totalCost > 0 && (
          <StatCard
            label="Margen %"
            value={pct((analytics.revenue - analytics.totalCost) / analytics.revenue * 100)}
            highlight="var(--accent)"
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => setTab(t.id)}
            style={{ fontSize: 'var(--font-body)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'top' && (
        <div>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <input
              type="text"
              placeholder="Buscar plato..."
              value={searchDish}
              onChange={e => setSearchDish(e.target.value)}
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </div>
          {analytics.topDishes.length === 0 ? (
            <div className="empty-state card"><p>Sin datos en este período.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {analytics.topDishes
                .filter(d => !searchDish || (d.name || '').toLowerCase().includes(searchDish.toLowerCase()))
                .map((d, i) => {
                const max = analytics.topDishes[0]?.total || 1
                const barPct = Math.round((d.total / max) * 100)
                const hasIngredients = d.cost > 0
                const sumTimeSeries = (arr) => arr.reduce((a, i) => ({ ordered: a.ordered + (i.ordered || 0), produced: a.produced + (i.produced || 0) }), { ordered: 0, produced: 0 })
                const isExpanded = expandedDish === d.id
                const runDishComparison = async (dishId, p1s, p1e, p2s, p2e) => {
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
                }
                const loadTimeSeries = async () => {
                  if (isExpanded) { setExpandedDish(null); return }
                  setExpandedDish(d.id)
                  if (filterPreset === 'custom' || filterPreset === 'all') {
                    const startDate = customStart || null
                    const endDate = customEnd || null
                    const data = await window.piu?.getDishTimeSeries(d.id, startDate, endDate)
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
                }
                return (
                  <div key={d.name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                      <span style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--primary)', minWidth: '40px' }}>#{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                          <div>
                            <strong
                              style={{ fontSize: 'var(--font-lg)', cursor: 'pointer', userSelect: 'none' }}
                              onClick={loadTimeSeries}
                            >
                              {isExpanded ? '▾' : '▸'} {d.name}
                            </strong>
                            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginLeft: 'var(--spacing-sm)' }}>
                              {d.total} vendidos
                            </span>
                          </div>
                        </div>
                        <div style={{ height: 'calc(var(--touch-size) * 0.4)', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden', marginBottom: 'var(--spacing-xs)' }}>
                          <div style={{ width: `${barPct}%`, height: '100%', background: 'var(--primary)', borderRadius: '100px', transition: 'width 0.5s ease', minWidth: '20px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                          <span>Precio: <strong>${d.price.toFixed(2)}</strong></span>
                          {hasIngredients ? (
                            <>
                              <span>Costo: <strong>${d.cost.toFixed(2)}</strong></span>
                              <span>Ganancia/ud: <strong style={{ color: d.profit > 0 ? 'var(--success)' : 'var(--danger)' }}>${d.profit.toFixed(2)}</strong></span>
                              <span>Ganancia total: <strong style={{ color: d.totalProfit > 0 ? 'var(--success)' : 'var(--danger)' }}>${d.totalProfit.toFixed(2)}</strong></span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin ingredientes cargados</span>
                          )}
                        </div>
                      </div>
                    </div>
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
                              <div>
                                <label style={{ fontSize: 'var(--font-xs)', display: 'block' }}>Período A</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <input type="date" value={dishCompDates[d.id]?.p1Start || ''} onChange={e => setDishCompDates(prev => ({ ...prev, [d.id]: { ...prev[d.id], p1Start: e.target.value } }))} style={{ width: '140px', fontSize: 'var(--font-xs)' }} />
                                  <input type="date" value={dishCompDates[d.id]?.p1End || ''} onChange={e => setDishCompDates(prev => ({ ...prev, [d.id]: { ...prev[d.id], p1End: e.target.value } }))} style={{ width: '140px', fontSize: 'var(--font-xs)' }} />
                                </div>
                              </div>
                              <span style={{ fontWeight: 700, marginBottom: '2px' }}>vs</span>
                              <div>
                                <label style={{ fontSize: 'var(--font-xs)', display: 'block' }}>Período B</label>
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
                                <select value={dcd.p1 || ''} onChange={e => {
                                  const v = e.target.value
                                  setDishCompDates(prev => ({ ...prev, [d.id]: { ...prev[d.id], p1: v } }))
                                  const opt = opts.find(o => o.value === v)
                                  const opt2 = opts.find(o => o.value === dcd.p2)
                                  if (opt && opt2) runDishComparison(d.id, opt.startDate, opt.endDate, opt2.startDate, opt2.endDate)
                                }} style={{ minWidth: '160px', fontSize: 'var(--font-xs)' }}>
                                  <option value="">— A —</option>
                                  {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <span style={{ fontWeight: 700, marginBottom: '2px' }}>vs</span>
                                <select value={dcd.p2 || ''} onChange={e => {
                                  const v = e.target.value
                                  setDishCompDates(prev => ({ ...prev, [d.id]: { ...prev[d.id], p2: v } }))
                                  const opt = opts.find(o => o.value === v)
                                  const opt1 = opts.find(o => o.value === dcd.p1)
                                  if (opt && opt1) runDishComparison(d.id, opt1.startDate, opt1.endDate, opt.startDate, opt.endDate)
                                }} style={{ minWidth: '160px', fontSize: 'var(--font-xs)' }}>
                                  <option value="">— B —</option>
                                  {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </>
                            )
                          })()}
                        </div>

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
                            </div>
                            <div className="card" style={{ flex: 1, textAlign: 'center', padding: 'var(--spacing-md)' }}>
                              <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Período B</p>
                              <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900 }}>{dishComparison[d.id].curr.ordered}</p>
                              <p style={{ fontSize: 'var(--font-xs)' }}>veces pedido</p>
                              <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900 }}>{dishComparison[d.id].curr.produced}</p>
                              <p style={{ fontSize: 'var(--font-xs)' }}>producidos</p>
                            </div>
                            <div className="card" style={{ flex: 1, textAlign: 'center', padding: 'var(--spacing-md)' }}>
                              <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Cambio</p>
                              {(() => {
                                const { prev, curr } = dishComparison[d.id]
                                const pc = (o, n) => o > 0 ? ((n - o) / o * 100).toFixed(1) : '—'
                                return (
                                  <>
                                    <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--primary)' }}>
                                      {pc(prev.ordered, curr.ordered)}{pc(prev.ordered, curr.ordered) !== '—' ? '%' : ''}
                                    </p>
                                    <p style={{ fontSize: 'var(--font-xs)' }}>veces pedido</p>
                                    <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--success)' }}>
                                      {pc(prev.produced, curr.produced)}{pc(prev.produced, curr.produced) !== '—' ? '%' : ''}
                                    </p>
                                    <p style={{ fontSize: 'var(--font-xs)' }}>producción</p>
                                  </>
                                )
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
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'clients' && (
        <div>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchClient}
              onChange={e => setSearchClient(e.target.value)}
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </div>
          {analytics.topClients.length === 0 ? (
            <div className="empty-state card"><p>Sin datos en este período.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {analytics.topClients
                .filter(c => !searchClient || `${c.name} ${c.last_name}`.toLowerCase().includes(searchClient.toLowerCase()))
                .map((c, i) => {
                const max = analytics.topClients[0]?.order_count || 1
                const barPct = Math.round((c.order_count / max) * 100)
                const cKey = `${c.name}-${c.last_name}`
                const isExpanded = expandedClient === cKey
                const loadTimeSeries = async () => {
                  if (isExpanded) { setExpandedClient(null); return }
                  setExpandedClient(cKey)
                  const { startDate, endDate } = filterPreset === 'custom'
                    ? { startDate: customStart || null, endDate: customEnd || null }
                    : getPresetRange(filterPreset)
                  const data = await window.piu?.getClientTimeSeries(c.clientId, startDate, endDate)
                  setClientTimeSeries(data || [])
                }
                return (
                  <div key={cKey} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                      <span style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--primary)', minWidth: '40px' }}>#{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                          <strong
                            style={{ fontSize: 'var(--font-lg)', cursor: 'pointer', userSelect: 'none' }}
                            onClick={loadTimeSeries}
                          >
                            {isExpanded ? '▾' : '▸'} {c.name} {c.last_name}
                          </strong>
                          <span style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{c.order_count}</span>
                        </div>
                        <div style={{ height: 'calc(var(--touch-size) * 0.4)', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                          <div style={{ width: `${barPct}%`, height: '100%', background: 'var(--accent)', borderRadius: '100px', transition: 'width 0.5s ease', minWidth: '20px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                          <span>{c.order_count} pedidos</span>
                          {c.favorite_dish && <span>Plato favorito: <strong>{c.favorite_dish}</strong></span>}
                        </div>
                      </div>
                    </div>
                    {isExpanded && clientTimeSeries.length > 0 && (
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
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'trend' && (
        <div>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
            {[
              { id: 'weekly', label: 'Semanal' },
              { id: 'monthly', label: 'Mensual' },
              { id: 'yearly', label: 'Anual' }
            ].map(p => (
              <button
                key={p.id}
                className={trendPeriod === p.id ? 'btn btn-primary' : 'btn btn-ghost'}
                onClick={() => setTrendPeriod(p.id)}
                style={{ fontSize: 'var(--font-body)' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {(() => {
            const data = trendPeriod === 'weekly' ? trends.weekly
              : trendPeriod === 'monthly' ? trends.monthly
              : trends.yearly
            const labelKey = trendPeriod === 'weekly' ? 'week_start' : trendPeriod === 'monthly' ? 'month' : 'year'
            const fmtLabel = trendPeriod === 'weekly' ? formatDate
              : trendPeriod === 'monthly' ? (m) => `${m.slice(5)}/${m.slice(2, 4)}`
              : (y) => y

            if (data.length === 0) return <div className="empty-state card"><p>No hay datos en este período.</p></div>

            return (
              <>
                <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Ingresos</h3>
                <BarChart data={data} labelKey={labelKey} valueKey="revenue" barColor="var(--success)" formatLabel={fmtLabel} formatValue={fmtMoney} />
                <h3 style={{ margin: 'var(--spacing-md) 0 var(--spacing-sm)' }}>Costos</h3>
                <BarChart data={data} labelKey={labelKey} valueKey="cost" barColor="var(--danger)" formatLabel={fmtLabel} formatValue={fmtMoney} />
                <h3 style={{ margin: 'var(--spacing-md) 0 var(--spacing-sm)' }}>Ganancias</h3>
                <BarChart data={data} labelKey={labelKey} valueKey="profit" barColor="var(--primary)" formatLabel={fmtLabel} formatValue={fmtMoney} />

                <h3 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-md)' }}>Datos por período</h3>
                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-sm)' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card)' }}>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Período</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Ingresos</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Costos</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Ganancia</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Margen</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Pedidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => {
                        const label = row[labelKey]
                        const margin = row.revenue > 0 ? (row.profit / row.revenue * 100) : 0
                        return (
                          <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 600 }}>
                              {typeof fmtLabel === 'function' ? fmtLabel(label) : label}
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
                              color: margin >= 30 ? 'var(--success)' : margin >= 10 ? 'var(--accent)' : 'var(--danger)'
                            }}>
                              {margin.toFixed(1)}%
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
              </>
            )
          })()}
        </div>
      )}

      {tab === 'comparison' && (
        <div>
          {(filterPreset === 'custom' || filterPreset === 'all') ? (
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: 'var(--font-xs)', display: 'block' }}>Período 1</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="date" value={compCustomP1Start} onChange={e => setCompCustomP1Start(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
                  <input type="date" value={compCustomP1End} onChange={e => setCompCustomP1End(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
                </div>
              </div>
              <span style={{ fontWeight: 700, marginTop: 'var(--spacing-md)' }}>vs</span>
              <div>
                <label style={{ fontSize: 'var(--font-xs)', display: 'block' }}>Período 2</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="date" value={compCustomP2Start} onChange={e => setCompCustomP2Start(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
                  <input type="date" value={compCustomP2End} onChange={e => setCompCustomP2End(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => runComparison()} style={{ marginTop: 'var(--spacing-md)' }}>
                Comparar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
              {(() => {
                const opts = getPeriodOptions(filterPreset, fullTrends)
                return (
                  <>
                    <select value={compP1Value} onChange={e => { setCompP1Value(e.target.value); runComparison(e.target.value, compP2Value) }} style={{ minWidth: '180px' }}>
                      <option value="">— Seleccionar —</option>
                      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <span style={{ fontWeight: 700 }}>vs</span>
                    <select value={compP2Value} onChange={e => { setCompP2Value(e.target.value); runComparison(compP1Value, e.target.value) }} style={{ minWidth: '180px' }}>
                      <option value="">— Seleccionar —</option>
                      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </>
                )
              })()}
            </div>
          )}

          {comparison && (() => {
            const chartData = [
              { label: 'Pedidos', p1: comparison.period1.orders, p2: comparison.period2.orders },
              { label: 'Ingresos', p1: comparison.period1.revenue, p2: comparison.period2.revenue },
              { label: 'Costos', p1: comparison.period1.cost, p2: comparison.period2.cost },
              { label: 'Ganancia', p1: comparison.period1.profit, p2: comparison.period2.profit },
            ]
            const compOpts = getPeriodOptions(filterPreset, fullTrends)
            const p1Opt = compOpts.find(o => o.value === compP1Value)
            const p2Opt = compOpts.find(o => o.value === compP2Value)
            const p1Label = filterPreset === 'custom' || filterPreset === 'all' ? 'Período 1' : (p1Opt?.label || 'Período A')
            const p2Label = filterPreset === 'custom' || filterPreset === 'all' ? 'Período 2' : (p2Opt?.label || 'Período B')
            return (
              <>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                  <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{p1Label}</p>
                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900 }}>{comparison.period1.orders}</p>
                    <p>pedidos</p>
                    <p style={{ color: 'var(--success)' }}>{fmtMoney(comparison.period1.revenue)}</p>
                    <p style={{ color: 'var(--danger)' }}>{fmtMoney(comparison.period1.cost)}</p>
                    <p style={{ color: 'var(--primary)', fontWeight: 700 }}>{fmtMoney(comparison.period1.profit)}</p>
                  </div>
                  <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{p2Label}</p>
                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900 }}>{comparison.period2.orders}</p>
                    <p>pedidos</p>
                    <p style={{ color: 'var(--success)' }}>{fmtMoney(comparison.period2.revenue)}</p>
                    <p style={{ color: 'var(--danger)' }}>{fmtMoney(comparison.period2.cost)}</p>
                    <p style={{ color: 'var(--primary)', fontWeight: 700 }}>{fmtMoney(comparison.period2.profit)}</p>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <GroupedBarChart
                    data={chartData}
                    labelKey="label"
                    series={[
                      { key: 'p1', label: p1Label, color: 'var(--primary)' },
                      { key: 'p2', label: p2Label, color: 'var(--accent)' }
                    ]}
                    formatValue={(v) => {
                      if (typeof v === 'number') {
                        return Number.isInteger(v) ? v : `$${(v).toFixed(0)}`
                      }
                      return v
                    }}
                  />
                </div>

                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-body)' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card)' }}>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Métrica</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>{p1Label}</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>{p2Label}</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Cambio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'orders', label: 'Pedidos', fmt: (v) => v },
                        { key: 'revenue', label: 'Ingresos', fmt: fmtMoney },
                        { key: 'cost', label: 'Costos', fmt: fmtMoney },
                        { key: 'profit', label: 'Ganancia', fmt: fmtMoney },
                        { key: 'margin', label: 'Margen %', fmt: (v) => `${(v || 0).toFixed(1)}%` }
                      ].map(row => {
                        const p1 = comparison.period1?.[row.key]
                        const p2 = comparison.period2?.[row.key]
                        const change = comparison.changes?.[row.key]
                        const isPositive = row.key === 'cost' ? (change < 0) : (change > 0)
                        return (
                          <tr key={row.key} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 600 }}>{row.label}</td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>{row.fmt(p1)}</td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right', fontWeight: 700 }}>{row.fmt(p2)}</td>
                            <td style={{
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: change === 0 ? 'var(--text-secondary)' : isPositive ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {change !== undefined && change !== null ? (change > 0 ? '↑ ' : change < 0 ? '↓ ' : '') + pctChange(change) : '—'}
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

      {tab === 'profitability' && (
        <div>
          {analytics.dishProfitability.length === 0 ? (
            <div className="empty-state card"><p>No hay platos activos para mostrar.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {analytics.dishProfitability.map((d, i) => {
                const maxMargin = analytics.dishProfitability[0]?.margin || 1
                const barPct = Math.round((d.margin / maxMargin) * 100)
                return (
                  <div key={d.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--accent)', minWidth: '40px' }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                        <strong style={{ fontSize: 'var(--font-lg)' }}>{d.name}</strong>
                        <span style={{
                          fontSize: 'var(--font-lg)', fontWeight: 900,
                          color: d.margin > 30 ? 'var(--success)' : d.margin > 10 ? 'var(--accent)' : 'var(--danger)'
                        }}>
                          {d.margin.toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ height: 'calc(var(--touch-size) * 0.4)', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden', marginBottom: 'var(--spacing-xs)' }}>
                        <div style={{
                          width: `${Math.max(barPct, 2)}%`, height: '100%',
                          background: d.margin > 30 ? 'var(--success)' : d.margin > 10 ? 'var(--accent)' : 'var(--danger)',
                          borderRadius: '100px', transition: 'width 0.5s ease', minWidth: '20px'
                        }} />
                      </div>
                      {d.hasIngredients ? (
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                          <span>Precio: <strong>${d.price.toFixed(2)}</strong></span>
                          <span>Costo: <strong>${d.cost.toFixed(2)}</strong></span>
                          <span>Ganancia/ud: <strong>${d.profit.toFixed(2)}</strong></span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin ingredientes cargados</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {pdfPreview && (
        <PdfViewer pdfDoc={pdfPreview.doc} title={pdfPreview.title} onClose={() => setPdfPreview(null)} />
      )}
    </div>
  )
}

function StatCard({ label, value, highlight }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: '160px', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>{label}</p>
      <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900, color: highlight || 'var(--text)' }}>{value}</p>
    </div>
  )
}

function BarChart({ data, labelKey, valueKey, barColor, formatLabel, currentKey, formatValue }) {
  const max = Math.max(...data.map(x => x[valueKey] || 0), 1)
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 'calc(var(--spacing-sm) * 0.5)',
        height: 'calc(var(--font-body) * 5 + 30px)', padding: 'var(--spacing-sm) var(--spacing-xs)',
        minWidth: `${Math.max(data.length * 55, 200)}px`
      }}>
        {data.map((item) => {
          const val = item[valueKey] || 0
          const p = val / max
          const key = item[labelKey]
          const isCurrent = currentKey === key
          return (
            <div key={key} style={{ flex: '0 0 45px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{
                  width: '80%', margin: '0 auto', height: `${Math.max(p * 100, 2)}%`, minHeight: '4px',
                  background: isCurrent ? 'var(--accent)' : barColor,
                  borderRadius: '2px 2px 0 0', transition: 'height 0.5s ease'
                }} />
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2px' }}>
                {formatLabel ? formatLabel(key) : key}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GroupedBarChart({ data, labelKey, series, formatLabel, currentKey, formatValue }) {
  const maxVal = Math.max(...data.flatMap(item => series.map(s => item[s.key] || 0)), 1)
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
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
                  const val = item[s.key] || 0
                  const pct = val / maxVal * 100
                  return (
                    <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1, marginBottom: '2px', whiteSpace: 'nowrap' }}>
                        {formatValue ? formatValue(val) : val}
                      </span>
                      <div style={{
                        width: '100%', height: `${Math.max(pct, 2)}%`, minHeight: '4px',
                        background: s.color, borderRadius: '3px 3px 0 0', transition: 'height 0.5s ease',
                        opacity: isCurrent ? 1 : 0.8
                      }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
                {series.map(s => (
                  <span key={s.key} style={{ fontSize: '9px', color: s.color, fontWeight: 700 }}>{s.label[0]}</span>
                ))}
              </div>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: isCurrent ? 700 : 400, textAlign: 'center', marginTop: '2px' }}>
                {formatLabel ? formatLabel(key) : key}{isCurrent ? ' *' : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
